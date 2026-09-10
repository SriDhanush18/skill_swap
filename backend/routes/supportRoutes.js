/**
 * SkillSwap Platform - Support Team & Doubt Classification Routes
 */

const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateToken } = require('../middleware/auth');

// All support routes are protected by JWT authentication
router.use(authenticateToken);

router.get('/eligibility', supportController.getEligibilityStatus);
router.get('/tickets', supportController.getAllTickets);
router.get('/tickets/:id', supportController.getTicketById);
router.post('/tickets', supportController.createTicket);
router.post('/tickets/:id/claim', supportController.claimTicket);
router.post('/tickets/:id/resolve', supportController.resolveTicket);
router.post('/tickets/:id/rate', supportController.rateTicket);

module.exports = router;
