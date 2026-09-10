-- ============================================================================
-- SkillSwap Platform: Production Supabase PostgreSQL Relational Schema
-- Engineered for Vignan University Peer-to-Peer Skill Banking
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS skills_wanted CASCADE;
DROP TABLE IF EXISTS skills_offered CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'MENTOR', 'FACULTY_ADMIN', 'SUPER_ADMIN')),
    name TEXT NOT NULL,
    college TEXT NOT NULL DEFAULT 'Vignan University',
    major TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    credits NUMERIC(10, 2) NOT NULL DEFAULT 3.00,
    escrow_locked NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    lifetime_earned NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    lifetime_spent NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    badges_json JSONB DEFAULT '[]'::jsonb,
    is_admin INTEGER NOT NULL DEFAULT 0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 2. SKILLS OFFERED TABLE (With 4 Tutor Categories & Hourly Rates)
-- ============================================================================
CREATE TABLE skills_offered (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'Intermediate',
    category TEXT NOT NULL DEFAULT 'Tech',
    rate NUMERIC(3, 1) NOT NULL DEFAULT 1.0, -- 1.0 (Bronze), 1.5 (Silver), 2.0 (Advanced), 2.5 (Elite Master)
    tier TEXT NOT NULL DEFAULT 'Standard',
    description TEXT,
    is_verified INTEGER NOT NULL DEFAULT 0,
    quiz_score INTEGER NOT NULL DEFAULT 0,
    cert_count INTEGER NOT NULL DEFAULT 0,
    qualification_bonus_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 3. SKILLS WANTED TABLE (Target Learning Goals)
-- ============================================================================
CREATE TABLE skills_wanted (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'Beginner',
    category TEXT NOT NULL DEFAULT 'Tech',
    goal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 4. AUTHORIZED CERTIFICATES TABLE (NPTEL, Coursera, AWS, HackerRank)
-- ============================================================================
CREATE TABLE certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    authority TEXT NOT NULL, -- e.g. 'NPTEL Elite+Gold', 'Coursera', 'AWS Certified'
    title TEXT NOT NULL,
    credential_id TEXT,
    credential_url TEXT,
    score_or_grade TEXT,
    is_verified INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 5. QUIZZES & QUESTIONS TABLES
-- ============================================================================
CREATE TABLE quizzes (
    id TEXT PRIMARY KEY,
    skill_name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    passing_score INTEGER NOT NULL DEFAULT 70,
    time_limit_minutes INTEGER NOT NULL DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE quiz_questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    code_snippet TEXT,
    options_json JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    explanation TEXT
);

-- ============================================================================
-- 6. QUIZ ATTEMPTS TABLE (Negative Marking: +3 Correct, -1 Wrong, 0 Unattempted)
-- ============================================================================
CREATE TABLE quiz_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 20,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    unattempted_count INTEGER NOT NULL DEFAULT 0,
    marks_obtained NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    max_marks INTEGER NOT NULL DEFAULT 60,
    score_percent INTEGER NOT NULL,
    passed INTEGER NOT NULL DEFAULT 0,
    tier_awarded TEXT,
    user_answers_json JSONB DEFAULT '{}'::jsonb,
    detailed_results_json JSONB DEFAULT '[]'::jsonb,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 7. SESSIONS TABLE (With Multi-Student Group Cohorts & Escrow Locking)
-- ============================================================================
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    hours INTEGER NOT NULL DEFAULT 1,
    rate NUMERIC(3, 1) NOT NULL DEFAULT 1.0,
    credits NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    session_type TEXT NOT NULL DEFAULT 'ONE_ON_ONE', -- 'ONE_ON_ONE' or 'GROUP_COHORT'
    max_capacity INTEGER NOT NULL DEFAULT 10,
    rate_per_student NUMERIC(3, 1) NOT NULL DEFAULT 1.0,
    enrolled_count INTEGER NOT NULL DEFAULT 0,
    total_earned_credits NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmed', -- 'Pending', 'Confirmed', 'Live', 'Completed', 'Cancelled'
    topic TEXT,
    code_workspace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 7b. SESSION ATTENDEES TABLE (N-Student Roster for Group Live Cohorts)
-- ============================================================================
CREATE TABLE session_attendees (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    credits_locked NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'ENROLLED', -- 'ENROLLED', 'ATTENDED', 'REFUNDED'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 8. TRANSACTIONS TABLE (Time-Banking Credit Ledger)
-- ============================================================================
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Earned', 'Spent', 'Escrow Hold', 'Escrow Refund', 'Welcome Bonus'
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Completed', -- 'Completed', 'Locked in Escrow', 'Refunded'
    student_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 9. REVIEWS TABLE (Student Feedback & Ratings)
-- ============================================================================
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_name TEXT NOT NULL,
    reviewer_avatar TEXT,
    skill TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    tags_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 10. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    time TEXT NOT NULL,
    is_unread INTEGER NOT NULL DEFAULT 1,
    type TEXT NOT NULL DEFAULT 'match', -- 'match', 'badge', 'session', 'system'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 11. MESSAGES TABLE
-- ============================================================================
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    time TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX idx_skills_offered_user ON skills_offered(user_id);
CREATE INDEX idx_skills_offered_category ON skills_offered(category);
CREATE INDEX idx_skills_wanted_user ON skills_wanted(user_id);
CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_skill ON quiz_attempts(skill_name);
CREATE INDEX idx_sessions_teacher ON sessions(teacher_id);
CREATE INDEX idx_sessions_student ON sessions(student_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_reviews_target_user ON reviews(target_user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_messages_pair ON messages(sender_id, receiver_id);

-- ============================================================================
-- AUTOMATED TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function: Automatically recalculate average rating and reviews count in users table
CREATE OR REPLACE FUNCTION update_user_rating_on_review()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET 
        rating = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews
            WHERE target_user_id = NEW.target_user_id
        ), 5.00),
        reviews_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE target_user_id = NEW.target_user_id
        ),
        updated_at = NOW()
    WHERE id = NEW.target_user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rating_after_review
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_user_rating_on_review();

-- ============================================================================
-- 13. LOGIN AUDIT & HISTORY TABLE
-- ============================================================================
CREATE TABLE login_history (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL,
    failure_reason TEXT,
    auth_method TEXT DEFAULT 'PASSWORD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 14. SUPPORT TEAM & DOUBT CLASSIFICATION TICKETS TABLE
-- ============================================================================
CREATE TABLE support_tickets (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    skill_name TEXT NOT NULL,
    eligibility_proof TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    code_snippet TEXT,
    issue_type TEXT NOT NULL,
    reward_credits NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED')),
    support_mentor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    support_mentor_name TEXT,
    mentor_classification TEXT,
    mentor_solution TEXT,
    recommended_assessment_skill TEXT,
    attachment_name TEXT,
    attachment_data TEXT,
    rating INTEGER,
    feedback TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for public/authenticated access
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_offered ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_wanted ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Public Read & Write Policies for Demo/Platform Environment
CREATE POLICY "Public Read Users" ON users FOR SELECT USING (true);
CREATE POLICY "Public Update Users" ON users FOR UPDATE USING (true);
CREATE POLICY "Public Read Skills Offered" ON skills_offered FOR SELECT USING (true);
CREATE POLICY "Public Insert Skills Offered" ON skills_offered FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Skills Wanted" ON skills_wanted FOR SELECT USING (true);
CREATE POLICY "Public Insert Skills Wanted" ON skills_wanted FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Certificates" ON certificates FOR SELECT USING (true);
CREATE POLICY "Public Insert Certificates" ON certificates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Public Read Quiz Questions" ON quiz_questions FOR SELECT USING (true);
CREATE POLICY "Public Read Quiz Attempts" ON quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Public Insert Quiz Attempts" ON quiz_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Public Insert Sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Public Read Transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Public Insert Transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public Insert Reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Public Update Notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Public Read Messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Public Insert Messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Login History" ON login_history FOR SELECT USING (true);
CREATE POLICY "Public Insert Login History" ON login_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Support Tickets" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "Public Insert Support Tickets" ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Support Tickets" ON support_tickets FOR UPDATE USING (true);


