import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_key';

/**
 * Middleware to authenticate JWT tokens
 * Extracts token from Authorization header and verifies it
 * Adds userId and role to req.user
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Add user info to request
    req.user = {
      id: decoded.userId,  // Map userId to id for consistency with routes
      userId: decoded.userId,  // Keep for backwards compatibility
      role: decoded.role,
    };

    next();
  });
};

/**
 * Middleware to check if user is a PARENT
 * Must be used after authenticateToken
 */
export const requireParent = (req, res, next) => {
  if (req.user.role !== 'PARENT') {
    return res.status(403).json({ error: 'Parent access required' });
  }
  next();
};

/**
 * Middleware to authenticate device API keys
 * Extracts API key from Authorization header (Bearer hal_xxx...)
 * Adds device info to req.device
 */
export const authenticateDevice = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const apiKey = authHeader && authHeader.split(' ')[1]; // Bearer hal_xxx...

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    if (!apiKey.startsWith('hal_')) {
      return res.status(401).json({ error: 'Invalid API key format' });
    }

    // Hash the provided API key
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Find device with this API key hash
    const device = await prisma.device.findUnique({
      where: { apiKeyHash },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            role: true,
          },
        },
      },
    });

    if (!device) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    // Update last used time and increment request count
    await prisma.device.update({
      where: { id: device.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 },
      },
    });

    // Add device info to request
    req.device = {
      id: device.id,
      name: device.name,
      userId: device.userId,
      user: device.user,
    };

    next();
  } catch (error) {
    console.error('Device authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export default authenticateToken;
