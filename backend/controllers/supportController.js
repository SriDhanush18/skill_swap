/**
 * SkillSwap Platform - Support Team & Doubt Classification Controller
 * 
 * Business Rules:
 * 1. Asking for support is FREE for students (0 Credits Cost).
 * 2. Eligibility Gatekeeper: Verifies if the student attended a session in that course
 *    on our website OR has prior knowledge / certification / quiz record in that course.
 * 3. Mentors who classify and solve the doubt earn 1.0 - 2.0 Skill Credits into their wallet.
 */

const { db } = require('../database/db');

/**
 * Helper to verify student course attendance / prior knowledge
 */
async function checkEligibility(userId, skillName) {
  if (!skillName) return { eligible: false, proof: 'None', reason: 'Skill name required' };

  const skillLower = `%${skillName.trim().toLowerCase()}%`;

  // 1. Check if student attended/booked a peer session or group cohort in this skill
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
      proof: `✓ Attended Peer Session on "${session.skill}"`,
      type: 'SESSION_ATTENDED',
      details: `Session ID: ${session.id} (${session.date})`
    };
  }

  // 2. Check if student has verified certificate in this skill
  const cert = await db.getAsync(
    `SELECT * FROM certificates 
     WHERE user_id = ? AND LOWER(skill_name) LIKE ? 
     LIMIT 1`,
    [userId, skillLower]
  );
  if (cert) {
    return {
      eligible: true,
      proof: `✓ Verified Academic Certificate (${cert.authority})`,
      type: 'CERTIFIED',
      details: cert.title
    };
  }

  // 3. Check if student has skill in portfolio (prior knowledge)
  const portfolio = await db.getAsync(
    `SELECT * FROM skills_offered 
     WHERE user_id = ? AND LOWER(name) LIKE ? 
     LIMIT 1`,
    [userId, skillLower]
  );
  if (portfolio) {
    return {
      eligible: true,
      proof: `✓ Prior Knowledge in Portfolio (${portfolio.level})`,
      type: 'PORTFOLIO_KNOWLEDGE',
      details: portfolio.name
    };
  }

  // 4. Check if student has taken a quiz attempt in this skill
  const quizAttempt = await db.getAsync(
    `SELECT * FROM quiz_attempts 
     WHERE user_id = ? AND LOWER(skill_name) LIKE ? 
     LIMIT 1`,
    [userId, skillLower]
  );
  if (quizAttempt) {
    return {
      eligible: true,
      proof: `✓ Completed Course Assessment Quiz (${quizAttempt.score_percent}%)`,
      type: 'QUIZ_ATTEMPT',
      details: `${quizAttempt.marks_obtained}/${quizAttempt.max_marks} Marks`
    };
  }

  return {
    eligible: false,
    proof: 'Unverified Course',
    reason: `You have not attended a peer learning session or registered prior knowledge in "${skillName}". Please book a course session or take an assessment quiz first to unlock free support.`
  };
}

