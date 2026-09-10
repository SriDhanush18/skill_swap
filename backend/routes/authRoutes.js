/**
 * SkillSwap Platform - Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.get('/login-history', authenticateToken, authController.getLoginHistory);
router.post('/supabase-sync', authController.supabaseSync);

module.exports = router;
