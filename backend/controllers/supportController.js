/**
 * SkillSwap Platform - Shared Doubt & Support System Controller
 * 
 * Core Architectural Rules:
 * 1. ONE COMMON SUPPORT HUB: All registered users share the same doubt database.
 * 2. FIRST-COME-FIRST-SERVED ACCEPTANCE: Atomic database update ensures exactly 
 *    ONE user can accept an open doubt. All other race contenders receive 409 Conflict.
 * 3. AUTHOR PROTECTION: The student who raised the doubt cannot accept their own doubt.
 * 4. PERMISSION ENFORCEMENT: Only the accepted user can submit an answer (403 Forbidden otherwise).
 * 5. PERSISTENT REWARDS: Solving doubts deposits platform bounty credits into the solver's wallet.
 */

const { db } = require('../database/db');

/**
 * Helper to check prior session/quiz/certificate course attendance
 */
async function checkEligibility(userId, skillName) {
  if (!skillName) return { eligible: true, proof: 'Verified Peer Member', type: 'GENERAL' };

  const skillLower = `%${skillName.trim().toLowerCase()}%`;

  // 1. Check peer sessions
  const session = await db.getAsync(
    `SELECT s.* FROM sessions s 
     LEFT JOIN session_attendees sa ON sa.session_id = s.id
     WHERE (s.student_id = ? OR sa.student_id = ?) AND LOWER(s.skill) LIKE ? 
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId, userId, skillLower]
  );
  if (session) {
    return {
      eligible: true,
      proof: `✓ Attended Course Session on "${session.skill}"`,
      type: 'SESSION_ATTENDED'
    };
  }

  // 2. Check certificates
  const cert = await db.getAsync(
    `SELECT * FROM certificates WHERE user_id = ? AND LOWER(skill_name) LIKE ? LIMIT 1`,
    [userId, skillLower]
  );
  if (cert) {
    return {
      eligible: true,
      proof: `✓ Verified Academic Certificate (${cert.authority})`,
      type: 'CERTIFIED'
    };
  }

  // 3. Check portfolio skills
  const portfolio = await db.getAsync(
    `SELECT * FROM skills_offered WHERE user_id = ? AND LOWER(name) LIKE ? LIMIT 1`,
    [userId, skillLower]
  );
  if (portfolio) {
    return {
      eligible: true,
      proof: `✓ Prior Knowledge in Portfolio (${portfolio.level || 'Intermediate'})`,
      type: 'PORTFOLIO_KNOWLEDGE'
    };
  }

  // 4. Check quiz attempts
  const quiz = await db.getAsync(
    `SELECT * FROM quiz_attempts WHERE user_id = ? AND LOWER(skill_name) LIKE ? LIMIT 1`,
    [userId, skillLower]
  );
  if (quiz) {
    return {
      eligible: true,
      proof: `✓ Completed Course Assessment (${quiz.score_percent}%)`,
      type: 'QUIZ_ATTEMPT'
    };
  }

  // Default: All registered users have basic learner eligibility
  return {
    eligible: true,
    proof: '✓ Registered Vignan Student Learner',
    type: 'GENERAL_MEMBER'
  };
}

const supportController = {
  /**
   * Check Student Eligibility
   * GET /api/support/eligibility
   */
  async getEligibilityStatus(req, res, next) {
    try {
      const { skillName } = req.query;
      const user = req.user;
      const result = await checkEligibility(user.id, skillName);
      res.json({
        success: true,
        user: { id: user.id, name: user.name },
        skillName,
        ...result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Support Dynamic Statistics
   * GET /api/support/stats
   */
  async getSupportStats(req, res, next) {
    try {
      const stats = await db.getAsync(`
        SELECT 
          COUNT(CASE WHEN status = 'OPEN' THEN 1 END) AS openCount,
          COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END) AS acceptedCount,
          COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) AS resolvedCount,
          COALESCE(SUM(CASE WHEN status = 'RESOLVED' THEN reward_credits ELSE 0 END), 0) AS totalRewardsDistributed
        FROM support_doubts
      `);

      res.json({
        success: true,
        stats: {
          openDoubts: stats?.openCount || 0,
          inProgressDoubts: stats?.acceptedCount || 0,
          resolvedDoubts: stats?.resolvedCount || 0,
          totalRewardsCredits: Number((stats?.totalRewardsDistributed || 0).toFixed(1)),
          studentCost: '0.0 Cr (Free)'
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get All Shared Support Doubts
   * GET /api/support/doubts
   */
  async getAllDoubts(req, res, next) {
    try {
      const { status, category, course, search, mine, limit } = req.query;
      const currentUser = req.user;

      let sql = `
        SELECT 
          d.*,
          ru.name AS raised_by_name,
          ru.email AS raised_by_email,
          ru.avatar AS raised_by_avatar,
          au.name AS accepted_by_name,
          au.email AS accepted_by_email,
          au.avatar AS accepted_by_avatar
        FROM support_doubts d
        LEFT JOIN users ru ON ru.id = d.raised_by_user_id
        LEFT JOIN users au ON au.id = d.accepted_by_user_id
        WHERE 1=1
      `;
      const params = [];

      if (status && status !== 'ALL') {
        sql += ` AND d.status = ?`;
        params.push(status.toUpperCase());
      }

      if (category && category !== 'ALL') {
        sql += ` AND (LOWER(d.category) LIKE ? OR LOWER(d.course) LIKE ?)`;
        params.push(`%${category.toLowerCase()}%`, `%${category.toLowerCase()}%`);
      }

      if (course && course !== 'ALL') {
        sql += ` AND LOWER(d.course) LIKE ?`;
        params.push(`%${course.toLowerCase()}%`);
      }

      if (search && search.trim()) {
        const q = `%${search.trim().toLowerCase()}%`;
        sql += ` AND (LOWER(d.title) LIKE ? OR LOWER(d.description) LIKE ? OR LOWER(d.category) LIKE ? OR LOWER(ru.name) LIKE ?)`;
        params.push(q, q, q, q);
      }

      if (mine === 'my_doubts' || mine === 'true' || mine === 'MINE') {
        sql += ` AND (d.raised_by_user_id = ? OR d.accepted_by_user_id = ?)`;
        params.push(currentUser.id, currentUser.id);
      }

      sql += ` ORDER BY CASE d.status WHEN 'OPEN' THEN 1 WHEN 'ACCEPTED' THEN 2 WHEN 'RESOLVED' THEN 3 ELSE 4 END, d.created_at DESC`;

      if (limit) {
        sql += ` LIMIT ?`;
        params.push(Number(limit));
      }

      const doubts = await db.allAsync(sql, params);

      // Fetch answers for doubts
      const doubtIds = doubts.map(d => d.id);
      let answersMap = {};
      if (doubtIds.length > 0) {
        const placeholders = doubtIds.map(() => '?').join(',');
        const answers = await db.allAsync(`
          SELECT a.*, u.name AS answered_by_name, u.avatar AS answered_by_avatar
          FROM support_answers a
          LEFT JOIN users u ON u.id = a.answered_by_user_id
          WHERE a.doubt_id IN (${placeholders})
          ORDER BY a.created_at ASC
        `, doubtIds);

        answers.forEach(ans => {
          if (!answersMap[ans.doubt_id]) answersMap[ans.doubt_id] = [];
          answersMap[ans.doubt_id].push(ans);
        });
      }

      const enrichedDoubts = doubts.map(d => {
        const answers = answersMap[d.id] || [];
        const primaryAnswer = answers[0] || null;
        return {
          ...d,
          answers,
          // Compatibility fields with existing UI
          student_id: d.raised_by_user_id,
          student_name: d.raised_by_name || d.raised_by_user_id,
          skill_name: d.category || d.course || 'Technical Doubt',
          issue_type: d.category || 'CODE_BUG',
          support_mentor_id: d.accepted_by_user_id,
          support_mentor_name: d.accepted_by_name,
          mentor_solution: primaryAnswer?.answer_text || null,
          mentor_classification: primaryAnswer?.classification || null,
          recommended_assessment_skill: primaryAnswer?.recommended_assessment_skill || null
        };
      });

      res.json({
        success: true,
        count: enrichedDoubts.length,
        doubts: enrichedDoubts,
        tickets: enrichedDoubts // Backward compatibility alias
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Single Doubt By ID
   * GET /api/support/doubts/:id
   */
  async getDoubtById(req, res, next) {
    try {
      const doubt = await db.getAsync(`
        SELECT 
          d.*,
          ru.name AS raised_by_name,
          ru.email AS raised_by_email,
          ru.avatar AS raised_by_avatar,
          au.name AS accepted_by_name,
          au.email AS accepted_by_email,
          au.avatar AS accepted_by_avatar
        FROM support_doubts d
        LEFT JOIN users ru ON ru.id = d.raised_by_user_id
        LEFT JOIN users au ON au.id = d.accepted_by_user_id
        WHERE d.id = ?
      `, [req.params.id]);

      if (!doubt) {
        return res.status(404).json({ success: false, error: 'Support doubt not found' });
      }

      const answers = await db.allAsync(`
        SELECT a.*, u.name AS answered_by_name, u.avatar AS answered_by_avatar
        FROM support_answers a
        LEFT JOIN users u ON u.id = a.answered_by_user_id
        WHERE a.doubt_id = ?
        ORDER BY a.created_at ASC
      `, [doubt.id]);

      const primaryAnswer = answers[0] || null;

      const enriched = {
        ...doubt,
        answers,
        student_id: doubt.raised_by_user_id,
        student_name: doubt.raised_by_name || doubt.raised_by_user_id,
        skill_name: doubt.category || doubt.course || 'Technical Doubt',
        support_mentor_id: doubt.accepted_by_user_id,
        support_mentor_name: doubt.accepted_by_name,
        mentor_solution: primaryAnswer?.answer_text || null,
        mentor_classification: primaryAnswer?.classification || null,
        recommended_assessment_skill: primaryAnswer?.recommended_assessment_skill || null
      };

      res.json({
        success: true,
        doubt: enriched,
        ticket: enriched
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Raise / Create a New Doubt
   * POST /api/support/doubts
   */
  async createDoubt(req, res, next) {
    try {
      const { category, course, skillName, title, description, codeSnippet, attachmentName, attachmentData, issueType } = req.body;
      const user = req.user;

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a title and detailed description for your doubt.'
        });
      }

      const doubtCategory = category || skillName || issueType || 'Code Bug';
      const doubtCourse = course || skillName || 'General Engineering';

      const eligibility = await checkEligibility(user.id, doubtCategory);

      const doubtId = 'dbt_' + Date.now();
      let rewardCredits = 1.5;
      if (doubtCategory.includes('Architecture') || doubtCategory.includes('Level 3')) rewardCredits = 2.0;
      else if (doubtCategory.includes('Syntax') || doubtCategory.includes('Level 1')) rewardCredits = 1.0;

      await db.runAsync(`
        INSERT INTO support_doubts (
          id, raised_by_user_id, category, course, title, description, 
          code_snippet, attachment_name, attachment_data, status, 
          reward_credits, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        doubtId,
        user.id,
        doubtCategory,
        doubtCourse,
        title.trim(),
        description.trim(),
        codeSnippet || null,
        attachmentName || null,
        attachmentData || null,
        rewardCredits
      ]);

      // Mirror to support_tickets for backwards compatibility
      try {
        await db.runAsync(`
          INSERT INTO support_tickets (
            id, student_id, student_name, skill_name, eligibility_proof, 
            title, description, code_snippet, issue_type, reward_credits, 
            attachment_name, attachment_data, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', CURRENT_TIMESTAMP)
        `, [
          doubtId,
          user.id,
          user.name,
          doubtCategory,
          eligibility.proof,
          title.trim(),
          description.trim(),
          codeSnippet || null,
          doubtCategory,
          rewardCredits,
          attachmentName || null,
          attachmentData || null
        ]);
      } catch (e) {}

      const createdDoubt = await db.getAsync(`
        SELECT d.*, ru.name AS raised_by_name, ru.avatar AS raised_by_avatar 
        FROM support_doubts d
        LEFT JOIN users ru ON ru.id = d.raised_by_user_id
        WHERE d.id = ?
      `, [doubtId]);

      res.status(201).json({
        success: true,
        message: 'Doubt successfully submitted to the common Support Team queue! (Cost: 0 Credits)',
        doubt: createdDoubt,
        ticket: createdDoubt
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Accept an Open Doubt (ATOMIC FIRST-COME-FIRST-SERVED)
   * POST /api/support/doubts/:id/accept
   */
  async acceptDoubt(req, res, next) {
    try {
      const doubtId = req.params.id;
      const currentUser = req.user;

      const doubt = await db.getAsync(`SELECT * FROM support_doubts WHERE id = ?`, [doubtId]);
      if (!doubt) {
        return res.status(404).json({ success: false, error: 'Support doubt not found.' });
      }

      // 1. Author cannot accept their own doubt
      if (doubt.raised_by_user_id === currentUser.id) {
        return res.status(400).json({
          success: false,
          error: 'You cannot accept your own doubt. A peer tutor or mentor must accept it.'
        });
      }

      // 2. Check if already resolved
      if (doubt.status === 'RESOLVED') {
        return res.status(400).json({
          success: false,
          error: 'This doubt has already been resolved.'
        });
      }

      // 3. ATOMIC FIRST-COME-FIRST-SERVED UPDATE
      const result = await db.runAsync(`
        UPDATE support_doubts
        SET status = 'ACCEPTED',
            accepted_by_user_id = ?,
            accepted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'OPEN' AND accepted_by_user_id IS NULL
      `, [currentUser.id, doubtId]);

      // Check if this user won the atomic race
      if (!result || result.changes === 0) {
        // Someone else accepted it first
        const currentClaim = await db.getAsync(`
          SELECT d.*, u.name AS accepted_by_name 
          FROM support_doubts d
          LEFT JOIN users u ON u.id = d.accepted_by_user_id
          WHERE d.id = ?
        `, [doubtId]);

        return res.status(409).json({
          success: false,
          error: 'This doubt has already been accepted by another user.',
          acceptedBy: currentClaim?.accepted_by_name || 'Another user'
        });
      }

      // Mirror to support_tickets
      try {
        await db.runAsync(`
          UPDATE support_tickets
          SET status = 'CLAIMED',
              support_mentor_id = ?,
              support_mentor_name = ?
          WHERE id = ?
        `, [currentUser.id, currentUser.name, doubtId]);
      } catch (e) {}

      const updatedDoubt = await db.getAsync(`
        SELECT 
          d.*,
          ru.name AS raised_by_name,
          au.name AS accepted_by_name
        FROM support_doubts d
        LEFT JOIN users ru ON ru.id = d.raised_by_user_id
        LEFT JOIN users au ON au.id = d.accepted_by_user_id
        WHERE d.id = ?
      `, [doubtId]);

      res.json({
        success: true,
        message: '🎉 You successfully accepted this doubt! You are now assigned to write and submit the solution.',
        doubt: updatedDoubt,
        ticket: updatedDoubt
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Submit Answer / Solution for an Accepted Doubt
   * POST /api/support/doubts/:id/answer
   */
  async answerDoubt(req, res, next) {
    try {
      const doubtId = req.params.id;
      const { answerText, solution, classification, attachmentName, attachmentData, recommendedAssessmentSkill, recommendedQuizSkill } = req.body;
      const currentUser = req.user;

      const finalSolution = answerText || solution;
      if (!finalSolution || !finalSolution.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a detailed solution/answer for the doubt.'
        });
      }

      const doubt = await db.getAsync(`SELECT * FROM support_doubts WHERE id = ?`, [doubtId]);
      if (!doubt) {
        return res.status(404).json({ success: false, error: 'Support doubt not found.' });
      }

      // Security: ONLY the user who accepted this doubt can answer it
      if (doubt.accepted_by_user_id !== currentUser.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only the user who accepted this doubt can submit an answer.'
        });
      }

      if (doubt.status === 'RESOLVED') {
        return res.status(400).json({
          success: false,
          error: 'This doubt has already been resolved.'
        });
      }

      const finalClassification = classification || 'Level 1: Syntax / Typo / Quick Debug';
      let rewardAmount = doubt.reward_credits || 1.5;
      if (finalClassification.includes('Level 3') || finalClassification.includes('Architecture')) {
        rewardAmount = 2.0;
      } else if (finalClassification.includes('Level 2') || finalClassification.includes('Logic')) {
        rewardAmount = 1.5;
      } else if (finalClassification.includes('Level 1') || finalClassification.includes('Syntax')) {
        rewardAmount = 1.0;
      }

      const recommendedSkill = recommendedAssessmentSkill || recommendedQuizSkill || doubt.category || 'Programming';

      // 1. Insert Answer Record
      const answerId = 'ans_' + Date.now();
      await db.runAsync(`
        INSERT INTO support_answers (
          id, doubt_id, answered_by_user_id, answer_text, classification,
          attachment_name, attachment_data, recommended_assessment_skill, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        answerId,
        doubtId,
        currentUser.id,
        finalSolution.trim(),
        finalClassification,
        attachmentName || null,
        attachmentData || null,
        recommendedSkill
      ]);

      // 2. Mark Doubt as RESOLVED
      await db.runAsync(`
        UPDATE support_doubts
        SET status = 'RESOLVED',
            reward_credits = ?,
            resolved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [rewardAmount, doubtId]);

      // 3. Deposit Reward Bounty to Mentor's Wallet
      await db.runAsync(`
        UPDATE users 
        SET credits = ROUND(credits + ?, 2), 
            lifetime_earned = ROUND(lifetime_earned + ?, 2) 
        WHERE id = ?
      `, [rewardAmount, rewardAmount, currentUser.id]);

      // 4. Record in Transactions Ledger
      await db.runAsync(`
        INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
        VALUES (?, ?, ?, 'Support Reward', ?, ?, 'Completed', ?)
      `, [
        'tx_dbt_' + Date.now(),
        currentUser.id,
        new Date().toISOString().split('T')[0],
        `Doubt Resolution Bounty: "${doubt.title}" (${finalClassification})`,
        rewardAmount,
        doubt.raised_by_user_id
      ]);

      // 5. Send Notification to Original Question Raiser
      await db.runAsync(`
        INSERT INTO notifications (id, user_id, title, message, time, is_unread, type)
        VALUES (?, ?, '🛠️ Your Doubt Has Been Resolved!', ?, 'Just now', 1, 'match')
      `, [
        'notif_dbt_' + Date.now(),
        doubt.raised_by_user_id,
        `Mentor ${currentUser.name} submitted a verified solution for your doubt "${doubt.title}". Click Support Desk to view the answer!`
      ]);

      // Mirror to support_tickets
      try {
        await db.runAsync(`
          UPDATE support_tickets
          SET status = 'RESOLVED',
              reward_credits = ?,
              support_mentor_id = ?,
              support_mentor_name = ?,
              mentor_classification = ?,
              mentor_solution = ?,
              recommended_assessment_skill = ?,
              resolved_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [rewardAmount, currentUser.id, currentUser.name, finalClassification, finalSolution.trim(), recommendedSkill, doubtId]);
      } catch (e) {}

      const resolvedDoubt = await db.getAsync(`
        SELECT 
          d.*,
          ru.name AS raised_by_name,
          au.name AS accepted_by_name
        FROM support_doubts d
        LEFT JOIN users ru ON ru.id = d.raised_by_user_id
        LEFT JOIN users au ON au.id = d.accepted_by_user_id
        WHERE d.id = ?
      `, [doubtId]);

      res.json({
        success: true,
        message: `Solution submitted! +${rewardAmount} Skill Credits deposited into your wallet.`,
        rewardEarned: rewardAmount,
        rewardCredits: rewardAmount,
        doubt: resolvedDoubt,
        ticket: resolvedDoubt
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Rate a Resolved Doubt
   * POST /api/support/doubts/:id/rate
   */
  async rateDoubt(req, res, next) {
    try {
      const doubtId = req.params.id;
      const { rating, feedback } = req.body;
      const currentUser = req.user;

      const doubt = await db.getAsync(`SELECT * FROM support_doubts WHERE id = ?`, [doubtId]);
      if (!doubt) {
        return res.status(404).json({ success: false, error: 'Support doubt not found.' });
      }

      if (doubt.raised_by_user_id !== currentUser.id) {
        return res.status(403).json({ success: false, error: 'Only the user who raised the doubt can rate the answer.' });
      }

      const score = Math.max(1, Math.min(5, Number(rating) || 5));

      await db.runAsync(`
        UPDATE support_doubts
        SET rating = ?, feedback = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [score, feedback || 'Great solution!', doubtId]);

      // Mirror to support_tickets
      try {
        await db.runAsync(`
          UPDATE support_tickets
          SET rating = ?, feedback = ?, status = 'CLOSED'
          WHERE id = ?
        `, [score, feedback || 'Great solution!', doubtId]);
      } catch (e) {}

      res.json({
        success: true,
        message: 'Thank you for rating your mentor!'
      });
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // Aliases for Backward Compatibility
  // ==========================================
  getAllTickets(req, res, next) {
    return supportController.getAllDoubts(req, res, next);
  },
  getTicketById(req, res, next) {
    return supportController.getDoubtById(req, res, next);
  },
  createTicket(req, res, next) {
    return supportController.createDoubt(req, res, next);
  },
  claimTicket(req, res, next) {
    return supportController.acceptDoubt(req, res, next);
  },
  resolveTicket(req, res, next) {
    return supportController.answerDoubt(req, res, next);
  },
  rateTicket(req, res, next) {
    return supportController.rateDoubt(req, res, next);
  }
};

module.exports = supportController;
