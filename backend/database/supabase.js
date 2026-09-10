const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const { generate20DynamicQuestions } = require('../services/aiQuizGenerator');
const { analyzeAndVerifyCertificate, verifyCertificateAuthenticity } = require('../services/certificateVerifier');
require('dotenv').config();

let supabaseUrl = process.env.SUPABASE_URL || '';
let supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let supabaseClient = null;
let isConnectedToSupabase = false;

function initSupabase() {
  if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      isConnectedToSupabase = true;
      console.log('⚡ Connected to Supabase Cloud Database:', supabaseUrl);
    } catch (e) {
      console.warn('⚠️ Supabase connection failed, using local database adapter:', e.message);
      supabaseClient = null;
      isConnectedToSupabase = false;
    }
  } else {
    console.log('📦 Using Local Database Adapter');
    supabaseClient = null;
    isConnectedToSupabase = false;
  }
}

initSupabase();

// 4 Exact Tutor Categories Formula:
// 1. Bronze: Passed Quiz (70-89%) + No Certificate -> 1.0 Credit/hr
// 2. Silver: Quiz Score >= 90% + No Certificate -> 1.5 Credits/hr
// 3. Advanced: Passed Quiz (70-89%) + NPTEL / Coursera Certificate -> 2.0 Credits/hr
// 4. Elite Master: Quiz Score >= 90% + NPTEL / Coursera Certificate -> 2.5 Credits/hr
function determineTutorTier(quizScore = 0, hasCertificate = false) {
  const isHighQuiz = quizScore >= 90;
  const isPassed = quizScore >= 70;

  if (isHighQuiz && hasCertificate) {
    return { tier: 'Elite Master', badge: '🥇 Elite Master Tutor', rate: 2.5 };
  } else if (isPassed && hasCertificate) {
    return { tier: 'Advanced', badge: '🎖️ Advanced Tutor', rate: 2.0 };
  } else if (isHighQuiz && !hasCertificate) {
    return { tier: 'Silver', badge: '🥈 Silver Tutor', rate: 1.5 };
  } else if (isPassed) {
    return { tier: 'Bronze', badge: '🥉 Bronze Tutor', rate: 1.0 };
  } else {
    return { tier: 'Unverified', badge: 'Unverified', rate: 1.0 };
  }
}

// In-memory cache of active dynamic 20-question quizzes by session/skill
const activeDynamicQuizzes = new Map();

