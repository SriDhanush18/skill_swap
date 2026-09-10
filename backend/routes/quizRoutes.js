const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

router.get('/', optionalAuth, quizController.getQuizzes);
router.get('/dynamic/:skillName', optionalAuth, quizController.getDynamicQuiz);
router.get('/:skillName', optionalAuth, quizController.getDynamicQuiz);

// Protected quiz submission & attempts history
router.post('/submit', optionalAuth, quizController.submitQuiz);
router.get('/attempts/:userId', optionalAuth, quizController.getAttemptsByUser);

module.exports = router;
