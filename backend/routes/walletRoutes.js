/**
 * SkillSwap Platform - Protected Wallet Routes
 */

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');

// All Wallet routes strictly require authentication
router.use(authenticateToken);

router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.post('/transfer', walletController.transfer);

module.exports = router;
