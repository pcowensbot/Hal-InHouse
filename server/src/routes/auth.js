import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been disabled. Please contact an administrator.' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Signup (requires invite code)
router.post('/signup', async (req, res) => {
  try {
    const { inviteCode, email, password, firstName, role } = req.body;

    if (!inviteCode || !email || !password || !firstName) {
      return res.status(400).json({ error: 'All fields including invite code are required' });
    }

    // Verify invite code
    const invite = await prisma.inviteCode.findUnique({
      where: { code: inviteCode },
    });

    if (!invite) {
      return res.status(401).json({ error: 'Invalid invite code' });
    }

    if (!invite.isActive) {
      return res.status(401).json({ error: 'This invite code has been deactivated' });
    }

    if (invite.usedAt) {
      return res.status(401).json({ error: 'This invite code has already been used' });
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return res.status(401).json({ error: 'This invite code has expired' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if this is the first user (should be SUPER_ADMIN)
    const userCount = await prisma.user.count();
    const userRole = userCount === 0 ? 'SUPER_ADMIN' : (role || 'CHILD');

    // Create user and mark invite as used
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        role: userRole,
      },
    });

    // Mark invite code as used
    await prisma.inviteCode.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
        usedBy: user.id,
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Update Avatar
router.post('/avatar', authenticateToken, async (req, res) => {
  try {
    const { avatar } = req.body;
    const userId = req.user.userId;

    if (!avatar) {
      return res.status(400).json({ error: 'Avatar data required' });
    }

    // Validate avatar is base64 image data
    if (!avatar.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid avatar format' });
    }

    // Update user avatar
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar },
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        avatar: true,
      },
    });

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      user,
    });
  } catch (error) {
    console.error('Avatar update error:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Remove Avatar
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Remove user avatar
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        avatar: true,
      },
    });

    res.json({
      success: true,
      message: 'Avatar removed successfully',
      user,
    });
  } catch (error) {
    console.error('Avatar remove error:', error);
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
});

// Update Profile Name
router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName } = req.body;
    const userId = req.user.userId;

    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    // Update user name
    const user = await prisma.user.update({
      where: { id: userId },
      data: { firstName: firstName.trim() },
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        avatar: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change Password (NEW ENDPOINT)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    console.log(`Password changed successfully for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
