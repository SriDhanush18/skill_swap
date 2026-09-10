/**
 * SkillSwap Platform - Review Controller
 */

const { supabaseService } = require('../database/supabase');

const reviewController = {
  async getReviews(req, res, next) {
    try {
      const reviews = await supabaseService.getReviews();
      res.json({ success: true, reviews });
    } catch (err) {
      next(err);
    }
  },

  async addReview(req, res, next) {
    try {
      const { sessionId, tutorId, rating, comment, tags } = req.body;
      const learnerId = req.body.learnerId || req.currentUserId || 'sri';
      const result = await supabaseService.addReview({
        sessionId,
        learnerId,
        tutorId,
        rating: Number(rating) || 5.0,
        comment: comment || 'Great mentor!',
        tags: tags || []
      });
      res.json({ success: true, review: result });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = reviewController;
