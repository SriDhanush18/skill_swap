/**
 * SkillSwap Platform - Chat Controller
 */

const { db } = require('../database/db');

const chatController = {
  /**
   * Get Message Thread with a Peer
   * GET /api/chats/messages?peerId=xxx
   */
  async getMessages(req, res, next) {
    try {
      const currentUserId = req.user.id;
      const peerId = req.query.peerId;

      if (!peerId) {
        return res.status(400).json({ success: false, error: 'Please provide peerId query parameter.' });
      }

      const messages = await db.allAsync(
        `SELECT * FROM messages 
         WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_at ASC`,
        [currentUserId, peerId, peerId, currentUserId]
      );

      res.json({
        success: true,
        messages
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Send a Direct Peer Message
   * POST /api/chats/send
   */
  async sendMessage(req, res, next) {
    try {
      const senderId = req.user.id;
      const { receiverId, text } = req.body;

      if (!receiverId || !text || !text.trim()) {
        return res.status(400).json({ success: false, error: 'Please provide receiverId and text.' });
      }

      const receiver = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [receiverId]);
      if (!receiver) {
        return res.status(404).json({ success: false, error: 'Recipient user not found.' });
      }

      const msgId = 'msg_' + Date.now();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await db.runAsync(
        `INSERT INTO messages (id, sender_id, receiver_id, text, time)
         VALUES (?, ?, ?, ?, ?)`,
        [msgId, senderId, receiverId, text.trim(), timeStr]
      );

      // Create Notification for receiver
      await db.runAsync(
        `INSERT INTO notifications (id, user_id, title, message, time, is_unread, type)
         VALUES (?, ?, ?, ?, ?, 1, 'message')`,
        ['notif_' + Date.now(), receiverId, `💬 New message from ${req.user.name}`, text.trim().substring(0, 80), 'Just now']
      );

      res.status(201).json({
        success: true,
        message: {
          id: msgId,
          sender_id: senderId,
          receiver_id: receiverId,
          text: text.trim(),
          time: timeStr
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * List Active Conversations
   * GET /api/chats/conversations
   */
  async getConversations(req, res, next) {
    try {
      const userId = req.user.id;
      const msgs = await db.allAsync(
        `SELECT DISTINCT 
          CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS peer_id
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?`,
        [userId, userId, userId]
      );

      const peers = [];
      for (const m of msgs) {
        const peer = await db.getAsync(`SELECT id, name, college, major, avatar, rating, role FROM users WHERE id = ?`, [m.peer_id]);
        if (peer) {
          const lastMsg = await db.getAsync(
            `SELECT * FROM messages 
             WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
             ORDER BY created_at DESC LIMIT 1`,
            [userId, peer.id, peer.id, userId]
          );
          peers.push({
            peer,
            lastMessage: lastMsg
          });
        }
      }

      res.json({
        success: true,
        conversations: peers
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = chatController;
