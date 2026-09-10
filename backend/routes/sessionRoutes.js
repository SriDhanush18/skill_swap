const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticateToken } = require('../middleware/auth');

// All session routes strictly require authentication
router.use(authenticateToken);

router.get('/', sessionController.getSessions);
router.post('/book', sessionController.bookSession);
router.post('/complete', sessionController.completeSession);
router.post('/cancel', sessionController.cancelSession);

// Live Zoom & Real-Time Video Conference Routes
router.get('/:id/live-meeting', sessionController.getOrCreateLiveMeeting);
router.post('/:id/live-meeting', sessionController.getOrCreateLiveMeeting);
router.post('/:id/end-meeting', sessionController.endLiveMeeting);

// Multi-Student Group Cohort & Live Masterclass Routes
router.post('/create-cohort', sessionController.createCohort);
router.post('/enroll', sessionController.enrollInCohort);
router.get('/:id/attendees', sessionController.getCohortAttendees);
router.post('/:id/complete-cohort', sessionController.completeCohort);

module.exports = router;
