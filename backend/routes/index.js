/**
 * SkillSwap Platform - Main API Router Index
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const walletRoutes = require('./walletRoutes');
const chatRoutes = require('./chatRoutes');
const userRoutes = require('./userRoutes');
const skillRoutes = require('./skillRoutes');
const sessionRoutes = require('./sessionRoutes');
const quizRoutes = require('./quizRoutes');
const certificateRoutes = require('./certificateRoutes');
const reviewRoutes = require('./reviewRoutes');
const transactionRoutes = require('./transactionRoutes');
const supportRoutes = require('./supportRoutes');

// API Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    platform: 'SkillSwap Peer-to-Peer Hub',
    authSystem: 'JWT + Supabase Auth Bridge + RBAC Active',
    roles: ['STUDENT', 'ADMIN'],
    markingScheme: '+3 for Correct, -1 for Wrong, 0 for Unattempted (Max: 60 Marks)'
  });
});

// Mount Resource Routers
router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/chats', chatRoutes);
router.use('/users', userRoutes);
router.use('/skills', skillRoutes);
router.use('/sessions', sessionRoutes);
router.use('/quizzes', quizRoutes);
router.use('/certificates', certificateRoutes);
router.use('/reviews', reviewRoutes);
router.use('/transactions', transactionRoutes);
router.use('/support', supportRoutes);

module.exports = router;
