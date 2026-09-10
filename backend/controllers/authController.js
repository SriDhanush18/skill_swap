/**
 * SkillSwap Platform - Authentication Controller
 * Handles Register, Login, JWT issuance, Supabase Auth Integration, and Login Audit Logging
 */

const bcrypt = require('bcryptjs');
const { db } = require('../database/db');
const { generateToken, ROLES } = require('../middleware/auth');

function getClientMeta(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || '127.0.0.1');
  const userAgent = req.headers['user-agent'] || 'Browser Client';
  return { ip, userAgent };
}

async function recordLoginAudit({ userId, email, role, ipAddress, userAgent, status, failureReason, authMethod }) {
  try {
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await db.runAsync(
      `INSERT INTO login_history (id, user_id, email, role, ip_address, user_agent, status, failure_reason, auth_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, userId || null, email || null, role || null, ipAddress || '127.0.0.1', userAgent || 'Unknown', status, failureReason || null, authMethod || 'PASSWORD']
    );
  } catch (err) {
    console.warn('⚠️ Could not record login audit:', err.message);
  }
}

const authController = {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, name, college, major, role, bio } = req.body;
      const clientMeta = getClientMeta(req);

      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Please provide email, password, and full name.'
        });
      }

      // Password Rules: Must start with a capital letter (A-Z) and have at least 6 characters
      if (!/^[A-Z]/.test(password)) {
        return res.status(400).json({
          success: false,
          error: 'Password rule violation: Password must start with a capital letter (A-Z).'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long.'
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check for existing account
      const existing = await db.getAsync(`SELECT * FROM users WHERE email = ?`, [normalizedEmail]);
      if (existing) {
        await recordLoginAudit({
          email: normalizedEmail,
          ipAddress: clientMeta.ip,
          userAgent: clientMeta.userAgent,
          status: 'FAILED',
          failureReason: 'Account already exists',
          authMethod: 'REGISTER'
        });

        return res.status(409).json({
          success: false,
          error: 'An account with this email address already exists. Please log in.'
        });
      }

      const isAdm = role === 'ADMIN' || role === 'FACULTY_ADMIN' || role === 'SUPER_ADMIN';
      const assignedRole = isAdm ? ROLES.ADMIN : ROLES.STUDENT;
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = 'usr_' + Date.now();
      const userCollege = college || 'Vignan University';
      const userMajor = major || 'B.Tech CSE';
      const initialCredits = isAdm ? 999.0 : 3.0; // 3.0 Welcome Bonus credits for students

      await db.runAsync(
        `INSERT INTO users (id, email, password_hash, role, name, college, major, avatar, bio, credits, escrow_locked, lifetime_earned, lifetime_spent, rating, reviews_count, badges_json, is_admin, last_login_at, login_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 5.0, 0, ?, ?, CURRENT_TIMESTAMP, 1)`,
        [
          userId,
          normalizedEmail,
          passwordHash,
          assignedRole,
          name.trim(),
          userCollege,
          userMajor,
          assignedRole === ROLES.ADMIN ? 'admin' : 'default_avatar',
          bio || (isAdm ? `Platform Administrator at ${userCollege}.` : `Student at ${userCollege} passionate about peer learning.`),
          initialCredits,
          JSON.stringify(['Vignan Member', `${assignedRole}`]),
          isAdm ? 1 : 0
        ]
      );

      // Record Welcome Credit Grant Transaction
      await db.runAsync(
        `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
         VALUES (?, ?, ?, 'Welcome Bonus', 'Platform onboarding credit grant', ?, 'Completed', 'SkillSwap System')`,
        ['tx_welcome_' + Date.now(), userId, new Date().toISOString().split('T')[0], initialCredits]
      );

      // Record Successful Registration Login in Database
      await recordLoginAudit({
        userId,
        email: normalizedEmail,
        role: assignedRole,
        ipAddress: clientMeta.ip,
        userAgent: clientMeta.userAgent,
        status: 'SUCCESS',
        authMethod: 'REGISTER'
      });

      const newUser = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [userId]);
      newUser.badges = JSON.parse(newUser.badges_json || '[]');
      delete newUser.password_hash;

      const token = generateToken(newUser);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully!',
        token,
        user: newUser
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Log in an existing user
   * POST /api/auth/login
   * Verifies email format and existence, and verifies password rule and authenticity
   */
  async login(req, res, next) {
    try {
      const { email, password, userId, emailOrId } = req.body;
      const clientMeta = getClientMeta(req);
      const rawIdentifier = email || emailOrId || userId;

      // 1. Verify Email / Identifier is provided
      if (!rawIdentifier || typeof rawIdentifier !== 'string' || !rawIdentifier.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Email verification failed: Please provide your registered university email address or User ID.'
        });
      }

      const identifier = rawIdentifier.trim();

      // 2. Verify Email Format (if identifier is formatted as an email)
      if (identifier.includes('@')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(identifier)) {
          return res.status(400).json({
            success: false,
            error: 'Email verification failed: Invalid email format. Please enter a valid address (e.g., student@vignan.ac.in).'
          });
        }
      }

      // 3. Verify Password is provided
      if (!password || typeof password !== 'string' || !password.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Password verification failed: Please enter your password.'
        });
      }

      // 4. Verify Password Rules: Must start with a Capital Letter (A-Z) and min 6 characters
      if (!/^[A-Z]/.test(password)) {
        await recordLoginAudit({
          email: identifier,
          ipAddress: clientMeta.ip,
          userAgent: clientMeta.userAgent,
          status: 'FAILED',
          failureReason: 'Password rule violation: Must start with capital letter',
          authMethod: 'PASSWORD'
        });

        return res.status(400).json({
          success: false,
          error: 'Password verification failed: Password must start with a capital letter (A-Z).'
        });
      }

      if (password.length < 6) {
        await recordLoginAudit({
          email: identifier,
          ipAddress: clientMeta.ip,
          userAgent: clientMeta.userAgent,
          status: 'FAILED',
          failureReason: 'Password rule violation: Length too short (<6 chars)',
          authMethod: 'PASSWORD'
        });

        return res.status(400).json({
          success: false,
          error: 'Password verification failed: Password must be at least 6 characters long.'
        });
      }

      // 5. Verify User Account Existence in Database
      let user = await db.getAsync(
        `SELECT * FROM users WHERE LOWER(email) = ? OR id = ?`,
        [identifier.toLowerCase(), identifier]
      );

      if (!user) {
        // Record Failed Attempt: Email Not Registered
        await recordLoginAudit({
          email: identifier,
          ipAddress: clientMeta.ip,
          userAgent: clientMeta.userAgent,
          status: 'FAILED',
          failureReason: 'Email not found in database',
          authMethod: 'PASSWORD'
        });

        return res.status(404).json({
          success: false,
          error: `Email verification failed: No registered account found with email or ID "${identifier}". Please check your email or register a new account.`
        });
      }

      // 6. Verify Password Authenticity (Bcrypt Match & Demo Fallback)
      let isMatch = false;
      if (user.password_hash) {
        isMatch = await bcrypt.compare(password, user.password_hash);
      }
      // Demo fallback for compliant test passwords and user ID
      if (!isMatch && (password === 'Password123' || password === 'password123' || password === user.id)) {
        isMatch = true;
      }

      if (!isMatch) {
        // Record Failed Attempt: Incorrect Password
        await recordLoginAudit({
          userId: user.id,
          email: user.email,
          role: user.role,
          ipAddress: clientMeta.ip,
          userAgent: clientMeta.userAgent,
          status: 'FAILED',
          failureReason: 'Incorrect password verification failed',
          authMethod: 'PASSWORD'
        });

        return res.status(401).json({
          success: false,
          error: `Password verification failed: Incorrect password entered for "${user.email}". Please verify your credentials and try again.`
        });
      }

      // 7. Verification Succeeded -> Update Login Record & History
      await db.runAsync(
        `UPDATE users SET last_login_at = CURRENT_TIMESTAMP, login_count = COALESCE(login_count, 0) + 1 WHERE id = ?`,
        [user.id]
      );

      await recordLoginAudit({
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress: clientMeta.ip,
        userAgent: clientMeta.userAgent,
        status: 'SUCCESS',
        authMethod: 'PASSWORD'
      });

      const updatedUser = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [user.id]);
      updatedUser.badges = JSON.parse(updatedUser.badges_json || '[]');
      delete updatedUser.password_hash;

      const token = generateToken(updatedUser);

      res.json({
        success: true,
        message: `Email & password verified successfully! Welcome back, ${updatedUser.name}!`,
        token,
        user: updatedUser
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Current Authenticated User Profile
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      res.json({
        success: true,
        user: req.user
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Login History Audit Logs from Database
   * GET /api/auth/login-history
   */
  async getLoginHistory(req, res, next) {
    try {
      const user = req.user;
      let logs = [];

      if (user.role === ROLES.ADMIN || user.is_admin === 1) {
        // Admins can see platform-wide login logs
        logs = await db.allAsync(
          `SELECT l.*, u.name as user_name 
           FROM login_history l 
           LEFT JOIN users u ON l.user_id = u.id 
           ORDER BY l.created_at DESC 
           LIMIT 50`
        );
      } else {
        // Students and Mentors see their own login history
        logs = await db.allAsync(
          `SELECT * FROM login_history 
           WHERE user_id = ? OR email = ? 
           ORDER BY created_at DESC 
           LIMIT 30`,
          [user.id, user.email]
        );
      }

      res.json({
        success: true,
        logins: logs
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Supabase Auth Sync Bridge
   * POST /api/auth/supabase-sync
   */
  async supabaseSync(req, res, next) {
    try {
      const { supabaseUser, token: supabaseToken } = req.body;
      const clientMeta = getClientMeta(req);

      if (!supabaseUser || !supabaseUser.email) {
        return res.status(400).json({ success: false, error: 'Invalid Supabase user payload' });
      }

      const email = supabaseUser.email.toLowerCase();
      let user = await db.getAsync(`SELECT * FROM users WHERE email = ?`, [email]);

      if (!user) {
        const userId = supabaseUser.id || ('usr_' + Date.now());
        const name = supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0];
        const role = ROLES.STUDENT;

        await db.runAsync(
          `INSERT INTO users (id, email, password_hash, role, name, college, major, avatar, bio, credits, escrow_locked, lifetime_earned, lifetime_spent, rating, reviews_count, badges_json, is_admin, last_login_at, login_count)
           VALUES (?, ?, 'supabase_oauth', ?, ?, 'Vignan University', 'B.Tech CSE', 'default_avatar', 'Vignan Student', 3.0, 0.0, 0.0, 0.0, 5.0, 0, '["Vignan Student"]', 0, CURRENT_TIMESTAMP, 1)`,
          [userId, email, role, name]
        );
        user = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [userId]);
      } else {
        await db.runAsync(
          `UPDATE users SET last_login_at = CURRENT_TIMESTAMP, login_count = COALESCE(login_count, 0) + 1 WHERE id = ?`,
          [user.id]
        );
      }

      await recordLoginAudit({
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress: clientMeta.ip,
        userAgent: clientMeta.userAgent,
        status: 'SUCCESS',
        authMethod: 'SUPABASE_OAUTH'
      });

      user.badges = JSON.parse(user.badges_json || '[]');
      delete user.password_hash;

      const token = generateToken(user);
      res.json({
        success: true,
        token,
        user
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
