import jwt from 'jsonwebtoken';

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

export default authenticateToken;