const dbProvider = {
  getStatus() {
    return {
      isSupabase: isConnectedToSupabase,
      url: supabaseUrl ? supabaseUrl.replace(/^(https:\/\/[^.]+).*/, '$1.supabase.co') : 'Local Database',
      mode: isConnectedToSupabase ? 'Supabase PostgreSQL' : 'Local Hybrid Engine'
    };
  },

  setCredentials(url, key) {
    supabaseUrl = url;
    supabaseAnonKey = key;
    initSupabase();
    return this.getStatus();
  },

  determineTutorTier,

  async getUsers(filter = {}) {
    let users = [];
    if (isConnectedToSupabase && supabaseClient) {
      const { data, error } = await supabaseClient.from('users').select('*').eq('is_admin', 0);
      if (error) throw error;
      for (const u of data) {
        const { data: so } = await supabaseClient.from('skills_offered').select('*').eq('user_id', u.id);
        const { data: sw } = await supabaseClient.from('skills_wanted').select('*').eq('user_id', u.id);
        const { data: certs } = await supabaseClient.from('certificates').select('*').eq('user_id', u.id);
        u.badges = typeof u.badges_json === 'string' ? JSON.parse(u.badges_json) : (u.badges_json || []);
        u.skillsOffered = so || [];
        u.skillsWanted = sw || [];
        u.certificates = certs || [];
      }
      users = data;
    } else {
      users = await db.allAsync(`SELECT * FROM users WHERE is_admin = 0`);
      for (const u of users) {
        u.badges = JSON.parse(u.badges_json || '[]');
        u.skillsOffered = await db.allAsync(`SELECT * FROM skills_offered WHERE user_id = ?`, [u.id]);
        u.skillsWanted = await db.allAsync(`SELECT * FROM skills_wanted WHERE user_id = ?`, [u.id]);
        u.certificates = await db.allAsync(`SELECT * FROM certificates WHERE user_id = ?`, [u.id]);
      }
    }

    // Filter by search keyword
    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      users = users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        (u.skillsOffered || []).some(s => s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)) ||
        (u.major || '').toLowerCase().includes(q)
      );
    }

    // Filter by skill category
    if (filter.category && filter.category !== 'all') {
      users = users.filter(u => (u.skillsOffered || []).some(s => s.category === filter.category));
    }

    // Sort by credits or rating
    const getMentorRate = (u) => (u.skillsOffered && u.skillsOffered.length > 0) ? (Number(u.skillsOffered[0].rate) || 1.0) : 1.0;

    if (filter.sortBy === 'credits' || filter.sortBy === 'rate') {
      const isAsc = filter.order === 'asc' || filter.order === 'low_to_high' || filter.sortBy === 'credits_asc';
      users.sort((a, b) => isAsc ? (getMentorRate(a) - getMentorRate(b)) : (getMentorRate(b) - getMentorRate(a)));
    } else if (filter.sortBy === 'credits_asc') {
      users.sort((a, b) => getMentorRate(a) - getMentorRate(b));
    } else if (filter.sortBy === 'credits_desc') {
      users.sort((a, b) => getMentorRate(b) - getMentorRate(a));
    } else if (filter.sortBy === 'rating') {
      users.sort((a, b) => (Number(b.rating) || 5.0) - (Number(a.rating) || 5.0));
    }

    return users;
  },

  async getUserById(id) {
    if (isConnectedToSupabase && supabaseClient) {
      const { data: user, error } = await supabaseClient.from('users').select('*').eq('id', id).single();
      if (error) throw error;
      const { data: so } = await supabaseClient.from('skills_offered').select('*').eq('user_id', id);
      const { data: sw } = await supabaseClient.from('skills_wanted').select('*').eq('user_id', id);
      const { data: certs } = await supabaseClient.from('certificates').select('*').eq('user_id', id);
      const { data: rev } = await supabaseClient.from('reviews').select('*').eq('target_user_id', id).order('created_at', { ascending: false });
      const { data: txs } = await supabaseClient.from('transactions').select('*').eq('user_id', id).order('created_at', { ascending: false });
      const { data: attempts } = await supabaseClient.from('quiz_attempts').select('*').eq('user_id', id).order('attempted_at', { ascending: false });

      user.badges = typeof user.badges_json === 'string' ? JSON.parse(user.badges_json) : (user.badges_json || []);
      user.skillsOffered = so || [];
      user.skillsWanted = sw || [];
      user.certificates = certs || [];
      user.transactions = txs || [];
      user.quizAttempts = attempts || [];
      user.reviews = (rev || []).map(r => ({
        ...r,
        tags: typeof r.tags_json === 'string' ? JSON.parse(r.tags_json) : (r.tags_json || [])
      }));
      return user;
    }

    const user = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user) return null;
    user.badges = JSON.parse(user.badges_json || '[]');
    user.skillsOffered = await db.allAsync(`SELECT * FROM skills_offered WHERE user_id = ?`, [user.id]);
    user.skillsWanted = await db.allAsync(`SELECT * FROM skills_wanted WHERE user_id = ?`, [user.id]);
    user.certificates = await db.allAsync(`SELECT * FROM certificates WHERE user_id = ?`, [user.id]);
    user.reviews = await db.allAsync(`SELECT * FROM reviews WHERE target_user_id = ? ORDER BY id DESC`, [user.id]);
    user.transactions = await db.allAsync(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC, id DESC`, [user.id]);
    user.quizAttempts = await db.allAsync(`SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY attempted_at DESC, id DESC`, [user.id]);
    for (const r of user.reviews) {
      r.tags = JSON.parse(r.tags_json || '[]');
    }
    return user;
  },

  async updateUser(id, data) {
    const existing = await this.getUserById(id);
    if (!existing) {
      throw new Error(`User with ID '${id}' not found in database.`);
    }

    const updates = {};
    if (data.name !== undefined && data.name !== null) updates.name = String(data.name).trim();
    if (data.email !== undefined && data.email !== null) updates.email = String(data.email).trim().toLowerCase();
    if (data.college !== undefined && data.college !== null) updates.college = String(data.college).trim();
    if (data.major !== undefined && data.major !== null) updates.major = String(data.major).trim();
    if (data.bio !== undefined && data.bio !== null) updates.bio = String(data.bio).trim();
    if (data.avatar !== undefined && data.avatar !== null) updates.avatar = String(data.avatar);
    if (data.role !== undefined && data.role !== null) updates.role = String(data.role);
    if (data.badges !== undefined && data.badges !== null) {
      updates.badges_json = Array.isArray(data.badges) ? JSON.stringify(data.badges) : String(data.badges);
    }
    if (data.credits !== undefined && data.credits !== null) updates.credits = Number(data.credits);
    if (data.password) {
      const pwd = String(data.password).trim();
      if (!/^[A-Z]/.test(pwd)) {
        throw new Error('Password rule violation: Password must start with a capital letter (A-Z).');
      }
      if (pwd.length < 6) {
        throw new Error('Password rule violation: Password must be at least 6 characters long.');
      }
      updates.password_hash = await bcrypt.hash(pwd, 10);
    }

    // Update SQLite database
    const fields = Object.keys(updates);
    if (fields.length > 0) {
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = [...Object.values(updates), id];
      await db.runAsync(`UPDATE users SET ${setClause} WHERE id = ?`, values);
    }

    // Update Supabase PostgreSQL database if connected
    if (isConnectedToSupabase && supabaseClient && fields.length > 0) {
      try {
        await supabaseClient.from('users').update(updates).eq('id', id);
      } catch (err) {
        console.warn('Supabase profile update notice:', err.message);
      }
    }

    return await this.getUserById(id);
  },

  async getMatches(userId) {
    const current = await this.getUserById(userId);
    if (!current) return [];

    const allUsers = await this.getUsers();
    const peers = allUsers.filter(u => u.id !== current.id);
    const matches = [];

    for (const peer of peers) {
      const canTeachMe = (peer.skillsOffered || []).filter(so =>
        (current.skillsWanted || []).some(sw =>
          so.name.toLowerCase().includes(sw.name.toLowerCase()) ||
          sw.name.toLowerCase().includes(so.name.toLowerCase()) ||
          so.category === sw.category
        )
      );

      const canLearnFromMe = (peer.skillsWanted || []).filter(sw =>
        (current.skillsOffered || []).some(so =>
          so.name.toLowerCase().includes(sw.name.toLowerCase()) ||
          sw.name.toLowerCase().includes(so.name.toLowerCase()) ||
          so.category === sw.category
        )
      );

      const isTwoWay = canTeachMe.length > 0 && canLearnFromMe.length > 0;
      let matchScore = isTwoWay ? 98 : canTeachMe.length > 0 ? 88 : 72;

      matches.push({
        peer,
        isTwoWay,
        matchScore,
        canTeachMe,
        canLearnFromMe
      });
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  },

  async getQuizzes() {
    let quizzes = await db.allAsync(`SELECT * FROM quizzes`);
    const dsaExists = (quizzes || []).some(q => q.skill_name.toLowerCase().includes('data structure') || q.skill_name.toLowerCase().includes('algorithm'));
    if (!dsaExists) {
      await db.runAsync(
        `INSERT OR IGNORE INTO quizzes (id, skill_name, category, title, passing_score, time_limit_minutes) VALUES (?, ?, ?, ?, ?, ?)`,
        ['quiz_dsa', 'Data Structures & Algorithms', 'Tech', 'Data Structures & Algorithms Mentor Certification', 70, 15]
      );
      quizzes = await db.allAsync(`SELECT * FROM quizzes`);
    }
    for (const q of quizzes) {
      q.questionsCount = 20; // 20 AI dynamic questions
      q.time_limit_minutes = 15;
    }
    return quizzes;
  },

  /**
   * Generates or fetches 20 AI dynamic questions for a specific skill assessment
   */
  async get20DynamicQuiz(skillName) {
    const normalized = decodeURIComponent(skillName).trim();
    const questions = await generate20DynamicQuestions(normalized);
    const quizId = 'quiz_dyn_' + Date.now();

    const quizObj = {
      id: quizId,
      skill_name: normalized,
      title: `${normalized} AI Mentor Qualification Assessment`,
      category: normalized.toLowerCase().includes('design') ? 'Design' : 'Tech',
      passing_score: 70,
      time_limit_minutes: 15,
      questionsCount: questions.length,
      questions
    };

    activeDynamicQuizzes.set(quizId, quizObj);
    return quizObj;
  },

  /**
   * Evaluates all 20 questions with Negative Marking (+3 for Correct, -1 for Wrong, 0 for Unattempted),
   * stores student responses & evaluation in DB, and returns marks & percentage score
   */
  async submit20Quiz(userId, quizId, skillName, userAnswers) {
    let quiz = activeDynamicQuizzes.get(quizId);
    if (!quiz) {
      // If not in cache, generate baseline reference
      const questions = await generate20DynamicQuestions(skillName || 'Python Core & OOP');
      quiz = {
        id: quizId,
        skill_name: skillName || 'Python Core & OOP',
        passing_score: 70,
        questions
      };
    }

    const totalQuestions = quiz.questions.length || 20;
    const maxMarks = totalQuestions * 3; // 60 Marks total
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    const detailedResults = [];

    quiz.questions.forEach((q, idx) => {
      const qKey = q.id || `q_${idx + 1}`;
      let userSelected = userAnswers[qKey];
      if (userSelected === undefined || userSelected === null) {
        userSelected = userAnswers[idx] !== undefined ? userAnswers[idx] : userAnswers[String(idx)];
      }

      const isUnattempted = userSelected === undefined || userSelected === null || userSelected === '';
      const isCorrect = !isUnattempted && Number(userSelected) === Number(q.correct_option_index);
      const isWrong = !isUnattempted && !isCorrect;

      let marksAwarded = 0;
      if (isCorrect) {
        correctCount++;
        marksAwarded = 3;
      } else if (isWrong) {
        wrongCount++;
        marksAwarded = -1;
      } else {
        unattemptedCount++;
        marksAwarded = 0;
      }

      detailedResults.push({
        questionId: qKey,
        question: q.question,
        code_snippet: q.code_snippet || '',
        userSelected: isUnattempted ? null : Number(userSelected),
        correctIndex: q.correct_option_index,
        isCorrect,
        isWrong,
        isUnattempted,
        marksAwarded,
        explanation: q.explanation || 'Standard academic concept.',
        options: q.options || []
      });
    });

    // Negative Marking Arithmetic: (+3 * Correct) - (1 * Wrong)
    const marksObtained = (correctCount * 3) - (wrongCount * 1);
    const scorePercent = Math.max(0, Math.round((marksObtained / maxMarks) * 100));
    const passed = scorePercent >= (quiz.passing_score || 70);

    // Check external verified certificates for this student
    const certs = await db.allAsync(
      `SELECT * FROM certificates WHERE user_id = ? AND is_verified = 1 AND (LOWER(skill_name) LIKE ? OR LOWER(?) LIKE '%' || LOWER(skill_name) || '%')`,
      [userId, `%${quiz.skill_name.toLowerCase().split(' ')[0]}%`, quiz.skill_name.toLowerCase()]
    );
    const hasCert = certs.length > 0;
    const tierInfo = determineTutorTier(scorePercent, hasCert);

    // Save full response, negative marking results, and evaluation to quiz_attempts table
    const attemptId = 'att_' + Date.now();
    await db.runAsync(
      `INSERT INTO quiz_attempts (id, user_id, quiz_id, skill_name, total_questions, correct_count, wrong_count, unattempted_count, marks_obtained, max_marks, score_percent, passed, tier_awarded, user_answers_json, detailed_results_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attemptId,
        userId,
        quizId,
        quiz.skill_name,
        totalQuestions,
        correctCount,
        wrongCount,
        unattemptedCount,
        marksObtained,
        maxMarks,
        scorePercent,
        passed ? 1 : 0,
        tierInfo.tier,
        JSON.stringify(userAnswers),
        JSON.stringify(detailedResults)
      ]
    );

    if (isConnectedToSupabase && supabaseClient) {
      try {
        await supabaseClient.from('quiz_attempts').insert({
          id: attemptId,
          user_id: userId,
          quiz_id: quizId,
          skill_name: quiz.skill_name,
          total_questions: totalQuestions,
          correct_count: correctCount,
          wrong_count: wrongCount,
          unattempted_count: unattemptedCount,
          marks_obtained: marksObtained,
          max_marks: maxMarks,
          score_percent: scorePercent,
          passed: passed ? 1 : 0,
          tier_awarded: tierInfo.tier,
          user_answers_json: userAnswers,
          detailed_results_json: detailedResults
        });
      } catch (err) {
        console.warn('Supabase quiz attempt insert notice:', err.message);
      }
    }

    // If passed, run qualification check and bonus payout (+2.0 Credits)
    let qualificationResult = null;
    if (passed) {
      qualificationResult = await this.checkAndAwardCourseQualificationBonus(userId, quiz.skill_name);
    }

    return {
      success: true,
      attemptId,
      skillName: quiz.skill_name,
      totalQuestions,
      maxMarks,
      marksObtained,
      correctCount,
      wrongCount,
      unattemptedCount,
      scorePercent,
      passed,
      passingScore: quiz.passing_score || 70,
      tierInfo: qualificationResult?.tierInfo || tierInfo,
      hasCert,
      qualificationResult,
      qualificationBonusAwarded: qualificationResult?.bonusAwarded || false,
      bonusCredits: qualificationResult?.bonusAmount || 0,
      detailedResults
    };
  },

  async getOfferedSkills() {
    return await db.allAsync(`SELECT * FROM skills_offered ORDER BY created_at DESC`);
  },

  async getWantedSkills() {
    return await db.allAsync(`SELECT * FROM skills_wanted ORDER BY created_at DESC`);
  },

  async addSkillOffered(userId, data) {
    const id = 'sk_off_' + Date.now();
    const rate = Number(data.rate) || 1.0;
    const skillRoot = data.name.trim().toLowerCase().split(' ')[0];

    const bestAttempt = await db.getAsync(
      `SELECT MAX(score_percent) as max_score FROM quiz_attempts WHERE user_id = ? AND (LOWER(skill_name) LIKE ? OR LOWER(?) LIKE '%' || LOWER(skill_name) || '%') AND passed = 1`,
      [userId, `%${skillRoot}%`, data.name.trim().toLowerCase()]
    );
    const quizScore = bestAttempt?.max_score || 0;

    const cert = await db.getAsync(
      `SELECT * FROM certificates WHERE user_id = ? AND is_verified = 1 AND (LOWER(skill_name) LIKE ? OR LOWER(?) LIKE '%' || LOWER(skill_name) || '%')`,
      [userId, `%${skillRoot}%`, data.name.trim().toLowerCase()]
    );
    const hasCert = !!cert;
    const tierInfo = determineTutorTier(quizScore, hasCert);
    const effectiveRate = tierInfo.rate || rate;
    const effectiveTier = tierInfo.tier !== 'Unverified' ? tierInfo.tier : 'Standard';

    await db.runAsync(
      `INSERT INTO skills_offered (id, user_id, name, level, category, rate, tier, description, is_verified, quiz_score, cert_count, qualification_bonus_awarded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, userId, data.name, data.level || 'Intermediate', data.category || 'Tech', effectiveRate, effectiveTier, data.description || '', quizScore >= 70 ? 1 : 0, quizScore, hasCert ? 1 : 0]
    );

    // Evaluate qualification bonus (+2.0 Credits)
    const qualResult = await this.checkAndAwardCourseQualificationBonus(userId, data.name);

    return {
      id,
      user_id: userId,
      ...data,
      rate: qualResult?.tierInfo?.rate || effectiveRate,
      tier: qualResult?.tierInfo?.tier || effectiveTier,
      is_verified: quizScore >= 70 ? 1 : 0,
      quiz_score: quizScore,
      qualificationResult: qualResult,
      qualificationBonusAwarded: qualResult?.bonusAwarded || false,
      bonusCredits: qualResult?.bonusAmount || 0
    };
  },

  async addSkillWanted(userId, data) {
    const id = 'sk_want_' + Date.now();
    await db.runAsync(
      `INSERT INTO skills_wanted (id, user_id, name, level, category, goal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, data.name, data.level || 'Beginner', data.category || 'Tech', data.goal || '']
    );
    return { id, user_id: userId, ...data };
  },

  async getSessions() {
    const sessions = await db.allAsync(`SELECT * FROM sessions ORDER BY created_at DESC`);
    const attendees = await db.allAsync(`SELECT * FROM session_attendees ORDER BY joined_at ASC`);
    const users = await db.allAsync(`SELECT id, name, avatar FROM users`);
    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    return sessions.map(s => {
      const sessAttendees = attendees.filter(a => a.session_id === s.id);
      const teacher = userMap[s.teacher_id];
      const student = userMap[s.student_id];
      const isGroup = s.session_type === 'GROUP_COHORT';
      return {
        ...s,
        teacherName: teacher ? teacher.name : s.teacher_id,
        teacherAvatar: teacher ? (teacher.avatar || s.teacher_id) : s.teacher_id,
        studentName: isGroup ? `${sessAttendees.length} Students Enrolled` : (student ? student.name : s.student_id),
        enrolled_count: sessAttendees.length,
        attendees: sessAttendees
      };
    });
  },

  async createGroupCohortSession({ tutorId, skillName, topic, sessionDate, time, durationHours, maxCapacity, meetingLink }) {
    const hours = Number(durationHours) || 1;
    const capacity = Number(maxCapacity) || 10;
    // Live session rate is 1.0 Credit per attending student (1 student attended = 1 credit added)
    const rate = 1.0;
    const tutor = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [tutorId]);
    if (!tutor) throw new Error('Tutor not found');

    const sessionId = 'cohort_' + Date.now();
    await db.runAsync(
      `INSERT INTO sessions (id, teacher_id, student_id, skill, hours, rate, credits, session_type, max_capacity, rate_per_student, enrolled_count, total_earned_credits, date, time, status, topic, code_workspace)
       VALUES (?, ?, 'GROUP_COHORT', ?, ?, ?, 1.0, 'GROUP_COHORT', ?, ?, 0, 0.0, ?, ?, 'Confirmed', ?, ?)`,
      [sessionId, tutorId, skillName, hours, rate, capacity, rate, sessionDate || new Date().toISOString().split('T')[0], time || '11:00 AM', topic || `${skillName} Live Group Masterclass`, meetingLink || `https://meet.skillswap.edu/live-cohort-${sessionId}`]
    );

    return {
      success: true,
      sessionId,
      session: {
        id: sessionId,
        teacher_id: tutorId,
        teacherName: tutor.name,
        skill: skillName,
        hours,
        rate: 1.0,
        rate_per_student: 1.0,
        credits: 1.0,
        max_capacity: capacity,
        enrolled_count: 0,
        session_type: 'GROUP_COHORT',
        date: sessionDate || new Date().toISOString().split('T')[0],
        time: time || '11:00 AM',
        topic: topic || `${skillName} Live Group Masterclass`,
        status: 'Confirmed'
      }
    };
  },

  async enrollInCohortSession({ sessionId, studentId }) {
    const session = await db.getAsync(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
    if (!session) throw new Error('Live cohort session not found');
    if (session.status === 'Completed' || session.status === 'Cancelled') {
      throw new Error(`Cannot enroll: Session is ${session.status.toLowerCase()}`);
    }

    if (session.teacher_id === studentId) {
      throw new Error('Tutor cannot enroll as a student in their own masterclass');
    }

    // Check existing enrollment
    const existing = await db.getAsync(`SELECT * FROM session_attendees WHERE session_id = ? AND student_id = ?`, [sessionId, studentId]);
    if (existing) {
      return { success: true, message: 'Already enrolled in this live cohort', alreadyEnrolled: true, attendee: existing };
    }

    // Check capacity
    const currentAttendees = await db.allAsync(`SELECT * FROM session_attendees WHERE session_id = ?`, [sessionId]);
    if (currentAttendees.length >= (session.max_capacity || 10)) {
      throw new Error(`Cohort capacity reached (Max ${session.max_capacity} students)`);
    }

    const student = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [studentId]);
    if (!student) throw new Error('Student user not found');

    // For live cohort masterclasses: 1 student = 1.0 Credit (1 student attended -> 1 credit added)
    const requiredCredits = session.session_type === 'GROUP_COHORT' ? 1.0 : ((session.hours || 1) * (session.rate_per_student || session.rate || 1.0));
    if (student.credits < requiredCredits) {
      throw new Error(`Insufficient credits balance (${student.credits} Cr). Need ${requiredCredits} Cr to enroll.`);
    }

    // Lock credits in escrow
    await db.runAsync(
      `UPDATE users SET credits = ROUND(MAX(0, credits - ?), 2), escrow_locked = ROUND(escrow_locked + ?, 2) WHERE id = ?`,
      [requiredCredits, requiredCredits, studentId]
    );

    const attendeeId = 'att_' + Date.now();
    await db.runAsync(
      `INSERT INTO session_attendees (id, session_id, student_id, student_name, credits_locked, status)
       VALUES (?, ?, ?, ?, ?, 'ENROLLED')`,
      [attendeeId, sessionId, studentId, student.name, requiredCredits]
    );

    // Update session enrolled_count and credits
    const newCount = currentAttendees.length + 1;
    const newTotalCredits = (session.credits || 0) + requiredCredits;
    await db.runAsync(
      `UPDATE sessions SET enrolled_count = ?, credits = ? WHERE id = ?`,
      [newCount, newTotalCredits, sessionId]
    );

    // Record Escrow Transaction for Student
    const txId = 'tx_escrow_' + Date.now();
    await db.runAsync(
      `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
       VALUES (?, ?, ?, 'Escrow Hold', ?, ?, 'Locked in Escrow', ?)`,
      [txId, studentId, new Date().toISOString().split('T')[0], `Locked ${requiredCredits} Cr in escrow for Group Class: ${session.skill} (${session.hours}hr)`, -requiredCredits, session.teacher_id]
    );

    return {
      success: true,
      sessionId,
      studentId,
      creditsLocked: requiredCredits,
      enrolledCount: newCount,
      remainingCredits: student.credits - requiredCredits
    };
  },

  async getCohortAttendees(sessionId) {
    const attendees = await db.allAsync(
      `SELECT sa.*, u.avatar, u.major, u.role, u.college 
       FROM session_attendees sa
       JOIN users u ON sa.student_id = u.id
       WHERE sa.session_id = ?
       ORDER BY sa.joined_at ASC`,
      [sessionId]
    );
    return attendees;
  },

  async completeGroupCohortSession({ sessionId, tutorId, rating, comment, tags }) {
    const session = await db.getAsync(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
    if (!session) throw new Error('Live session not found');
    if (session.status === 'Completed') throw new Error('Session is already completed');
    if (session.teacher_id !== tutorId) {
      throw new Error('Only the host tutor can complete and claim credits for this cohort session');
    }

    const attendees = await db.allAsync(`SELECT * FROM session_attendees WHERE session_id = ? AND status = 'ENROLLED'`, [sessionId]);
    const studentCount = attendees.length;
    if (studentCount === 0) {
      await db.runAsync(`UPDATE sessions SET status = 'Completed', total_earned_credits = 0 WHERE id = ?`, [sessionId]);
      return { success: true, studentCount: 0, totalCreditsAwarded: 0 };
    }

    const totalPooledCredits = attendees.reduce((sum, a) => sum + Number(a.credits_locked), 0);
    const tutor = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [tutorId]);

    // 1. Release escrow from each attending student & record student Spent transactions
    for (const att of attendees) {
      await db.runAsync(
        `UPDATE users SET escrow_locked = ROUND(MAX(0, escrow_locked - ?), 2), lifetime_spent = ROUND(lifetime_spent + ?, 2) WHERE id = ?`,
        [att.credits_locked, att.credits_locked, att.student_id]
      );
      await db.runAsync(`UPDATE session_attendees SET status = 'ATTENDED' WHERE id = ?`, [att.id]);

      await db.runAsync(
        `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
         VALUES (?, ?, ?, 'Spent', ?, ?, 'Completed', ?)`,
        ['tx_sp_' + Date.now() + '_' + att.student_id, att.student_id, new Date().toISOString().split('T')[0], `Attended Group Masterclass: ${session.skill} taught by ${tutor ? tutor.name : tutorId}`, -att.credits_locked, tutor ? tutor.name : tutorId]
      );

      // Student review / rating
      await this.addReview({
        sessionId,
        learnerId: att.student_id,
        tutorId,
        rating: Number(rating) || 5.0,
        comment: comment || 'Awesome group masterclass! Learned practical skills.',
        tags: tags || ['Group Masterclass', 'Interactive Live Coding', 'Comprehensive']
      });
    }

    // 2. Credit tutor with full pooled earnings = N * Student Fee
    await db.runAsync(
      `UPDATE users SET credits = ROUND(credits + ?, 2), lifetime_earned = ROUND(lifetime_earned + ?, 2) WHERE id = ?`,
      [totalPooledCredits, totalPooledCredits, tutorId]
    );

    // 3. Mark session Completed
    await db.runAsync(
      `UPDATE sessions SET status = 'Completed', total_earned_credits = ?, credits = ? WHERE id = ?`,
      [totalPooledCredits, totalPooledCredits, sessionId]
    );

    // 4. Record Tutor Multi-Student Bounty Earned Transaction
    const txTutorId = 'tx_cohort_earn_' + Date.now();
    await db.runAsync(
      `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
       VALUES (?, ?, ?, 'Earned', ?, ?, 'Completed', ?)`,
      [txTutorId, tutorId, new Date().toISOString().split('T')[0], `Earned from teaching ${studentCount} students in Live Group Cohort: "${session.skill}" (${session.hours}hr @ ${session.rate_per_student || session.rate} Cr/student)`, totalPooledCredits, `${studentCount} Students Cohort`]
    );

    return {
      success: true,
      sessionId,
      studentCount,
      attendeeCount: studentCount,
      ratePerStudent: session.rate_per_student || session.rate,
      totalCreditsAwarded: totalPooledCredits,
      totalEarnedCredits: totalPooledCredits,
      tutorNewBalance: (tutor ? tutor.credits : 0) + totalPooledCredits
    };
  },

  async bookSessionEscrow({ learnerId, tutorId, skillName, sessionDate, durationHours, meetingLink }) {
    const hours = Number(durationHours) || 1;
    const skill = await db.getAsync(`SELECT * FROM skills_offered WHERE user_id = ? AND LOWER(name) LIKE ?`, [tutorId, `%${skillName.toLowerCase().split(' ')[0]}%`]);
    const rate = skill ? Number(skill.rate) : 1.0;
    const requiredCredits = hours * rate;

    const learner = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [learnerId]);
    if (!learner || learner.credits < requiredCredits) {
      throw new Error(`Insufficient credits balance (${learner ? learner.credits : 0} Cr). Need ${requiredCredits} Cr.`);
    }

    // Lock credits in escrow
    await db.runAsync(
      `UPDATE users SET credits = ROUND(MAX(0, credits - ?), 2), escrow_locked = ROUND(escrow_locked + ?, 2) WHERE id = ?`,
      [requiredCredits, requiredCredits, learnerId]
    );

    const sessionId = 'sess_' + Date.now();
    await db.runAsync(
      `INSERT INTO sessions (id, teacher_id, student_id, skill, hours, rate, credits, date, time, status, topic, code_workspace)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?)`,
      [sessionId, tutorId, learnerId, skillName, hours, rate, requiredCredits, sessionDate || '2026-09-12', '10:00 AM', `${skillName} Mentorship Session`, meetingLink]
    );

    // Record Escrow Transaction
    const txId = 'tx_' + Date.now();
    await db.runAsync(
      `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
       VALUES (?, ?, ?, 'Escrow Hold', ?, ?, 'Locked in Escrow', ?)`,
      [txId, learnerId, new Date().toISOString().split('T')[0], `Locked ${requiredCredits} Cr in escrow for ${hours}hr ${skillName} session`, -requiredCredits, tutorId]
    );

    return {
      success: true,
      sessionId,
      escrowLocked: requiredCredits,
      remainingCredits: learner.credits - requiredCredits
    };
  },

  async completeSessionAndReleaseEscrow({ sessionId, rating, comment, tags }) {
    const session = await db.getAsync(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
    if (!session) throw new Error('Session not found');
    if (session.status === 'Completed') throw new Error('Session is already completed');

    const learner = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [session.student_id]);
    const tutor = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [session.teacher_id]);

    const escrowCredits = session.credits;

    // Release escrow from learner and credit tutor
    await db.runAsync(
      `UPDATE users SET escrow_locked = ROUND(MAX(0, escrow_locked - ?), 2), lifetime_spent = ROUND(lifetime_spent + ?, 2) WHERE id = ?`,
      [escrowCredits, escrowCredits, session.student_id]
    );
    await db.runAsync(
      `UPDATE users SET credits = ROUND(credits + ?, 2), lifetime_earned = ROUND(lifetime_earned + ?, 2) WHERE id = ?`,
      [escrowCredits, escrowCredits, session.teacher_id]
    );

    await db.runAsync(`UPDATE sessions SET status = 'Completed' WHERE id = ?`, [sessionId]);

    // Record Completion Transactions
    await db.runAsync(
      `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
       VALUES (?, ?, ?, 'Spent', ?, ?, 'Completed', ?)`,
      ['tx_' + Date.now() + '_l', session.student_id, new Date().toISOString().split('T')[0], `Completed ${session.hours}hr ${session.skill} with ${tutor.name}`, -escrowCredits, tutor.name]
    );
    await db.runAsync(
      `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
       VALUES (?, ?, ?, 'Earned', ?, ?, 'Completed', ?)`,
      ['tx_' + Date.now() + '_t', session.teacher_id, new Date().toISOString().split('T')[0], `Earned from ${session.hours}hr ${session.skill} session with ${learner.name}`, escrowCredits, learner.name]
    );

    // Save Student Review
    await this.addReview({
      sessionId,
      learnerId: session.student_id,
      tutorId: session.teacher_id,
      rating,
      comment,
      tags
    });

    return { success: true, releasedCredits: escrowCredits };
  },

  async cancelSessionAndRefundEscrow({ sessionId, reason }) {
    const session = await db.getAsync(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
    if (!session) throw new Error('Session not found');

    const escrowCredits = session.credits;
    // Refund learner
    await db.runAsync(
      `UPDATE users SET credits = ROUND(credits + ?, 2), escrow_locked = ROUND(MAX(0, escrow_locked - ?), 2) WHERE id = ?`,
      [escrowCredits, escrowCredits, session.student_id]
    );
    await db.runAsync(`UPDATE sessions SET status = 'Cancelled' WHERE id = ?`, [sessionId]);

    return { success: true, refundedCredits: escrowCredits };
  },

  async getTransactions() {
    return await db.allAsync(`SELECT * FROM transactions ORDER BY created_at DESC`);
  },

  async getTransactionsByUser(userId) {
    return await db.allAsync(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  },

  async getReviews() {
    const revs = await db.allAsync(`SELECT * FROM reviews ORDER BY created_at DESC`);
    return revs.map(r => ({
      ...r,
      tags: JSON.parse(r.tags_json || '[]')
    }));
  },

  async addReview({ sessionId, learnerId, tutorId, rating, comment, tags }) {
    const learner = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [learnerId]);
    const revId = 'rev_' + Date.now();
    await db.runAsync(
      `INSERT INTO reviews (id, session_id, target_user_id, reviewer_name, reviewer_avatar, skill, rating, comment, tags_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [revId, sessionId || null, tutorId, learner ? learner.name : 'Student', learner ? learner.avatar : 'student', 'Skill Swap', Number(rating) || 5, comment || 'Great mentor!', JSON.stringify(tags || [])]
    );

    // Recalculate average rating & reviews count
    const stats = await db.getAsync(`SELECT AVG(rating) as avg_rating, COUNT(*) as rev_count FROM reviews WHERE target_user_id = ?`, [tutorId]);
    if (stats) {
      await db.runAsync(
        `UPDATE users SET rating = ?, reviews_count = ? WHERE id = ?`,
        [Number(Number(stats.avg_rating || 5.0).toFixed(2)), stats.rev_count || 0, tutorId]
      );
    }

    return { success: true, reviewId: revId };
  },

  async getAttemptsByUser(userId) {
    const attempts = await db.allAsync(`SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY attempted_at DESC, id DESC`, [userId]);
    return attempts.map(a => ({
      ...a,
      user_answers: JSON.parse(a.user_answers_json || '{}'),
      detailed_results: JSON.parse(a.detailed_results_json || '[]')
    }));
  },

  async getCertificates(userId) {
    if (userId) {
      return await db.allAsync(`SELECT * FROM certificates WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
    }
    return await db.allAsync(`SELECT * FROM certificates ORDER BY created_at DESC`);
  },

  async uploadCertificate(userId, data) {
    const authority = data.authority || data.issuer || 'NPTEL (IIT Madras / Kharagpur)';
    const credentialId = data.credentialId || data.certificateId;
    const skillName = data.skillName;
    const title = data.title || `${skillName} Certification`;
    const scoreOrGrade = data.scoreOrGrade || (data.verificationScore ? `Score: ${data.verificationScore}%` : '');
    const fileName = data.fileName;
    const fileData = data.fileData;

    const user = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [userId]);

    // Check rejection history
    const previousRejection = await db.getAsync(
      `SELECT * FROM rejected_certificates WHERE (credential_id = ? AND credential_id != '' AND credential_id != 'N/A') OR (user_id = ? AND title = ? AND file_name = ?)`,
      [credentialId, userId, title, fileName]
    );

    // 1. Run rigorous 7-step AI verification analysis
    const aiReport = analyzeAndVerifyCertificate({
      recipientName: data.recipientName || user?.name || 'Student',
      skillName,
      title,
      authority,
      issuer: data.issuer || authority,
      credentialId,
      scoreOrGrade,
      issueDate: data.issueDate,
      verificationUrl: data.verificationUrl,
      fileName,
      fileData,
      userContext: user || {},
      previousRejection,
      isResubmission: !!previousRejection
    });

    const isReal = aiReport.result === 'REAL';
    const isFake = aiReport.result === 'FAKE';
    const isNeedsManual = aiReport.result === 'NEEDS MANUAL VERIFICATION';

    // Log verification audit trail
    try {
      await db.runAsync(
        `INSERT INTO certificate_verifications (id, user_id, credential_id, skill_name, result, confidence, ai_report_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['verif_' + Date.now() + '_' + Math.floor(Math.random() * 1000), userId, credentialId || 'N/A', skillName || 'General', aiReport.result, aiReport.confidence, JSON.stringify(aiReport)]
      );
    } catch (e) {}

    // 2. Reject if classified as FAKE
    if (isFake) {
      try {
        if (previousRejection) {
          await db.runAsync(
            `UPDATE rejected_certificates SET attempt_count = attempt_count + 1, rejection_reason = ?, ai_report_json = ?, rejected_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [aiReport.reason, JSON.stringify(aiReport), previousRejection.id]
          );
        } else {
          await db.runAsync(
            `INSERT INTO rejected_certificates (id, user_id, credential_id, skill_name, authority, title, score_or_grade, file_name, rejection_reason, ai_report_json, attempt_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            ['rej_' + Date.now() + '_' + Math.floor(Math.random() * 1000), userId, credentialId || 'N/A', skillName, authority, title, scoreOrGrade, fileName, aiReport.reason, JSON.stringify(aiReport)]
          );
        }
      } catch (e) {}

      return {
        success: false,
        result: 'FAKE',
        aiReport,
        error: aiReport.reason || 'Verification Failed: The certificate is invalid, altered, or unrecognized by the Academic Verification Authority.',
        trustScore: parseInt(aiReport.confidence, 10) || 10
      };
    }

    // Check duplicate registration by other users
    if (credentialId && credentialId !== 'N/A') {
      const existingOtherUserCert = await db.getAsync(
        `SELECT * FROM certificates WHERE credential_id = ? AND user_id != ?`,
        [credentialId, userId]
      );
      if (existingOtherUserCert) {
        return {
          success: false,
          result: 'FAKE',
          aiReport: {
            ...aiReport,
            result: 'FAKE',
            confidence: 99,
            suspicious_elements: [`Credential ID (${credentialId}) is already registered to another student in the platform depository`],
            reason: `Verification Failed: Duplicate Credential ID. This certificate is already registered to another student account in the platform depository.`
          },
          error: `Verification Failed: Duplicate Credential ID. This certificate is already registered to another student account in the platform depository.`
        };
      }
    }

    // 3. Handle NEEDS MANUAL VERIFICATION (Queue for faculty admin review, 0 credits for now)
    const certId = 'cert_' + Date.now();
    const finalAuthority = aiReport.issuer || authority;
    const finalCredentialId = aiReport.certificate_id || credentialId;
    const finalScoreOrGrade = scoreOrGrade || 'Grade Verified';
    const finalProof = aiReport.reason;

    if (isNeedsManual) {
      await db.runAsync(
        `INSERT INTO certificates (id, user_id, skill_name, authority, title, credential_id, credential_url, score_or_grade, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [certId, userId, skillName, finalAuthority, title, finalCredentialId, aiReport.verification_url || data.credentialUrl || 'https://skillswap.edu/verify/manual-audit', finalScoreOrGrade]
      );

      // Notify Faculty Admin
      await db.runAsync(
        `INSERT INTO notifications (id, user_id, title, message, time, is_unread, type)
         VALUES (?, 'faculty_admin', '📋 Certificate Queued for Manual Faculty Review', ?, 'Just now', 1, 'admin')`,
        [
          'notif_admin_cert_' + Date.now(),
          `Student ${user ? user.name : userId} uploaded "${title}" (${finalAuthority}). Automated API is inconclusive; queued for Dr. S. K. Rao's manual validation.`
        ]
      );

      const updatedUser = await this.getUserById(userId);
      return {
        success: true,
        result: 'NEEDS MANUAL VERIFICATION',
        isPendingManualReview: true,
        aiReport,
        certId,
        certificate: {
          id: certId,
          user_id: userId,
          skill_name: skillName,
          authority: finalAuthority,
          title,
          credential_id: finalCredentialId,
          score_or_grade: finalScoreOrGrade,
          is_verified: 0
        },
        user: updatedUser,
        message: 'Certificate uploaded and queued for Faculty Administrator manual audit (Dr. S. K. Rao).'
      };
    }

    // 4. Handle REAL: Insert verified certificate into database & award merit credits (+2.0 Cr)
    await db.runAsync(
      `INSERT INTO certificates (id, user_id, skill_name, authority, title, credential_id, credential_url, score_or_grade, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [certId, userId, skillName, finalAuthority, title, finalCredentialId, aiReport.verification_url || data.credentialUrl || 'https://nptel.ac.in', finalScoreOrGrade]
    );

    // Evaluate and award course qualification bonus (+2.0 Cr)
    let qualResult = await this.checkAndAwardCourseQualificationBonus(userId, skillName);
    
    let bonusAwarded = qualResult?.bonusAwarded || false;
    let bonusAmount = qualResult?.bonusAmount || 0;

    if (!bonusAwarded) {
      const existingCertTx = await db.getAsync(
        `SELECT * FROM transactions WHERE user_id = ? AND description LIKE ?`,
        [userId, `%${finalCredentialId}%`]
      );

      if (!existingCertTx) {
        bonusAwarded = true;
        bonusAmount = 2.0;

        // Deposit +2.0 Credits into Mentor's Wallet
        await db.runAsync(
          `UPDATE users SET credits = ROUND(credits + ?, 2), lifetime_earned = ROUND(lifetime_earned + ?, 2) WHERE id = ?`,
          [bonusAmount, bonusAmount, userId]
        );

        // Record in transactions (user's isolated audit log)
        const txId = 'tx_cert_' + Date.now();
        await db.runAsync(
          `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
           VALUES (?, ?, ?, 'Course Qualification Bonus', ?, ?, 'Completed', 'SkillSwap Hub')`,
          [
            txId,
            userId,
            new Date().toISOString().split('T')[0],
            `Earned +2.0 Credits for uploading verified authentic certificate: "${title}" (${finalAuthority}) [ID: ${finalCredentialId}]`,
            bonusAmount
          ]
        );

        // Send notification
        await db.runAsync(
          `INSERT INTO notifications (id, user_id, title, message, time, is_unread, type)
           VALUES (?, ?, '🎉 +2.0 Credits Earned: Certificate Verified!', ?, 'Just now', 1, 'badge')`,
          [
            'notif_cert_' + Date.now(),
            userId,
            `Congratulations! Your authentic certificate "${title}" (${finalAuthority}) has been verified. +2.0 Skill Credits deposited into your wallet!`
          ]
        );

        // Update user badge if applicable
        if (user) {
          let badges = JSON.parse(user.badges_json || '[]');
          if (!badges.some(b => b.includes('Advanced Tutor') || b.includes('Elite Master'))) {
            badges = badges.filter(b => !b.includes('Tutor'));
            badges.push('🎖️ Advanced Tutor');
            await db.runAsync(`UPDATE users SET badges_json = ? WHERE id = ?`, [JSON.stringify(badges), userId]);
          }
        }
      }
    }

    const updatedUser = await this.getUserById(userId);

    return {
      success: true,
      result: 'REAL',
      aiReport,
      certId,
      certificate: {
        id: certId,
        user_id: userId,
        skill_name: skillName,
        authority: finalAuthority,
        title,
        credential_id: finalCredentialId,
        score_or_grade: finalScoreOrGrade,
        is_verified: 1
      },
      verificationProof: finalProof,
      logoVerified: true,
      logoDetails: aiReport.evidence.find(e => e.includes('emblem') || e.includes('watermark')) || 'Official Institutional Seal & Security Watermark Verified',
      authorizedBy: finalAuthority,
      tierInfo: qualResult?.tierInfo || { tier: 'Advanced', badge: '🎖️ Advanced Tutor', rate: 2.0 },
      qualificationBonusAwarded: bonusAwarded,
      bonusCredits: bonusAmount,
      user: updatedUser,
      message: `✓ Authentic Certificate Verified (${finalAuthority})! Official Logo, Seal & Digital Watermark confirmed. +${bonusAmount || 2.0} Skill Credits deposited into your wallet!`
    };
  },

  async addCertificate(data) {
    return await this.uploadCertificate(data.userId, data);
  },

  /**
   * Course Qualification & Listing Bonus:
   * When a mentor lists a course to tutor with verified Quiz (>= 70%) AND Certificate,
   * they earn +2.0 Skill Credits into their wallet.
   */
  async checkAndAwardCourseQualificationBonus(userId, skillName) {
    if (!userId || !skillName) return null;

    const normalizedSkill = skillName.trim();
    const rootWord = normalizedSkill.toLowerCase().split(' ')[0];

    // Find course listing
    const skill = await db.getAsync(
      `SELECT * FROM skills_offered WHERE user_id = ? AND (LOWER(name) = ? OR LOWER(name) LIKE ? OR LOWER(?) LIKE '%' || LOWER(name) || '%')`,
      [userId, normalizedSkill.toLowerCase(), `%${rootWord}%`, normalizedSkill.toLowerCase()]
    );

    // Check quiz attempts
    const bestAttempt = await db.getAsync(
      `SELECT MAX(score_percent) as max_score FROM quiz_attempts WHERE user_id = ? AND (LOWER(skill_name) = ? OR LOWER(skill_name) LIKE ? OR LOWER(?) LIKE '%' || LOWER(skill_name) || '%') AND passed = 1`,
      [userId, normalizedSkill.toLowerCase(), `%${rootWord}%`, normalizedSkill.toLowerCase()]
    );
    const quizScore = Math.max(skill?.quiz_score || 0, bestAttempt?.max_score || 0);
    const isQuizPassed = quizScore >= 70;

    // Check verified certificates
    const cert = await db.getAsync(
      `SELECT * FROM certificates WHERE user_id = ? AND is_verified = 1 AND (LOWER(skill_name) = ? OR LOWER(skill_name) LIKE ? OR LOWER(?) LIKE '%' || LOWER(skill_name) || '%')`,
      [userId, normalizedSkill.toLowerCase(), `%${rootWord}%`, normalizedSkill.toLowerCase()]
    );
    const hasCert = !!cert;

    const tierInfo = determineTutorTier(quizScore, hasCert);
    const isQualified = isQuizPassed && hasCert;

    let bonusAwarded = false;
    const bonusAmount = 2.0;

    if (isQualified && skill && (!skill.qualification_bonus_awarded || skill.qualification_bonus_awarded === 0)) {
      // Check if bonus transaction already exists
      const existingTx = await db.getAsync(
        `SELECT * FROM transactions WHERE user_id = ? AND type = 'Course Qualification Bonus' AND description LIKE ?`,
        [userId, `%${skill.name}%`]
      );

      if (!existingTx) {
        bonusAwarded = true;

        // 1. Mark qualification bonus awarded in skills_offered
        await db.runAsync(
          `UPDATE skills_offered 
           SET qualification_bonus_awarded = 1, is_verified = 1, quiz_score = ?, tier = ?, rate = ?, cert_count = cert_count + 1
           WHERE id = ?`,
          [quizScore, tierInfo.tier, tierInfo.rate, skill.id]
        );

        // 2. Deposit +2.0 Credits into Mentor's Wallet
        await db.runAsync(
          `UPDATE users 
           SET credits = ROUND(credits + ?, 2), lifetime_earned = ROUND(lifetime_earned + ?, 2)
           WHERE id = ?`,
          [bonusAmount, bonusAmount, userId]
        );

        // 3. Insert transaction record
        const txId = 'tx_qual_' + Date.now();
        await db.runAsync(
          `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
           VALUES (?, ?, ?, 'Course Qualification Bonus', ?, ?, 'Completed', 'SkillSwap Hub')`,
          [
            txId,
            userId,
            new Date().toISOString().split('T')[0],
            `Earned +2.0 Credits for listing and qualifying to tutor "${skill.name}" with verified Certificate (${cert.authority}) + Quiz Distinction (${quizScore}%)`,
            bonusAmount
          ]
        );

        // 4. Send notification
        await db.runAsync(
          `INSERT INTO notifications (id, user_id, title, message, time, is_unread, type)
           VALUES (?, ?, '🎉 +2.0 Credits Earned: Course Listing Qualified!', ?, 'Just now', 1, 'badge')`,
          [
            'notif_bonus_' + Date.now(),
            userId,
            `Congratulations! Your course listing "${skill.name}" is qualified with Quiz (${quizScore}%) + Certificate (${cert.authority}). +2.0 Skill Credits deposited into your wallet! Tutor Tier: ${tierInfo.tier} (${tierInfo.rate} Cr/hr).`
          ]
        );

        // 5. Upgrade user badges
        const user = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [userId]);
        if (user) {
          let badges = JSON.parse(user.badges_json || '[]');
          badges = badges.filter(b => !b.includes('Tutor') && !b.includes('Bronze') && !b.includes('Silver') && !b.includes('Advanced') && !b.includes('Elite'));
          badges.push(tierInfo.badge);
          await db.runAsync(`UPDATE users SET badges_json = ? WHERE id = ?`, [JSON.stringify(badges), userId]);
        }
      }
    } else if (skill) {
      await db.runAsync(
        `UPDATE skills_offered 
         SET quiz_score = ?, tier = ?, rate = ?, is_verified = ?
         WHERE id = ?`,
        [quizScore, tierInfo.tier, tierInfo.rate, isQuizPassed ? 1 : 0, skill.id]
      );
    }

    return {
      isQualified,
      isQuizPassed,
      hasCert,
      quizScore,
      certificate: cert,
      tierInfo,
      bonusAwarded,
      bonusAmount: bonusAwarded ? bonusAmount : 0
    };
  }
};

module.exports = {
  supabaseClient,
  dbProvider,
  supabaseService: dbProvider,
  determineTutorTier,
  initSupabase
};
