const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Public browse routes
router.get('/offered', skillController.getOfferedSkills);
router.get('/wanted', skillController.getWantedSkills);
router.get('/qualification', optionalAuth, skillController.checkQualification);

// Protected mutation routes
router.post('/offered', authenticateToken, skillController.addSkillOffered);
router.post('/wanted', authenticateToken, skillController.addSkillWanted);

module.exports = router;
