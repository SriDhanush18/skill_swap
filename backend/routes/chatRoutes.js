/**
 * SkillSwap Platform - Protected Chat Routes
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

// All chat routes require authentication
router.use(authenticateToken);

router.get('/messages', chatController.getMessages);
router.post('/send', chatController.sendMessage);
router.get('/conversations', chatController.getConversations);

module.exports = router;
