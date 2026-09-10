/**
 * SkillSwap Platform - Session & Escrow Controller
 */

const { supabaseService } = require('../database/supabase');

const sessionController = {
  async getSessions(req, res, next) {
    try {
      const sessions = await supabaseService.getSessions();
      res.json({ success: true, sessions });
    } catch (err) {
      next(err);
    }
  },

  async bookSession(req, res, next) {
    try {
      const { learnerId, tutorId, skillName, sessionDate, durationHours, meetingLink } = req.body;
      const result = await supabaseService.bookSessionEscrow({
        learnerId: learnerId || req.currentUserId || 'sri',
        tutorId,
        skillName,
        sessionDate,
        durationHours: durationHours || 1,
        meetingLink: meetingLink || 'https://meet.google.com/skillswap-' + Math.random().toString(36).substring(7)
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async completeSession(req, res, next) {
    try {
      const { sessionId, rating, comment, tags } = req.body;
      const result = await supabaseService.completeSessionAndReleaseEscrow({
        sessionId,
        rating: Number(rating) || 5.0,
        comment: comment || 'Productive skill swap session!',
        tags: tags || []
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async createCohort(req, res, next) {
    try {
      const { skillName, topic, sessionDate, time, durationHours, maxCapacity, meetingLink } = req.body;
      const tutorId = req.user?.id || req.currentUserId || 'sri';
      const result = await supabaseService.createGroupCohortSession({
        tutorId,
        skillName,
        topic,
        sessionDate,
        time,
        durationHours,
        maxCapacity,
        meetingLink
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async enrollInCohort(req, res, next) {
    try {
      const { sessionId } = req.body;
      const studentId = req.user?.id || req.currentUserId || 'pujitha';
      const result = await supabaseService.enrollInCohortSession({
        sessionId,
        studentId
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getCohortAttendees(req, res, next) {
    try {
      const { id } = req.params;
      const attendees = await supabaseService.getCohortAttendees(id);
      res.json({ success: true, attendees });
    } catch (err) {
      next(err);
    }
  },

  async completeCohort(req, res, next) {
    try {
      const { id } = req.params;
      const { rating, comment, tags } = req.body;
      const tutorId = req.user?.id || req.currentUserId || 'sri';
      const result = await supabaseService.completeGroupCohortSession({
        sessionId: id,
        tutorId,
        rating,
        comment,
        tags
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async cancelSession(req, res, next) {
    try {
      const { sessionId, reason } = req.body;
      const result = await supabaseService.cancelSessionAndRefundEscrow({
        sessionId,
        reason: reason || 'Learner requested cancellation'
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = sessionController;
