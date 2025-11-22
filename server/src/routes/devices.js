import express from 'express';
import crypto from 'crypto';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Generate a secure API key
function generateApiKey() {
  return 'hal_' + crypto.randomBytes(32).toString('hex');
}

// Hash API key for storage
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Get all devices for current user
router.get('/', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true,
        name: true,
        description: true,
        lastUsedAt: true,
        requestCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(devices);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Create a new device and generate API key
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Device name is required' });
    }

    // Generate unique API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    const device = await prisma.device.create({
      data: {
        userId: req.user.userId,
        name: name.trim(),
        description: description?.trim() || null,
        apiKeyHash,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });

    // Return the plain API key ONLY on creation (won't be shown again)
    res.json({
      ...device,
      apiKey, // Show API key only once
      message: 'Device created successfully. Save this API key securely - it will not be shown again!',
    });
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ error: 'Failed to create device' });
  }
});

// Delete a device
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify device belongs to user
    const device = await prisma.device.findFirst({
      where: {
        id,
        userId: req.user.userId,
      },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await prisma.device.delete({
      where: { id },
    });

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// Update device info (name/description only)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Verify device belongs to user
    const device = await prisma.device.findFirst({
      where: {
        id,
        userId: req.user.userId,
      },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const updated = await prisma.device.update({
      where: { id },
      data: {
        name: name?.trim() || device.name,
        description: description?.trim() || device.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        lastUsedAt: true,
        requestCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

export default router;
