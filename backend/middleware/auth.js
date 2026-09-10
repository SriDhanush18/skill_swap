/**
 * SkillSwap Platform - Authentication & RBAC Middleware
 * Powered by JSON Web Tokens & Supabase Auth Bridge
 */

const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'skillswap-vignan-jwt-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Valid Account Types (Student & Admin)
const ROLES = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN'
};

/**
 * Generate a signed JWT for a user
 */
function generateToken(user) {
  const isAdm = user.is_admin === 1 || user.role === 'ADMIN' || user.role === 'FACULTY_ADMIN' || user.role === 'SUPER_ADMIN';
  const role = isAdm ? ROLES.ADMIN : ROLES.STUDENT;
  const payload = {
    id: user.id,
    email: user.email,
    role,
    name: user.name,
    college: user.college
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT signature
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Extract token from Authorization header or cookie/query
 */
function extractToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  } else if (authHeader) {
    return authHeader.trim();
  } else if (req.query?.token) {
    return req.query.token;
  }
  return null;
}

/**
 * Primary Authentication Middleware
 * Enforces valid JWT token and injects full `req.user`
 */
async function authenticateToken(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token in the Authorization header.'
    });
  }

  try {
    const decoded = verifyToken(token);
    
    // Look up live user record from database
    const user = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [decoded.id]);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User session invalid. Account not found.'
      });
    }

    user.badges = typeof user.badges_json === 'string' ? JSON.parse(user.badges_json || '[]') : (user.badges_json || []);
    delete user.password_hash; // Never expose password hash downstream

    // Attach user context
    req.user = user;
    req.currentUserId = user.id;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token: ' + (err.message || 'Please log in again.')
    });
  }
}

/**
 * Optional Authentication Middleware
 * Attaches req.user if a valid token is provided, without blocking unauthenticated requests
 */
async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [decoded.id]);
      if (user) {
        user.badges = typeof user.badges_json === 'string' ? JSON.parse(user.badges_json || '[]') : (user.badges_json || []);
        delete user.password_hash;
        req.user = user;
        req.currentUserId = user.id;
      }
    } catch (e) {
      // Ignored for optional auth
    }
  }

  // Fallback demo user context if none attached
  if (!req.currentUserId) {
    req.currentUserId = req.headers['x-user-id'] || 'sri';
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles Allowed roles (e.g. 'ADMIN')
 */
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User not authenticated.'
      });
    }

    const rawRole = req.user.role || (req.user.is_admin ? 'ADMIN' : 'STUDENT');
    const isAdm = req.user.is_admin === 1 || rawRole === 'ADMIN' || rawRole === 'FACULTY_ADMIN' || rawRole === 'SUPER_ADMIN';
    const userRole = isAdm ? ROLES.ADMIN : ROLES.STUDENT;

    if (userRole === ROLES.ADMIN || allowedRoles.includes(userRole) || allowedRoles.includes(rawRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden: Access restricted to Administrator accounts.`
    });
  };
}

module.exports = {
  ROLES,
  JWT_SECRET,
  generateToken,
  verifyToken,
  authenticateToken,
  optionalAuth,
  authorizeRole,
  attachUserContext: optionalAuth // Backward compatibility
};
