const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, userController.getAllUsers);
router.get('/:id', optionalAuth, userController.getUserById);
router.put('/:id', authenticateToken, userController.updateUser);
router.patch('/:id', authenticateToken, userController.updateUser);
router.post('/update-profile', authenticateToken, userController.updateUser);

module.exports = router;
