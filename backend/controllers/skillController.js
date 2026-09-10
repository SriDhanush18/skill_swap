/**
 * SkillSwap Platform - Skill Controller
 */

const { supabaseService } = require('../database/supabase');

const skillController = {
  async getOfferedSkills(req, res, next) {
    try {
      const skills = await supabaseService.getOfferedSkills();
      res.json({ success: true, skills });
    } catch (err) {
      next(err);
    }
  },

  async getWantedSkills(req, res, next) {
    try {
      const skills = await supabaseService.getWantedSkills();
      res.json({ success: true, skills });
    } catch (err) {
      next(err);
    }
  },

  async addSkillOffered(req, res, next) {
    try {
      const { name, category, level, description, rate } = req.body;
      const userId = req.user?.id || req.body.userId || req.currentUserId || 'sri';
      const result = await supabaseService.addSkillOffered(userId, { name, category, level, description, rate });
      res.status(201).json({ 
        success: true, 
        skill: result,
        qualificationBonusAwarded: result.qualificationBonusAwarded || false,
        bonusCredits: result.bonusCredits || 0,
        tierInfo: result.qualificationResult?.tierInfo
      });
    } catch (err) {
      next(err);
    }
  },

  async addSkillWanted(req, res, next) {
    try {
      const { name, category, level, goal } = req.body;
      const userId = req.user?.id || req.body.userId || req.currentUserId || 'sri';
      const result = await supabaseService.addSkillWanted(userId, { name, category, level, goal });
      res.status(201).json({ success: true, skill: result });
    } catch (err) {
      next(err);
    }
  },

  async checkQualification(req, res, next) {
    try {
      const skillName = req.query.skillName || req.body.skillName;
      const userId = req.user?.id || req.query.userId || 'sri';
      const qualResult = await supabaseService.checkAndAwardCourseQualificationBonus(userId, skillName);
      res.json({ success: true, qualification: qualResult });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = skillController;
