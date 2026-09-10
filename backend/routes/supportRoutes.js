/**
 * SkillSwap Platform - Support Team & Doubt Classification Routes
 */

const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateToken } = require('../middleware/auth');

// All support routes are protected by JWT authentication
router.use(authenticateToken);

// Support Gatekeeper & Dynamic KPI Stats
router.get('/eligibility', supportController.getEligibilityStatus);
router.get('/stats', supportController.getSupportStats);

// Shared Support Doubts (First-Come-First-Served Hub)
router.get('/doubts', supportController.getAllDoubts);
router.get('/doubts/:id', supportController.getDoubtById);
router.post('/doubts', supportController.createDoubt);
router.post('/doubts/:id/accept', supportController.acceptDoubt);
router.post('/doubts/:id/answer', supportController.answerDoubt);
router.post('/doubts/:id/rate', supportController.rateDoubt);

// Backward-Compatibility Aliases
router.get('/tickets', supportController.getAllTickets);
router.get('/tickets/:id', supportController.getTicketById);
router.post('/tickets', supportController.createTicket);
router.post('/tickets/:id/claim', supportController.claimTicket);
router.post('/tickets/:id/resolve', supportController.resolveTicket);
router.post('/tickets/:id/rate', supportController.rateTicket);

module.exports = router;
