-- ============================================================================
-- SkillSwap Platform - Supabase PostgreSQL Schema & Seed Script
-- Merit-Based Tutor Tier & Certification System (NPTEL, Coursera, AWS)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- 1. Users
CREATE TABLE users (
    id TEXT PRIMARY KEY,
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
    is_admin INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Skills Offered with Merit Tiers & Dynamic Rates
CREATE TABLE skills_offered (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'Intermediate',
    category TEXT NOT NULL DEFAULT 'Tech',
    rate NUMERIC(3, 1) NOT NULL DEFAULT 1.0,
    tier TEXT DEFAULT 'Standard',
    description TEXT,
    is_verified INTEGER DEFAULT 0,
    quiz_score INTEGER DEFAULT 0,
    cert_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Skills Wanted
CREATE TABLE skills_wanted (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'Beginner',
    category TEXT NOT NULL DEFAULT 'Tech',
    goal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Authorized Certificates (NPTEL, Coursera, AWS, HackerRank)
CREATE TABLE certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    authority TEXT NOT NULL,
    title TEXT NOT NULL,
    credential_id TEXT,
    credential_url TEXT,
    score_or_grade TEXT,
    is_verified INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Quizzes & Questions
CREATE TABLE quizzes (
    id TEXT PRIMARY KEY,
    skill_name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    passing_score INTEGER NOT NULL DEFAULT 70,
    time_limit_minutes INTEGER NOT NULL DEFAULT 5
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

-- 6. Quiz Attempts (Tracks dynamic 20-question responses, negative marking +3/-1/0, and percentage grades)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 20,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  unattempted_count INTEGER NOT NULL DEFAULT 0,
  marks_obtained NUMERIC NOT NULL DEFAULT 0,
  max_marks INTEGER NOT NULL DEFAULT 60,
  score_percent INTEGER NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  tier_awarded TEXT,
  user_answers_json TEXT,
  detailed_results_json TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Sessions (With Tiered Dynamic Credit Escrow)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES users(id),
    student_id TEXT NOT NULL REFERENCES users(id),
    skill TEXT NOT NULL,
    hours INTEGER NOT NULL DEFAULT 1,
    rate NUMERIC(3, 1) NOT NULL DEFAULT 1.0,
    credits NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmed',
    topic TEXT,
    code_workspace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Transactions & Reviews & Messages & Notifications
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL,
    student_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_name TEXT NOT NULL,
    reviewer_avatar TEXT,
    skill TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    comment TEXT,
    tags_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id),
    receiver_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    time TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    time TEXT NOT NULL,
    is_unread INTEGER DEFAULT 1,
    type TEXT NOT NULL DEFAULT 'match',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SEED DATA
INSERT INTO users (id, name, college, major, avatar, bio, credits, escrow_locked, lifetime_earned, lifetime_spent, rating, reviews_count, badges_json, is_admin)
VALUES 
('sri', 'Sri Dhanush', 'Vignan University', 'B.Tech CSE (3rd Year, 1st Sem)', 'sri', 'B.Tech CSE student at Vignan. NPTEL Elite+Gold certified in Python & DSA. Passionate about Machine Learning & OOP. Looking to swap for UI/UX Figma and React frontend.', 4.00, 0.00, 8.00, 4.00, 4.96, 14, '["Vignan Student", "🥇 Elite Master Mentor", "NPTEL Elite+Gold", "⚡ Fast Responder", "Certified Pythonista"]'::jsonb, 0),
('rishitha', 'Rishitha', 'Vignan University', 'B.Tech IT (3rd Year)', 'rishitha', 'UI/UX enthusiast and Figma Pro. Google / Coursera UX Design Professional Certified. I craft accessible design tokens and responsive prototypes. Swapping for Python OOP & ML.', 4.00, 0.00, 10.00, 6.00, 4.98, 18, '["🥇 Elite Master Mentor", "Coursera Google UX", "Figma Pro", "Vignan Student", "100% On-Time"]'::jsonb, 0),
('bharath', 'Bharath', 'Vignan University', 'B.Tech CSE (4th Year)', 'bharath', 'Fullstack developer. AWS Certified Developer & HackerRank 5-Star Gold. Mentoring students in React.js, Next.js, and Node.js REST APIs.', 6.00, 0.00, 18.00, 12.00, 4.92, 24, '["🥇 Elite Master Mentor", "AWS Certified", "HackerRank 5-Star", "Verified Senior"]'::jsonb, 0),
('pujitha', 'Pujitha', 'Vignan University', 'B.Tech AI & Data Science (3rd Year)', 'pujitha', 'Data science & analytics passionate. NPTEL DBMS Silver Certified & PowerBI Specialist. Seeking mentorship in Flutter mobile apps and Figma UI.', 3.00, 0.00, 7.00, 4.00, 4.86, 9, '["🥈 Advanced Certified", "NPTEL DBMS Silver", "Data Wizard", "SQL Certified"]'::jsonb, 0),
('taman', 'Taman', 'Vignan University', 'B.Tech Cyber Security / CSE (3rd Year)', 'taman', 'Cyber security and Linux enthusiast. CompTIA Security+ / CEH Practical & Linux Professional Certified. Experienced in network reconnaissance & OWASP.', 3.00, 0.00, 6.00, 3.00, 4.88, 8, '["🥈 Advanced Certified", "CompTIA Security+", "Linux Guru", "Verified Mentor"]'::jsonb, 0),
('admin', 'Dr. S. K. Rao', 'Vignan University', 'Faculty Coordinator & Platform Admin', 'admin', 'Department of CSE Faculty Coordinator overseeing university peer-to-peer skill exchanges, NPTEL/Coursera certificate verification, and quiz moderation.', 999.00, 0.00, 100.00, 0.00, 5.00, 50, '["University Admin", "Faculty Lead", "Cert Validator"]'::jsonb, 1);

INSERT INTO certificates (id, user_id, skill_name, authority, title, credential_id, credential_url, score_or_grade, is_verified)
VALUES
('cert_sri_1', 'sri', 'Python Core & OOP', 'NPTEL (IIT Madras)', 'Programming, Data Structures & Algorithms using Python', 'NPTEL23CS108S4491028', 'https://nptel.ac.in/noc/E_Certificate/NPTEL23CS108S4491028', 'Elite + Gold (94% - Top 1% in India)', 1),
('cert_sri_2', 'sri', 'Machine Learning Basics', 'Coursera (DeepLearning.AI)', 'Machine Learning Specialization by Andrew Ng', 'COURSERA-ML-8829471', 'https://coursera.org/verify/COURSERA-ML-8829471', 'Grade: 98.4%', 1),
('cert_rish_1', 'rishitha', 'UI/UX Design & Figma', 'Coursera (Google)', 'Google UX Design Professional Certificate', 'GGL-UX-9912048', 'https://coursera.org/verify/professional-cert/GGL-UX-9912048', 'Distinction (Honor Roll)', 1),
('cert_bha_1', 'bharath', 'React.js Frontend', 'AWS / Amazon', 'AWS Certified Developer - Associate', 'AWS-DEV-7729104', 'https://aws.amazon.com/verification/AWS-DEV-7729104', 'Score: 890/1000', 1),
('cert_puj_1', 'pujitha', 'SQL & Database Design', 'NPTEL (IIT Kharagpur)', 'Database Management System Concepts & Design', 'NPTEL24CS55S219034', 'https://nptel.ac.in/noc/E_Certificate/NPTEL24CS55S219034', 'Elite + Silver (84%)', 1),
('cert_tam_1', 'taman', 'Cyber Security & Ethical Hacking', 'CompTIA', 'CompTIA Security+ (SY0-601)', 'COMP-SEC-441029', 'https://comptia.org/verify/COMP-SEC-441029', 'Certified Security Specialist', 1);

INSERT INTO skills_offered (id, user_id, name, level, category, rate, tier, description, is_verified, quiz_score, cert_count)
VALUES
('sk_sri_1', 'sri', 'Python Core & OOP', 'Advanced', 'Tech', 2.0, 'Elite Master', 'Variables, OOPs, Data Structures, File I/O, scripting and problem-solving.', 1, 95, 1),
('sk_sri_2', 'sri', 'Data Structures & Algorithms', 'Intermediate', 'Tech', 1.5, 'Advanced Certified', 'Arrays, Linked Lists, Trees, Stacks, Queues with Python implementations.', 1, 90, 1),
('sk_sri_3', 'sri', 'Machine Learning Basics', 'Intermediate', 'Tech', 2.0, 'Elite Master', 'Scikit-Learn, Regression, Classification models, and NumPy/Pandas pipelines.', 1, 88, 1),
('sk_rish_1', 'rishitha', 'UI/UX Design & Figma', 'Expert', 'Design', 2.0, 'Elite Master', 'Auto-layout, design tokens, responsive grids, and high-fidelity prototyping in Figma.', 1, 98, 1),
('sk_rish_2', 'rishitha', 'Tailwind & Design Systems', 'Advanced', 'Design', 1.5, 'Advanced Certified', 'Translating Figma designs into accessible CSS layouts, component tokens, and responsive utilities.', 1, 94, 0),
('sk_bha_1', 'bharath', 'React.js Frontend', 'Expert', 'Tech', 2.5, 'Elite Master', 'React Hooks, State management, custom hooks, React Router, and API integrations.', 1, 92, 1),
('sk_bha_2', 'bharath', 'Node.js & Express APIs', 'Advanced', 'Tech', 2.0, 'Elite Master', 'REST architecture, JWT auth, middleware, and database connections.', 1, 90, 0),
('sk_puj_1', 'pujitha', 'SQL & Database Design', 'Advanced', 'Tech', 1.5, 'Advanced Certified', 'Complex joins, indexing, query optimization, and relational schema design.', 1, 95, 1),
('sk_puj_2', 'pujitha', 'Pandas & Data Viz', 'Intermediate', 'Tech', 1.0, 'Standard', 'Data cleaning, aggregation, Seaborn, Matplotlib, and PowerBI dashboards.', 1, 88, 0),
('sk_tam_1', 'taman', 'Cyber Security & Ethical Hacking', 'Advanced', 'Tech', 1.5, 'Advanced Certified', 'Reconnaissance, Nmap, Wireshark, vulnerability scanning, and OWASP Top 10.', 1, 92, 1),
('sk_tam_2', 'taman', 'Linux System Administration', 'Advanced', 'Tech', 1.5, 'Advanced Certified', 'Bash scripting, permissions, process management, SSH keys, and firewall setups.', 1, 90, 0);

INSERT INTO skills_wanted (id, user_id, name, level, category, goal)
VALUES
('skw_sri_1', 'sri', 'UI/UX Design & Figma', 'Beginner', 'Design', 'Design modern web app prototypes and wireframes'),
('skw_sri_2', 'sri', 'React.js Frontend', 'Beginner', 'Tech', 'Build component-based responsive single page apps'),
('skw_rish_1', 'rishitha', 'Python Core & OOP', 'Beginner', 'Tech', 'Automate data tasks and understand backend scripting'),
('skw_rish_2', 'rishitha', 'Machine Learning Basics', 'Beginner', 'Tech', 'Learn AI fundamentals and Python ML models'),
('skw_bha_1', 'bharath', 'Docker & Kubernetes', 'Beginner', 'Cloud', 'Learn containerization and microservice orchestration'),
('skw_puj_1', 'pujitha', 'UI/UX Design & Figma', 'Beginner', 'Design', 'Create modern dashboard mockups before coding'),
('skw_puj_2', 'pujitha', 'Flutter App Development', 'Beginner', 'Tech', 'Build cross-platform mobile apps'),
('skw_tam_1', 'taman', 'React.js Frontend', 'Beginner', 'Tech', 'Build interactive security dashboard web interfaces');
