/**
 * SkillSwap Platform - Sync Local SQLite Database to Supabase PostgreSQL Cloud
 * 
 * Usage:
 * 1. Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file
 * 2. Run: node backend/database/sync_sqlite_to_supabase.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const { db } = require('./db');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log(`
========================================================================
ℹ️ SUPABASE CLOUD SYNC READY
========================================================================
To sync your local SQLite data to Supabase:
1. Create a project at https://supabase.com
2. Run the DDL script in Supabase SQL Editor:
   backend/database/supabase_schema.sql
3. Add your credentials to .env:
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-or-service-role-key
4. Re-run: node backend/database/sync_sqlite_to_supabase.js
========================================================================
`);
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncTable(tableName, rows) {
  if (!rows || rows.length === 0) return;
  console.log(`⏳ Syncing ${rows.length} records into "${tableName}"...`);
  const { data, error } = await supabase.from(tableName).upsert(rows);
  if (error) {
    console.error(`❌ Error syncing "${tableName}":`, error.message);
  } else {
    console.log(`✅ Successfully synced "${tableName}".`);
  }
}

async function syncAll() {
  console.log(`\n🚀 Starting Local SQLite ➜ Supabase Cloud Database Synchronization...\n`);

  try {
    // 1. Users
    const users = await db.allAsync(`SELECT * FROM users`);
    const formattedUsers = users.map(u => ({
      ...u,
      badges_json: JSON.parse(u.badges_json || '[]')
    }));
    await syncTable('users', formattedUsers);

    // 2. Skills Offered
    const skillsOffered = await db.allAsync(`SELECT * FROM skills_offered`);
    await syncTable('skills_offered', skillsOffered);

    // 3. Skills Wanted
    const skillsWanted = await db.allAsync(`SELECT * FROM skills_wanted`);
    await syncTable('skills_wanted', skillsWanted);

    // 4. Certificates
    const certs = await db.allAsync(`SELECT * FROM certificates`);
    await syncTable('certificates', certs);

    // 5. Quizzes
    const quizzes = await db.allAsync(`SELECT * FROM quizzes`);
    await syncTable('quizzes', quizzes);

    // 6. Quiz Attempts
    const attempts = await db.allAsync(`SELECT * FROM quiz_attempts`);
    const formattedAttempts = attempts.map(a => ({
      ...a,
      user_answers_json: JSON.parse(a.user_answers_json || '{}'),
      detailed_results_json: JSON.parse(a.detailed_results_json || '[]')
    }));
    await syncTable('quiz_attempts', formattedAttempts);

    // 7. Sessions
    const sessions = await db.allAsync(`SELECT * FROM sessions`);
    await syncTable('sessions', sessions);

    // 8. Transactions
    const transactions = await db.allAsync(`SELECT * FROM transactions`);
    await syncTable('transactions', transactions);

    // 9. Reviews
    const reviews = await db.allAsync(`SELECT * FROM reviews`);
    const formattedReviews = reviews.map(r => ({
      ...r,
      tags_json: JSON.parse(r.tags_json || '[]')
    }));
    await syncTable('reviews', formattedReviews);

    // 10. Notifications
    const notifs = await db.allAsync(`SELECT * FROM notifications`);
    await syncTable('notifications', notifs);

    // 11. Messages
    const msgs = await db.allAsync(`SELECT * FROM messages`);
    await syncTable('messages', msgs);

    console.log(`\n🎉 All 11 tables successfully synchronized to Supabase Cloud!\n`);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
  } finally {
    process.exit(0);
  }
}

syncAll();
