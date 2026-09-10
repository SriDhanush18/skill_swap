const { createClient } = require('@supabase/supabase-js');
const { db } = require('./db');
const { generate20DynamicQuestions } = require('../services/aiQuizGenerator');
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

  async getUsers() {
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
      return data;
    }

    const users = await db.allAsync(`SELECT * FROM users WHERE is_admin = 0`);
    for (const u of users) {
      u.badges = JSON.parse(u.badges_json || '[]');
      u.skillsOffered = await db.allAsync(`SELECT * FROM skills_offered WHERE user_id = ?`, [u.id]);
      u.skillsWanted = await db.allAsync(`SELECT * FROM skills_wanted WHERE user_id = ?`, [u.id]);
      u.certificates = await db.allAsync(`SELECT * FROM certificates WHERE user_id = ?`, [u.id]);
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

      user.badges = typeof user.badges_json === 'string' ? JSON.parse(user.badges_json) : (user.badges_json || []);
      user.skillsOffered = so || [];
      user.skillsWanted = sw || [];
      user.certificates = certs || [];
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
    for (const r of user.reviews) {
      r.tags = JSON.parse(r.tags_json || '[]');
    }
    return user;
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
    const quizzes = await db.allAsync(`SELECT * FROM quizzes`);
    for (const q of quizzes) {
      q.questionsCount = 20; // 20 AI dynamic questions
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
      const userSelected = userAnswers[qKey];

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

    // If passed, update tutor course tier & rate
    if (passed) {
      await db.runAsync(
        `UPDATE skills_offered 
         SET is_verified = 1, quiz_score = ?, tier = ?, rate = ?
         WHERE user_id = ? AND LOWER(name) LIKE ?`,
        [scorePercent, tierInfo.tier, tierInfo.rate, userId, `%${quiz.skill_name.toLowerCase().split(' ')[0]}%`]
      );

      const user = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [userId]);
      if (user) {
        let badges = JSON.parse(user.badges_json || '[]');
        badges = badges.filter(b => !b.includes('Tutor') && !b.includes('Bronze') && !b.includes('Silver') && !b.includes('Advanced') && !b.includes('Elite'));
        badges.push(tierInfo.badge);
        await db.runAsync(`UPDATE users SET badges_json = ? WHERE id = ?`, [JSON.stringify(badges), userId]);
      }
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
      tierInfo,
      hasCert,
      detailedResults
    };
  },

  async getCertificates(userId) {
    return await db.allAsync(`SELECT * FROM certificates WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  },

  async addCertificate(data) {
    const { userId, skillName, authority, title, credentialId, credentialUrl, scoreOrGrade } = data;
    const certId = 'cert_' + Date.now();
    await db.runAsync(
      `INSERT INTO certificates (id, user_id, skill_name, authority, title, credential_id, credential_url, score_or_grade, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [certId, userId, skillName, authority, title, credentialId || 'N/A', credentialUrl || 'https://vignan.ac.in', scoreOrGrade || 'Verified Passing Grade']
    );

    const skill = await db.getAsync(`SELECT * FROM skills_offered WHERE user_id = ? AND LOWER(name) LIKE ?`, [userId, `%${skillName.toLowerCase().split(' ')[0]}%`]);
    const quizScore = skill ? (skill.quiz_score || 80) : 80;
    const tierInfo = determineTutorTier(quizScore, true);

    if (skill) {
      await db.runAsync(
        `UPDATE skills_offered SET tier = ?, rate = ?, cert_count = cert_count + 1 WHERE id = ?`,
        [tierInfo.tier, tierInfo.rate, skill.id]
      );
    }

    const user = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (user) {
      let badges = JSON.parse(user.badges_json || '[]');
      const certBadge = `${authority} Certified`;
      if (!badges.includes(certBadge)) badges.push(certBadge);
      badges = badges.filter(b => !b.includes('Tutor') && !b.includes('Bronze') && !b.includes('Silver') && !b.includes('Advanced') && !b.includes('Elite'));
      badges.push(tierInfo.badge);
      await db.runAsync(`UPDATE users SET badges_json = ? WHERE id = ?`, [JSON.stringify(badges), userId]);
    }

    return { success: true, certId, tierInfo };
  }
};

module.exports = {
  supabaseClient,
  dbProvider,
  determineTutorTier,
  initSupabase
};
