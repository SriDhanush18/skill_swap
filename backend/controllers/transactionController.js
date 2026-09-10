/**
 * SkillSwap Platform - Credit Ledger & Transaction Controller
 */

const { supabaseService } = require('../database/supabase');

const transactionController = {
  async getTransactions(req, res, next) {
    try {
      const transactions = await supabaseService.getTransactions();
      res.json({ success: true, transactions });
    } catch (err) {
      next(err);
    }
  },

  async getTransactionsByUser(req, res, next) {
    try {
      const userId = req.params.userId || req.currentUserId || 'sri';
      const transactions = await supabaseService.getTransactionsByUser(userId);
      res.json({ success: true, transactions });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = transactionController;
