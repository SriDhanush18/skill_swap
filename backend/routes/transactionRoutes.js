const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

router.get('/', transactionController.getTransactions);
router.get('/:userId', transactionController.getTransactionsByUser);

module.exports = router;
