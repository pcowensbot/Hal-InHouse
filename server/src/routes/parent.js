import express from 'express';
import prisma from '../config/database.js';
import { authenticateToken, requireParent } from '../middleware/auth.js';

const router = express.Router();

// All routes require parent authentication
router.use(authenticateToken);
router.use(requireParent);

// Get all users in household
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        createdAt: true,
        _count: {
          select: { conversations: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all conversations across household (excluding soft-deleted)
router.get('/conversations', async (req, res) => {
  try {
    const { userId } = req.query;

    const where = userId ? { userId, deletedAt: null } : { deletedAt: null };

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: [
        { starred: 'desc' },   // Starred conversations first
        { updatedAt: 'desc' }, // Then by most recent
      ],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            role: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    res.json(conversations);
  } catch (error) {
    console.error('Get all conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get activity stats
router.get('/stats', async (req, res) => {
  try {
    const [userCount, conversationCount, messageCount] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
    ]);

    // Get messages by user
    const messagesByUser = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        conversations: {
          select: {
            _count: {
              select: { messages: true },
            },
          },
        },
      },
    });

    const userStats = messagesByUser.map(user => ({
      id: user.id,
      firstName: user.firstName,
      messageCount: user.conversations.reduce((sum, conv) => sum + conv._count.messages, 0),
    }));

    // Get recent activity
    const recentMessages = await prisma.message.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    res.json({
      userCount,
      conversationCount,
      messageCount,
      userStats,
      recentMessages,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Search messages (for keyword monitoring)
router.get('/search', async (req, res) => {
  try {
    const { q, userId } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const where = {
      content: {
        contains: q,
        mode: 'insensitive',
      },
    };

    if (userId) {
      where.conversation = { userId };
    }

    const messages = await prisma.message.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    res.json(messages);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get pending deletions (soft-deleted conversations)
router.get('/pending-deletions', async (req, res) => {
  try {
    const deletedConversations = await prisma.conversation.findMany({
      where: {
        deletedAt: { not: null },
        permanentDelete: false,
      },
      orderBy: { deletedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            role: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    res.json(deletedConversations);
  } catch (error) {
    console.error('Get pending deletions error:', error);
    res.status(500).json({ error: 'Failed to fetch pending deletions' });
  }
});

// Restore a deleted conversation
router.post('/conversations/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.deletedAt) {
      return res.status(400).json({ error: 'Conversation is not deleted' });
    }

    // Restore the conversation
    await prisma.conversation.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    });

    res.json({ success: true, message: 'Conversation restored' });
  } catch (error) {
    console.error('Restore conversation error:', error);
    res.status(500).json({ error: 'Failed to restore conversation' });
  }
});

// Permanently delete a conversation
router.delete('/conversations/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Permanently delete (cascade will delete messages)
    await prisma.conversation.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Conversation permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: 'Failed to permanently delete conversation' });
  }
});

export default router;
