/**
 * SkillSwap Platform - AI Dynamic 20-Question Quiz & Assessment Controller
 */

const { supabaseService } = require('../database/supabase');

const quizController = {
  async getQuizzes(req, res, next) {
    try {
      const quizzes = await supabaseService.getQuizzes();
      res.json({ success: true, quizzes });
    } catch (err) {
      next(err);
    }
  },

  async getDynamicQuiz(req, res, next) {
    try {
      const skillName = req.params.skillName || req.query.skillName || 'Python Core & OOP';
      const quiz = await supabaseService.get20DynamicQuiz(skillName);
      res.json({ success: true, quiz });
    } catch (err) {
      next(err);
    }
  },

  async submitQuiz(req, res, next) {
    try {
      const { quizId, answers, userAnswers, skillName } = req.body;
      const finalAnswers = answers || userAnswers || {};
      const userId = req.user?.id || req.body.userId || req.currentUserId || 'sri';
      const result = await supabaseService.submit20Quiz(userId, quizId, skillName, finalAnswers);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getAttemptsByUser(req, res, next) {
    try {
      const userId = req.params.userId || req.currentUserId || 'sri';
      const attempts = await supabaseService.getAttemptsByUser(userId);
      res.json({ success: true, attempts });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = quizController;