const supportController = {
  /**
   * Check Student Eligibility for Course Support
   * GET /api/support/eligibility?skillName=Python
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
   * Get All Support Tickets
   * GET /api/support/tickets
   */
  async getAllTickets(req, res, next) {
    try {
      const { status, skill, issueType, mine } = req.query;
      const user = req.user;

      let sql = `SELECT * FROM support_tickets WHERE 1=1`;
      const params = [];

      if (status && status !== 'ALL') {
        sql += ` AND status = ?`;
        params.push(status.toUpperCase());
      }
      if (skill && skill !== 'ALL') {
        sql += ` AND LOWER(skill_name) LIKE ?`;
        params.push(`%${skill.toLowerCase()}%`);
      }
      if (issueType && issueType !== 'ALL') {
        sql += ` AND LOWER(issue_type) LIKE ?`;
        params.push(`%${issueType.toLowerCase()}%`);
      }
      if (mine === 'claimed') {
        sql += ` AND support_mentor_id = ?`;
        params.push(user.id);
      } else if (mine === 'my_doubts') {
        sql += ` AND student_id = ?`;
        params.push(user.id);
      }

      sql += ` ORDER BY CASE status WHEN 'OPEN' THEN 1 WHEN 'CLAIMED' THEN 2 WHEN 'RESOLVED' THEN 3 ELSE 4 END, created_at DESC`;

      const tickets = await db.allAsync(sql, params);
      res.json({
        success: true,
        count: tickets.length,
        tickets
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Single Support Ticket
   * GET /api/support/tickets/:id
   */
  async getTicketById(req, res, next) {
    try {
      const ticket = await db.getAsync(`SELECT * FROM support_tickets WHERE id = ?`, [req.params.id]);
      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Support ticket not found' });
      }
      res.json({ success: true, ticket });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Create New Support Doubt Ticket (Free for eligible students)
   * POST /api/support/tickets
   */
  async createTicket(req, res, next) {
    try {
      const { skillName, title, description, codeSnippet, issueType, sessionId, attachmentName, attachmentData } = req.body;
      const user = req.user;

      if (!skillName || !title || !description) {
        return res.status(400).json({
          success: false,
          error: 'Please provide skill name, title, and detailed description of your doubt.'
        });
      }

      // Check Gatekeeper Eligibility (Course attendance or prior knowledge)
      const eligibility = await checkEligibility(user.id, skillName);
      if (!eligibility.eligible) {
        return res.status(403).json({
          success: false,
          error: eligibility.reason,
          eligibility
        });
      }

      const ticketId = 'sup_' + Date.now();
      const type = issueType || 'Code Bug';

      // Determine platform-funded reward credits based on complexity category
      let rewardCredits = 1.0;
      if (type.includes('Architecture')) rewardCredits = 2.0;
      else if (type.includes('Bug') || type.includes('Debug')) rewardCredits = 1.5;
      else if (type.includes('Quiz')) rewardCredits = 1.0;

      await db.runAsync(
        `INSERT INTO support_tickets (id, student_id, student_name, session_id, skill_name, eligibility_proof, title, description, code_snippet, issue_type, reward_credits, attachment_name, attachment_data, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
        [
          ticketId,
          user.id,
          user.name,
          sessionId || null,
          skillName.trim(),
          eligibility.proof,
          title.trim(),
          description.trim(),
          codeSnippet || null,
          type,
          rewardCredits,
          attachmentName || null,
          attachmentData || null
        ]
      );

      const createdTicket = await db.getAsync(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);

      res.status(201).json({
        success: true,
        message: `Support ticket created! It is now live in the Support Team queue for mentors to classify. (Cost: 0 Credits)`,
        ticket: createdTicket
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Mentor Claims a Support Ticket
   * POST /api/support/tickets/:id/claim
   */
  async claimTicket(req, res, next) {
    try {
      const ticketId = req.params.id;
      const mentor = req.user;

      const ticket = await db.getAsync(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);
      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Support ticket not found.' });
      }

      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        return res.status(400).json({ success: false, error: 'This ticket is already resolved.' });
      }

      if (ticket.student_id === mentor.id) {
        return res.status(400).json({ success: false, error: 'You cannot claim your own support ticket.' });
      }

      await db.runAsync(
        `UPDATE support_tickets 
         SET status = 'CLAIMED', support_mentor_id = ?, support_mentor_name = ? 
         WHERE id = ?`,
        [mentor.id, mentor.name, ticketId]
      );

      const updated = await db.getAsync(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);

      res.json({
        success: true,
        message: `Ticket claimed! You can now analyze the code, classify the issue, and provide your solution.`,
        ticket: updated
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Mentor Classifies & Resolves Ticket (Credits Transferred to Mentor)
   * POST /api/support/tickets/:id/resolve
   */
  async resolveTicket(req, res, next) {
    try {
      const ticketId = req.params.id;
      const { classification, solution, recommendedQuizSkill } = req.body;
      const mentor = req.user;

      if (!classification || !solution) {
        return res.status(400).json({
          success: false,
          error: 'Please select an issue classification and provide a detailed solution.'
        });
      }

      const ticket = await db.getAsync(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);
      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Support ticket not found.' });
      }

      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        return res.status(400).json({ success: false, error: 'This ticket has already been resolved.' });
      }

      let rewardAmount = ticket.reward_credits || 1.0;
      if (classification.includes('Level 3') || classification.includes('Architectural') || classification.includes('Optimization')) {
        rewardAmount = 2.0;
      } else if (classification.includes('Level 2') || classification.includes('Logic') || classification.includes('State')) {
        rewardAmount = 1.5;
      } else if (classification.includes('Level 1') || classification.includes('Syntax') || classification.includes('Typo')) {
        rewardAmount = 1.0;
      }

      const recommendedSkill = recommendedQuizSkill || ticket.skill_name;

      // 1. Mark ticket resolved with classification & solution
      await db.runAsync(
        `UPDATE support_tickets 
         SET status = 'RESOLVED', 
             reward_credits = ?,
             support_mentor_id = ?, 
             support_mentor_name = ?, 
             mentor_classification = ?, 
             mentor_solution = ?, 
             recommended_assessment_skill = ?, 
             resolved_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [rewardAmount, mentor.id, mentor.name, classification, solution, recommendedSkill, ticketId]
      );

      // 2. Transfer Credit Reward to Supporting Mentor's Wallet
      await db.runAsync(
        `UPDATE users 
         SET credits = ROUND(credits + ?, 2), lifetime_earned = ROUND(lifetime_earned + ?, 2) 
         WHERE id = ?`,
        [rewardAmount, rewardAmount, mentor.id]
      );

      // 3. Record Payout in Transactions Ledger
      await db.runAsync(
        `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
         VALUES (?, ?, ?, 'Support Reward', ?, ?, 'Completed', ?)`,
        [
          'tx_sup_' + Date.now(),
          mentor.id,
          new Date().toISOString().split('T')[0],
          `Doubt Classification & Resolution: "${ticket.title}" (${classification})`,
          rewardAmount,
          ticket.student_name
        ]
      );

      // 4. Send Notification to Student with Follow-Up Assessment Recommendation
      await db.runAsync(
        `INSERT INTO notifications (id, user_id, title, message, time, is_unread, type)
         VALUES (?, ?, '🛠️ Support Doubt Resolved & Classified!', ?, 'Just now', 1, 'match')`,
        [
          'notif_sup_' + Date.now(),
          ticket.student_id,
          `Mentor ${mentor.name} resolved your doubt with classification "${classification}". You earned a recommended 20-Q follow-up quiz in ${recommendedSkill}!`
        ]
      );

      const resolvedTicket = await db.getAsync(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);

      res.json({
        success: true,
        message: `Doubt successfully classified and resolved! ${rewardAmount} credits have been deposited to your wallet.`,
        rewardEarned: rewardAmount,
        rewardCredits: rewardAmount,
        ticket: resolvedTicket
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Student Rates the Support Mentor
   * POST /api/support/tickets/:id/rate
   */
  async rateTicket(req, res, next) {
    try {
      const ticketId = req.params.id;
      const { rating, feedback } = req.body;
      const student = req.user;

      const ticket = await db.getAsync(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);
      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Support ticket not found.' });
      }

      if (ticket.student_id !== student.id) {
        return res.status(403).json({ success: false, error: 'Only the student who opened the ticket can submit rating.' });
      }

      const score = Math.max(1, Math.min(5, Number(rating) || 5));

      await db.runAsync(
        `UPDATE support_tickets 
         SET rating = ?, feedback = ?, status = 'CLOSED' 
         WHERE id = ?`,
        [score, feedback || 'Great support!', ticketId]
      );

      // Update mentor review score if mentor is assigned
      if (ticket.support_mentor_id) {
        await db.runAsync(
          `INSERT INTO reviews (id, session_id, target_user_id, reviewer_name, reviewer_avatar, skill, rating, comment, tags_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'rev_sup_' + Date.now(),
            ticket.session_id || ticket.id,
            ticket.support_mentor_id,
            student.name,
            student.avatar || student.id,
            ticket.skill_name + ' Support',
            score,
            feedback || 'Provided clear doubt resolution and code debugging in Support Team desk.',
            JSON.stringify(['Support Team Help', 'Clear Explanations', 'Hands-on Debugging'])
          ]
        );
      }

      res.json({
        success: true,
        message: 'Feedback submitted! Thank you for rating the mentor.'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = supportController;
