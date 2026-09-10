const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'skillswap.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening SQLite database:', err.message);
  } else {
    console.log('✅ SQLite database connected at:', DB_PATH);
  }
});

// Promisified helper methods for clean async/await
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function initSchema() {
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      name TEXT NOT NULL,
      college TEXT NOT NULL,
      major TEXT NOT NULL,
      avatar TEXT,
      bio TEXT,
      credits REAL NOT NULL DEFAULT 3.0,
      escrow_locked REAL NOT NULL DEFAULT 0.0,
      lifetime_earned REAL NOT NULL DEFAULT 0.0,
      lifetime_spent REAL NOT NULL DEFAULT 0.0,
      rating REAL NOT NULL DEFAULT 5.0,
      reviews_count INTEGER NOT NULL DEFAULT 0,
      badges_json TEXT,
      is_admin INTEGER DEFAULT 0,
      last_login_at DATETIME,
      login_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Safe column additions for existing databases
  try { await db.runAsync(`ALTER TABLE users ADD COLUMN last_login_at DATETIME`); } catch (e) {}
  try { await db.runAsync(`ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0`); } catch (e) {}

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS skills_offered (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      rate REAL NOT NULL DEFAULT 1.0,
      tier TEXT DEFAULT 'Standard',
      description TEXT,
      is_verified INTEGER DEFAULT 0,
      quiz_score INTEGER DEFAULT 0,
      cert_count INTEGER DEFAULT 0,
      qualification_bonus_awarded INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  try { await db.runAsync(`ALTER TABLE skills_offered ADD COLUMN qualification_bonus_awarded INTEGER DEFAULT 0`); } catch (e) {}

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS skills_wanted (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      goal TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      authority TEXT NOT NULL,
      title TEXT NOT NULL,
      credential_id TEXT,
      credential_url TEXT,
      score_or_grade TEXT,
      is_verified INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS rejected_certificates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credential_id TEXT,
      skill_name TEXT,
      authority TEXT,
      title TEXT,
      score_or_grade TEXT,
      file_name TEXT,
      rejection_reason TEXT,
      ai_report_json TEXT,
      attempt_count INTEGER DEFAULT 1,
      rejected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS certificate_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credential_id TEXT,
      skill_name TEXT,
      result TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      ai_report_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      skill_name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      passing_score INTEGER NOT NULL DEFAULT 70,
      time_limit_minutes INTEGER NOT NULL DEFAULT 5
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      question TEXT NOT NULL,
      code_snippet TEXT,
      options_json TEXT NOT NULL,
      correct_option_index INTEGER NOT NULL,
      explanation TEXT,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      quiz_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      total_questions INTEGER NOT NULL DEFAULT 20,
      correct_count INTEGER NOT NULL DEFAULT 0,
      wrong_count INTEGER NOT NULL DEFAULT 0,
      unattempted_count INTEGER NOT NULL DEFAULT 0,
      marks_obtained REAL NOT NULL DEFAULT 0,
      max_marks INTEGER NOT NULL DEFAULT 60,
      score_percent INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      tier_awarded TEXT,
      user_answers_json TEXT,
      detailed_results_json TEXT,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      skill TEXT NOT NULL,
      hours INTEGER NOT NULL,
      rate REAL NOT NULL DEFAULT 1.0,
      credits REAL NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Confirmed',
      topic TEXT,
      code_workspace TEXT,
      session_type TEXT DEFAULT 'ONE_ON_ONE',
      max_capacity INTEGER DEFAULT 10,
      rate_per_student REAL DEFAULT 1.0,
      enrolled_count INTEGER DEFAULT 0,
      total_earned_credits REAL DEFAULT 0.0,
      zoom_meeting_id TEXT,
      zoom_meeting_password TEXT,
      zoom_join_url TEXT,
      zoom_start_url TEXT,
      zoom_meeting_created INTEGER DEFAULT 0,
      meeting_started_at DATETIME,
      meeting_ended_at DATETIME,
      meeting_session_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id),
      FOREIGN KEY (student_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      student_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      target_user_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_avatar TEXT,
      skill TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      tags_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (target_user_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      text TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      time TEXT NOT NULL,
      is_unread INTEGER DEFAULT 1,
      type TEXT NOT NULL DEFAULT 'match',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS login_history (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT,
      role TEXT,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT NOT NULL,
      failure_reason TEXT,
      auth_method TEXT DEFAULT 'PASSWORD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      session_id TEXT,
      skill_name TEXT NOT NULL,
      eligibility_proof TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      code_snippet TEXT,
      issue_type TEXT NOT NULL,
      reward_credits REAL NOT NULL DEFAULT 1.0,
      status TEXT NOT NULL DEFAULT 'OPEN',
      support_mentor_id TEXT,
      support_mentor_name TEXT,
      mentor_classification TEXT,
      mentor_solution TEXT,
      recommended_assessment_skill TEXT,
      attachment_name TEXT,
      attachment_data TEXT,
      rating INTEGER,
      feedback TEXT,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (support_mentor_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS session_attendees (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      credits_locked REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'ENROLLED',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (student_id) REFERENCES users(id)
    )
  `);

  // Migrations for existing database instances
  try {
    await db.runAsync(`ALTER TABLE support_tickets ADD COLUMN attachment_name TEXT`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE support_tickets ADD COLUMN attachment_data TEXT`);
  } catch (e) { /* column already exists */ }

  // Migrations for group cohort sessions
  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN session_type TEXT DEFAULT 'ONE_ON_ONE'`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN max_capacity INTEGER DEFAULT 10`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN rate_per_student REAL DEFAULT 1.0`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN enrolled_count INTEGER DEFAULT 0`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN total_earned_credits REAL DEFAULT 0.0`);
  } catch (e) { /* column already exists */ }

  // Migrations for Zoom & Real-Time Live Video Sessions
  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN zoom_meeting_id TEXT`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN zoom_meeting_password TEXT`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN zoom_join_url TEXT`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN zoom_start_url TEXT`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN zoom_meeting_created INTEGER DEFAULT 0`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN meeting_started_at DATETIME`);
  } catch (e) { /* column already exists */ }

  try {
    await db.runAsync(`ALTER TABLE sessions ADD COLUMN meeting_ended_at DATETIME`);
  } catch (e) { /* column already exists */ }

  // Dedicated Shared Doubts and Answers Tables
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS support_doubts (
      id TEXT PRIMARY KEY,
      raised_by_user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      course TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      code_snippet TEXT,
      attachment_url TEXT,
      attachment_name TEXT,
      attachment_data TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      accepted_by_user_id TEXT,
      accepted_at DATETIME,
      resolved_at DATETIME,
      reward_credits REAL NOT NULL DEFAULT 1.5,
      rating INTEGER,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (raised_by_user_id) REFERENCES users(id),
      FOREIGN KEY (accepted_by_user_id) REFERENCES users(id)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS support_answers (
      id TEXT PRIMARY KEY,
      doubt_id TEXT NOT NULL,
      answered_by_user_id TEXT NOT NULL,
      answer_text TEXT NOT NULL,
      classification TEXT,
      attachment_url TEXT,
      attachment_name TEXT,
      attachment_data TEXT,
      recommended_assessment_skill TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doubt_id) REFERENCES support_doubts(id),
      FOREIGN KEY (answered_by_user_id) REFERENCES users(id)
    )
  `);

  // Migrate any tickets to support_doubts if support_doubts is empty
  try {
    const doubtsCount = await db.getAsync(`SELECT COUNT(*) as count FROM support_doubts`);
    if (doubtsCount && doubtsCount.count === 0) {
      await db.runAsync(`
        INSERT OR IGNORE INTO support_doubts (id, raised_by_user_id, category, course, title, description, code_snippet, attachment_name, attachment_data, status, accepted_by_user_id, accepted_at, resolved_at, reward_credits, rating, feedback, created_at)
        SELECT id, student_id, skill_name, skill_name, title, description, code_snippet, attachment_name, attachment_data, status, support_mentor_id, 
               CASE WHEN support_mentor_id IS NOT NULL THEN created_at ELSE NULL END,
               resolved_at, reward_credits, rating, feedback, created_at
        FROM support_tickets
      `);

      // Also migrate any solutions to support_answers
      await db.runAsync(`
        INSERT OR IGNORE INTO support_answers (id, doubt_id, answered_by_user_id, answer_text, classification, recommended_assessment_skill, created_at)
        SELECT 'ans_' || id, id, support_mentor_id, mentor_solution, mentor_classification, recommended_assessment_skill, resolved_at
        FROM support_tickets
        WHERE status = 'RESOLVED' AND support_mentor_id IS NOT NULL AND mentor_solution IS NOT NULL
      `);
    }
  } catch (e) {
    console.warn('Doubts migration notice:', e.message);
  }
}

module.exports = {
  db,
  initSchema
};
