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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

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
}

module.exports = {
  db,
  initSchema
};
