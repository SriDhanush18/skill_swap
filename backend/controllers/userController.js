/**
 * SkillSwap Platform - User Controller
 */

const { supabaseService } = require('../database/supabase');

const userController = {
  async getAllUsers(req, res, next) {
    try {
      const { search, category, sortBy, order } = req.query;
      const users = await supabaseService.getUsers({ search, category, sortBy, order });
      res.json({ success: true, users });
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req, res, next) {
    try {
      const targetId = req.params.id || req.user?.id;
      const user = await supabaseService.getUserById(targetId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found in database.' });
      }
      res.json({ success: true, user });
    } catch (err) {
      next(err);
    }
  },

  async updateUser(req, res, next) {
    try {
      const targetId = req.params.id || req.user?.id || req.body.id || req.body.userId;
      if (!targetId) {
        return res.status(400).json({ success: false, error: 'User ID is required to update database record.' });
      }

      const updated = await supabaseService.updateUser(targetId, req.body);
      res.json({
        success: true,
        message: 'User details updated and stored in database successfully!',
        user: updated
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = userController;
