import express from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user's books
router.get('/books', async (req, res) => {
  try {
    const userId = req.user.userId;

    const books = await prisma.book.findMany({
      where: { userId },
      include: {
        _count: {
          select: { notes: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(books);
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Create a book
router.post('/books', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Book name is required' });
    }

    const book = await prisma.book.create({
      data: {
        userId,
        name,
        description,
      },
    });

    res.status(201).json(book);
  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

// Update a book
router.put('/books/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, description } = req.body;

    // Verify ownership
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book || book.userId !== userId) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const updatedBook = await prisma.book.update({
      where: { id },
      data: { name, description },
    });

    res.json(updatedBook);
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// Delete a book
router.delete('/books/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify ownership
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book || book.userId !== userId) {
      return res.status(404).json({ error: 'Book not found' });
    }

    await prisma.book.delete({ where: { id } });

    res.json({ success: true, message: 'Book deleted' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Get user's starred notes
router.get('/notes', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bookId } = req.query;

    const where = { userId };
    if (bookId) {
      where.bookId = bookId;
    }

    const notes = await prisma.starredNote.findMany({
      where,
      include: {
        message: {
          include: {
            conversation: {
              select: {
                title: true,
              },
            },
          },
        },
        book: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Star a message (create note)
router.post('/notes', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { messageId, title, note, bookId } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    // Verify message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user owns the conversation
    if (message.conversation.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already starred
    const existing = await prisma.starredNote.findFirst({
      where: { userId, messageId },
    });

    if (existing) {
      return res.status(409).json({ error: 'Message already starred' });
    }

    const starredNote = await prisma.starredNote.create({
      data: {
        userId,
        messageId,
        title,
        note,
        bookId,
      },
      include: {
        message: true,
        book: true,
      },
    });

    res.status(201).json(starredNote);
  } catch (error) {
    console.error('Star message error:', error);
    res.status(500).json({ error: 'Failed to star message' });
  }
});

// Update a starred note
router.put('/notes/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, note, bookId } = req.body;

    // Verify ownership
    const starredNote = await prisma.starredNote.findUnique({ where: { id } });
    if (!starredNote || starredNote.userId !== userId) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updated = await prisma.starredNote.update({
      where: { id },
      data: { title, note, bookId },
      include: {
        message: true,
        book: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a starred note (unstar)
router.delete('/notes/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify ownership
    const starredNote = await prisma.starredNote.findUnique({ where: { id } });
    if (!starredNote || starredNote.userId !== userId) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await prisma.starredNote.delete({ where: { id } });

    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Check if a message is starred
router.get('/notes/check/:messageId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { messageId } = req.params;

    const starredNote = await prisma.starredNote.findFirst({
      where: { userId, messageId },
    });

    res.json({ starred: !!starredNote, note: starredNote });
  } catch (error) {
    console.error('Check starred error:', error);
    res.status(500).json({ error: 'Failed to check if starred' });
  }
});

export default router;
