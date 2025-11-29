import express from 'express';
import prisma from '../config/database.js';
import ollamaService from '../services/ollama.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all conversations for current user + shared with their groups (excluding soft-deleted)
router.get('/conversations', async (req, res) => {
  try {
    // Get user's group memberships
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        groupMemberships: {
          select: { groupId: true },
        },
      },
    });

    const userGroupIds = user?.groupMemberships.map(gm => gm.groupId) || [];

    // Get own conversations + conversations shared with user's groups
    const conversations = await prisma.conversation.findMany({
      where: {
        deletedAt: null,
        OR: [
          { userId: req.user.id }, // Own conversations
          {
            sharedWith: {
              some: {
                groupId: { in: userGroupIds },
              },
            },
          }, // Shared with user's groups
        ],
      },
      orderBy: [
        { starred: 'desc' },
        { updatedAt: 'desc' },
      ],
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
        sharedWith: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    // Mark which are shared vs owned
    const result = conversations.map(conv => ({
      ...conv,
      isOwned: conv.userId === req.user.id,
      isShared: conv.userId !== req.user.id,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Helper to check if user has access to conversation
async function hasConversationAccess(userId, conversationId) {
  // Get user with their group memberships and permissions
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customRole: true,
      groupMemberships: {
        select: { groupId: true, canViewAll: true, isGroupAdmin: true },
      },
    },
  });

  // System admins can see everything
  if (user?.isSystemAdmin) return { hasAccess: true, isOwner: false };

  // Users with canViewAllConvos permission can see everything
  if (user?.customRole?.canViewAllConvos) return { hasAccess: true, isOwner: false };

  // Get the conversation with sharing info
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      sharedWith: {
        select: { groupId: true },
      },
    },
  });

  if (!conversation) return { hasAccess: false, isOwner: false };

  // Owner always has access
  if (conversation.userId === userId) return { hasAccess: true, isOwner: true };

  // Check if conversation is shared with any of user's groups
  const userGroupIds = user?.groupMemberships.map(gm => gm.groupId) || [];
  const sharedGroupIds = conversation.sharedWith.map(s => s.groupId);
  const hasGroupAccess = sharedGroupIds.some(gid => userGroupIds.includes(gid));

  // Check if user is group admin with view all permissions for any shared group
  const groupAdminAccess = user?.groupMemberships.some(gm =>
    sharedGroupIds.includes(gm.groupId) && (gm.canViewAll || gm.isGroupAdmin)
  );

  return { hasAccess: hasGroupAccess || groupAdminAccess, isOwner: false };
}

// Get single conversation with all messages
router.get('/conversations/:id', async (req, res) => {
  try {
    const { hasAccess, isOwner } = await hasConversationAccess(req.user.id, req.params.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

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
            avatar: true,
          },
        },
        sharedWith: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      ...conversation,
      isOwned: isOwner,
      isShared: !isOwner,
    });
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

// ============================================
// CONVERSATION SHARING ROUTES
// ============================================

// Get user's groups (for sharing UI)
router.get('/my-groups', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        groupMemberships: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                color: true,
                description: true,
              },
            },
          },
        },
      },
    });

    const groups = user?.groupMemberships.map(gm => ({
      ...gm.group,
      isGroupAdmin: gm.isGroupAdmin,
    })) || [];

    res.json(groups);
  } catch (error) {
    console.error('Get my groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Share conversation with a group
router.post('/conversations/:id/share', async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { groupId } = req.body;
    const userId = req.user.id;

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    // Check ownership - only owner can share
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({ error: 'Only the owner can share a conversation' });
    }

    // Check user is member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'You can only share with groups you belong to' });
    }

    // Check if already shared
    const existing = await prisma.conversationShare.findUnique({
      where: {
        conversationId_groupId: { conversationId, groupId },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already shared with this group' });
    }

    // Create the share
    const share = await prisma.conversationShare.create({
      data: {
        conversationId,
        groupId,
        sharedBy: userId,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    res.status(201).json(share);
  } catch (error) {
    console.error('Share conversation error:', error);
    res.status(500).json({ error: 'Failed to share conversation' });
  }
});

// Unshare conversation from a group
router.delete('/conversations/:id/share/:groupId', async (req, res) => {
  try {
    const { id: conversationId, groupId } = req.params;
    const userId = req.user.id;

    // Check ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({ error: 'Only the owner can unshare a conversation' });
    }

    await prisma.conversationShare.delete({
      where: {
        conversationId_groupId: { conversationId, groupId },
      },
    });

    res.json({ success: true, message: 'Conversation unshared' });
  } catch (error) {
    console.error('Unshare conversation error:', error);
    res.status(500).json({ error: 'Failed to unshare conversation' });
  }
});

// Get shared conversations for a specific group (for group admins)
router.get('/groups/:groupId/conversations', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check user has access to this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        deletedAt: null,
        sharedWith: {
          some: { groupId },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            avatar: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        sharedWith: {
          where: { groupId },
          include: {
            sharedByUser: {
              select: {
                firstName: true,
              },
            },
          },
        },
      },
    });

    res.json(conversations);
  } catch (error) {
    console.error('Get group conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch group conversations' });
  }
});

export default router;
