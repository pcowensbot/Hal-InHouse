import express from 'express';
import prisma from '../config/database.js';
import ollamaService from '../services/ollama.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all conversations for current user (excluding soft-deleted)
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: req.user.id,
        deletedAt: null, // Exclude soft-deleted conversations
      },
      orderBy: [
        { starred: 'desc' },   // Starred conversations first
        { updatedAt: 'desc' }, // Then by most recent
      ],
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get single conversation with all messages
router.get('/conversations/:id', async (req, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            role: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check access (user must own conversation or be a parent)
    if (conversation.userId !== req.user.id && req.user.role !== 'PARENT') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Create new conversation
router.post('/conversations', async (req, res) => {
  try {
    const { title } = req.body;

    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user.id,
        title: title || 'New Chat',
      },
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Update conversation title
router.patch('/conversations/:id', async (req, res) => {
  try {
    const { title } = req.body;
    const { id } = req.params;

    // Check ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Toggle starred status
router.patch('/conversations/:id/star', async (req, res) => {
  try {
    const { starred } = req.body;
    const { id } = req.params;

    // Check ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { starred: starred === true },
    });

    res.json({ success: true, starred: updated.starred });
  } catch (error) {
    console.error('Toggle star error:', error);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

// Delete conversation (soft delete)
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Soft delete: mark as deleted
    await prisma.conversation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: req.user.id,
      },
    });

    res.json({ success: true, message: 'Conversation marked for deletion' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Send message and get AI response
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content required' });
    }

    // Check conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            content: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if system is in maintenance mode
    const settings = await prisma.settings.findFirst();
    if (settings && settings.maintenanceEnabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = settings.maintenanceStartHour;
      const endHour = settings.maintenanceEndHour;

      // Check if current time is in maintenance window
      let inMaintenanceWindow = false;
      if (startHour < endHour) {
        // Same day window (e.g., 2 AM to 6 AM)
        inMaintenanceWindow = currentHour >= startHour && currentHour < endHour;
      } else {
        // Overnight window (e.g., 10 PM to 4 AM)
        inMaintenanceWindow = currentHour >= startHour || currentHour < endHour;
      }

      // If both GPUs are in maintenance, block all chat
      if (inMaintenanceWindow && settings.maintenanceGPUs === 'both') {
        const eta = new Date(now);
        if (currentHour >= endHour) {
          eta.setDate(eta.getDate() + 1);
        }
        eta.setHours(endHour, 0, 0, 0);

        return res.status(503).json({
          error: 'System in maintenance',
          inMaintenance: true,
          message: settings.maintenanceMessage || 'System is down for AI training maintenance.',
          nextAvailable: eta.toISOString(),
        });
      }
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: id,
        role: 'user',
        content: content.trim(),
        modelUsed: 'user',
      },
    });

    // Prepare message history for AI
    const messageHistory = [
      ...conversation.messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: content.trim() },
    ];

    // Get AI response
    const aiResponse = await ollamaService.generateResponse(messageHistory);

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: id,
        role: 'assistant',
        content: aiResponse.content,
        modelUsed: aiResponse.model,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Auto-generate title if this is the first message
    if (conversation.messages.length === 0 && conversation.title === 'New Chat') {
      const autoTitle = content.trim().substring(0, 50) + (content.length > 50 ? '...' : '');
      await prisma.conversation.update({
        where: { id },
        data: { title: autoTitle },
      });
    }

    res.json({
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
