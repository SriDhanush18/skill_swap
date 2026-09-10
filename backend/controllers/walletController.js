/**
 * SkillSwap Platform - Wallet & Credit Controller
 */

const { db } = require('../database/db');

const walletController = {
  /**
   * Get Current Authenticated User Wallet Balance
   * GET /api/wallet/balance
   */
  async getBalance(req, res, next) {
    try {
      const user = await db.getAsync(`SELECT id, name, credits, escrow_locked, lifetime_earned, lifetime_spent FROM users WHERE id = ?`, [req.user.id]);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({
        success: true,
        wallet: {
          availableCredits: user.credits,
          escrowLocked: user.escrow_locked,
          lifetimeEarned: user.lifetime_earned,
          lifetimeSpent: user.lifetime_spent
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Transactions for Authenticated User
   * GET /api/wallet/transactions
   */
  async getTransactions(req, res, next) {
    try {
      const transactions = await db.allAsync(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id]);
      res.json({
        success: true,
        transactions
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Transfer Credits between Peers
   * POST /api/wallet/transfer
   */
  async transfer(req, res, next) {
    try {
      const { recipientId, amount, note } = req.body;
      const transferAmount = Number(amount);

      if (!recipientId || !transferAmount || transferAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid recipient or transfer amount.' });
      }

      if (req.user.id === recipientId) {
        return res.status(400).json({ success: false, error: 'Cannot transfer credits to yourself.' });
      }

      const sender = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
      const recipient = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [recipientId]);

      if (!recipient) {
        return res.status(404).json({ success: false, error: 'Recipient user not found.' });
      }

      if (sender.credits < transferAmount) {
        return res.status(400).json({ success: false, error: `Insufficient credits balance (${sender.credits} Cr).` });
      }

      // Deduct from sender
      await db.runAsync(`UPDATE users SET credits = ROUND(MAX(0, credits - ?), 2), lifetime_spent = ROUND(lifetime_spent + ?, 2) WHERE id = ?`, [transferAmount, transferAmount, sender.id]);
      // Credit to recipient
      await db.runAsync(`UPDATE users SET credits = ROUND(credits + ?, 2), lifetime_earned = ROUND(lifetime_earned + ?, 2) WHERE id = ?`, [transferAmount, transferAmount, recipient.id]);

      // Record Transactions
      const date = new Date().toISOString().split('T')[0];
      await db.runAsync(
        `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
         VALUES (?, ?, ?, 'Spent', ?, ?, 'Completed', ?)`,
        ['tx_tr_s_' + Date.now(), sender.id, date, `Transferred to ${recipient.name}: ${note || 'Peer tip'}`, -transferAmount, recipient.name]
      );
      await db.runAsync(
        `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
         VALUES (?, ?, ?, 'Earned', ?, ?, 'Completed', ?)`,
        ['tx_tr_r_' + Date.now(), recipient.id, date, `Received from ${sender.name}: ${note || 'Peer tip'}`, transferAmount, sender.name]
      );

      res.json({
        success: true,
        message: `Successfully transferred ${transferAmount} Credits to ${recipient.name}!`,
        newBalance: sender.credits - transferAmount
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = walletController;
