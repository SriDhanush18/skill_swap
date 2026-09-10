-- ============================================================================
-- SkillSwap Platform: Production Supabase Seed Script
-- 4 Tutor Categories, Verified Certificates, Ratings, and Negative Marking Attempts
-- ============================================================================

-- 1. SEED USERS WITH ROLES & AUTH (STUDENT & ADMIN)
INSERT INTO users (id, email, password_hash, role, name, college, major, avatar, bio, credits, escrow_locked, lifetime_earned, lifetime_spent, rating, reviews_count, badges_json, is_admin)
VALUES 
('sri', 'sri@vignan.ac.in', '$2a$08$wVnFvKz0617L9lF2tBvVyejK6vXw3tJ4nZ2nJ8bB0yF1oJ3wL7g9q', 'STUDENT', 'Sri Dhanush', 'Vignan University', 'B.Tech CSE (3rd Year, 1st Sem)', 'sri', 'B.Tech CSE student at Vignan. NPTEL Elite+Gold (94%) certified in Python. Passionate about Machine Learning & OOP. Swapping for UI/UX Figma and React frontend.', 4.00, 0.00, 8.00, 4.00, 4.95, 14, '["Vignan Student", "🥇 Elite Master Tutor", "NPTEL Elite+Gold", "⚡ Fast Responder"]'::jsonb, 0),
('rishitha', 'rishitha@vignan.ac.in', '$2a$08$wVnFvKz0617L9lF2tBvVyejK6vXw3tJ4nZ2nJ8bB0yF1oJ3wL7g9q', 'STUDENT', 'Rishitha K.', 'Vignan University', 'B.Tech IT (3rd Year)', 'rishitha', 'Specializing in UI/UX wireframing, Design Systems, and Figma auto-layout. Coursera certified UX designer. Keen to master Python algorithms and Data Structures.', 5.00, 0.00, 10.00, 5.00, 4.92, 12, '["Vignan Student", "🎖️ Advanced Tutor", "Coursera UX Certified", "🌟 Top Rated Tutor"]'::jsonb, 0),
('bharath', 'bharath@vignan.ac.in', '$2a$08$wVnFvKz0617L9lF2tBvVyejK6vXw3tJ4nZ2nJ8bB0yF1oJ3wL7g9q', 'STUDENT', 'Bharath Varma', 'Vignan University', 'B.Tech CSE (4th Year)', 'bharath', 'Full Stack MERN Developer. Built 4 production college portals. Scored 95% distinction in React assessment. Looking for UI/UX Figma & cloud deployment guidance.', 3.50, 0.00, 6.00, 2.50, 4.88, 8, '["Vignan Student", "🥈 Silver Tutor", "React Architect", "🏆 95% Quiz Distinction"]'::jsonb, 0),
('pujitha', 'pujitha@vignan.ac.in', '$2a$08$wVnFvKz0617L9lF2tBvVyejK6vXw3tJ4nZ2nJ8bB0yF1oJ3wL7g9q', 'STUDENT', 'Pujitha Reddy', 'Vignan University', 'B.Tech AI & Data Science (2nd Year)', 'pujitha', 'Database enthusiast, SQL query optimization, and schema normal forms. Passed qualification assessment. Looking to learn React frontend & Python OOP.', 3.00, 0.00, 3.00, 0.00, 4.80, 5, '["Vignan Student", "🥉 Bronze Tutor", "SQL Practitioner", "🌱 Rising Talent"]'::jsonb, 0),
('taman', 'taman@vignan.ac.in', '$2a$08$wVnFvKz0617L9lF2tBvVyejK6vXw3tJ4nZ2nJ8bB0yF1oJ3wL7g9q', 'STUDENT', 'Taman S.', 'Vignan University', 'B.Tech ECE (3rd Year)', 'taman', 'Competitive programmer with strong C++ and Python fundamentals. Passionate about AI models. Learning Web development from seniors.', 2.00, 0.00, 1.00, 2.00, 5.00, 2, '["Vignan Student", "C++ Specialist", "Python Coder"]'::jsonb, 0),
('admin', 'skrao@vignan.ac.in', '$2a$08$wVnFvKz0617L9lF2tBvVyejK6vXw3tJ4nZ2nJ8bB0yF1oJ3wL7g9q', 'ADMIN', 'Dr. S. K. Rao', 'Vignan University', 'Faculty Coordinator (CSE Dept)', 'admin', 'Department coordinator supporting student peer-to-peer learning, career roadmap reviews, and academic projects.', 999.00, 0.00, 0.00, 0.00, 5.00, 50, '["University Admin", "Faculty Lead", "Cert Validator"]'::jsonb, 1)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    college = EXCLUDED.college,
    rating = EXCLUDED.rating,
    reviews_count = EXCLUDED.reviews_count,
    badges_json = EXCLUDED.badges_json;

-- 2. SEED SKILLS OFFERED
INSERT INTO skills_offered (id, user_id, name, level, category, rate, tier, description, is_verified, quiz_score, cert_count)
VALUES
('sk_off_1', 'sri', 'Python Core & OOP', 'Advanced', 'Tech', 2.5, 'Elite Master', 'Master Object-Oriented Python, C3 MRO, generators, and data structures with an NPTEL Elite+Gold holder.', 1, 94, 1),
('sk_off_2', 'rishitha', 'Figma & Design Systems', 'Advanced', 'Design', 2.0, 'Advanced', 'Hands-on UI/UX design with Auto-layout, Variants, and WCAG AA accessibility tokens with a Coursera certified designer.', 1, 88, 1),
('sk_off_3', 'bharath', 'React.js & State Management', 'Advanced', 'Tech', 1.5, 'Silver', 'Learn React Hooks (useEffect, useMemo), Context API, and state optimization from a 95% Quiz Distinction scorer.', 1, 95, 0),
('sk_off_4', 'pujitha', 'SQL Database Design & Indexing', 'Intermediate', 'Tech', 1.0, 'Bronze', 'SQL query optimization, indexes, normalization, and relational schema modeling.', 1, 80, 0),
('sk_off_5', 'taman', 'C++ Data Structures & STL', 'Intermediate', 'Tech', 1.0, 'Bronze', 'Pointers, memory management, STL containers (vectors, maps, sets), and algorithmic problem-solving.', 1, 75, 0)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED SKILLS WANTED
INSERT INTO skills_wanted (id, user_id, name, level, category, goal)
VALUES
('sk_want_1', 'sri', 'Figma UI/UX Design', 'Intermediate', 'Design', 'Wants to design beautiful mobile mockups and responsive design tokens for portfolio apps.'),
('sk_want_2', 'sri', 'React.js Frontend', 'Beginner', 'Tech', 'Wants to learn functional components and state hooks to build dynamic web UIs.'),
('sk_want_3', 'rishitha', 'Python Core & OOP', 'Intermediate', 'Tech', 'Wants to write automated Python data processing scripts for design research.'),
('sk_want_4', 'bharath', 'UI/UX Wireframing', 'Beginner', 'Design', 'Wants to learn Figma auto-layout and UI wireframing to design better client apps.'),
('sk_want_5', 'pujitha', 'React.js Frontend', 'Beginner', 'Tech', 'Wants to connect SQL backend APIs to React client components.')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED AUTHORIZED CERTIFICATES
INSERT INTO certificates (id, user_id, skill_name, authority, title, credential_id, credential_url, score_or_grade, is_verified)
VALUES
('cert_1', 'sri', 'Python Core & OOP', 'NPTEL Elite+Gold', 'Programming, Data Structures And Algorithms Using Python', 'NPTEL24CS98S12450091', 'https://nptel.ac.in/noc/Ecertificate/?q=NPTEL24CS98S12450091', '94% (Elite + Gold Medal)', 1),
('cert_2', 'rishitha', 'Figma & Design Systems', 'Coursera', 'Google UX Design Professional Certificate', 'COURSERA-UX-992144', 'https://coursera.org/verify/professional-cert/COURSERA-UX-992144', 'Grade: 98.4%', 1)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED QUIZZES
INSERT INTO quizzes (id, skill_name, category, title, passing_score, time_limit_minutes)
VALUES
('quiz_py_01', 'Python Core & OOP', 'Tech', 'Python Core & OOP Qualification Assessment', 70, 15),
('quiz_fig_01', 'Figma & Design Systems', 'Design', 'UI/UX & Figma Design Assessment', 70, 15),
('quiz_react_01', 'React.js & State Management', 'Tech', 'React.js Frontend Architecture Assessment', 70, 15)
ON CONFLICT (id) DO NOTHING;

-- 6. SEED SESSIONS WITH CREDIT ESCROW
INSERT INTO sessions (id, teacher_id, student_id, skill, hours, rate, credits, date, time, status, topic, code_workspace)
VALUES
('sess_01', 'sri', 'rishitha', 'Python Core & OOP', 2, 2.5, 5.00, '2026-09-10', '10:00 AM - 12:00 PM', 'Confirmed', 'Python OOP Inheritance & Magic Methods', 'https://github.com/vignan/peer-python-workspace'),
('sess_02', 'rishitha', 'sri', 'Figma & Design Systems', 2, 2.0, 4.00, '2026-09-11', '02:00 PM - 04:00 PM', 'Confirmed', 'Figma Auto-Layout & Design Tokens for Mobile App', 'https://figma.com/file/vignan-skillswap-tokens'),
('sess_03', 'bharath', 'sri', 'React.js & State Management', 1, 1.5, 1.50, '2026-08-20', '03:00 PM - 04:00 PM', 'Completed', 'React useEffect and Custom Hooks in Practice', 'https://codesandbox.io/s/react-vignan-demo')
ON CONFLICT (id) DO NOTHING;

-- 7. SEED TRANSACTIONS (SEPARATED PER PROFILE)
INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
VALUES
-- Sri Dhanush
('tx_sri_101', 'sri', '2026-08-22', 'Welcome Grant', 'Vignan University Sign-Up Bonus Credits', 3.00, 'Completed', 'Vignan System'),
('tx_sri_102', 'sri', '2026-08-23', 'Taught Session', 'Taught 2 hrs Python OOP to Rishitha (Elite Master @ 2.5 Cr/hr)', 5.00, 'Completed', 'Rishitha K.'),
('tx_sri_103', 'sri', '2026-08-24', 'Learned Session', 'Learned 2 hrs React Components from Bharath', -4.00, 'Completed', 'Bharath Varma'),
('tx_sri_104', 'sri', '2026-08-25', 'Course Qualification Bonus', '2.0 Bonus Credits awarded for passing Python Core & OOP qualification assessment', 2.00, 'Completed', 'AI Academic Council'),
('tx_sri_105', 'sri', '2026-08-26', 'Support Resolution Bounty', 'Support Desk bounty for classifying and solving Python recursion doubt', 2.00, 'Completed', 'Academic Support Desk'),
-- Rishitha
('tx_rish_201', 'rishitha', '2026-08-22', 'Welcome Grant', 'Vignan University Sign-Up Bonus Credits', 3.00, 'Completed', 'Vignan System'),
('tx_rish_202', 'rishitha', '2026-08-23', 'Taught Session', 'Taught 2 hrs UI/UX Figma Design to Sri Dhanush (Elite Master @ 2.5 Cr/hr)', 5.00, 'Completed', 'Sri Dhanush'),
('tx_rish_203', 'rishitha', '2026-08-23', 'Learned Session', 'Learned 2 hrs Python OOP from Sri Dhanush', -5.00, 'Completed', 'Sri Dhanush'),
('tx_rish_204', 'rishitha', '2026-08-24', 'Taught Session', 'Taught 1 hr Tailwind & Design Systems to Pujitha', 2.00, 'Completed', 'Pujitha Reddy'),
('tx_rish_205', 'rishitha', '2026-08-25', 'Course Qualification Bonus', '2.0 Bonus Credits awarded for UI/UX Design & Figma qualification', 2.00, 'Completed', 'AI Academic Council'),
-- Bharath
('tx_bha_301', 'bharath', '2026-08-20', 'Welcome Grant', 'Vignan University Sign-Up Bonus Credits', 3.00, 'Completed', 'Vignan System'),
('tx_bha_302', 'bharath', '2026-08-24', 'Taught Session', 'Taught 2 hrs React.js Frontend to Sri Dhanush (Elite Master @ 2.5 Cr/hr)', 5.00, 'Completed', 'Sri Dhanush'),
('tx_bha_303', 'bharath', '2026-08-25', 'Taught Session', 'Taught 2 hrs Node.js REST APIs to Taman (Bronze @ 1.0 Cr/hr)', 2.00, 'Completed', 'Taman S.'),
('tx_bha_304', 'bharath', '2026-08-25', 'Learned Session', 'Learned 2 hrs Cloud Architecture from Senior Mentor', -4.00, 'Completed', 'Senior Cloud Mentor'),
-- Pujitha
('tx_puj_401', 'pujitha', '2026-08-21', 'Welcome Grant', 'Vignan University Sign-Up Bonus Credits', 3.00, 'Completed', 'Vignan System'),
('tx_puj_402', 'pujitha', '2026-08-23', 'Taught Session', 'Taught 2 hrs SQL Database Design & Indexing to Taman (Advanced @ 2.0 Cr/hr)', 4.00, 'Completed', 'Taman S.'),
('tx_puj_403', 'pujitha', '2026-08-24', 'Learned Session', 'Learned 1 hr Design Systems from Rishitha', -2.00, 'Completed', 'Rishitha K.'),
-- Taman
('tx_tam_501', 'taman', '2026-08-21', 'Welcome Grant', 'Vignan University Sign-Up Bonus Credits', 3.00, 'Completed', 'Vignan System'),
('tx_tam_502', 'taman', '2026-08-23', 'Learned Session', 'Learned 2 hrs SQL Database Design from Pujitha', -4.00, 'Completed', 'Pujitha Reddy'),
('tx_tam_503', 'taman', '2026-08-24', 'Taught Session', 'Taught 2 hrs Linux System Administration & Bash to Peers', 3.00, 'Completed', 'Junior CSE Peers'),
-- Admin
('tx_adm_901', 'admin', '2026-08-01', 'System Grant', 'Faculty Admin Treasury Allocation for Discretionary Grants', 999.00, 'Completed', 'Vignan University Central Treasury')
ON CONFLICT (id) DO NOTHING;

-- 8. SEED REVIEWS
INSERT INTO reviews (id, session_id, target_user_id, reviewer_name, reviewer_avatar, skill, rating, comment, tags_json)
VALUES
('rev_01', 'sess_03', 'sri', 'Rishitha K.', 'rishitha', 'Python Core & OOP', 5, 'Sri explained Python C3 MRO and generators with crystal clear visual diagrams! Worth every credit.', '["Patient Tutor", "Great Code Snippets", "NPTEL Certified Expert", "Clear Explanations"]'::jsonb),
('rev_02', 'sess_03', 'sri', 'Bharath Varma', 'bharath', 'Python Core & OOP', 5, 'Fantastic mentor. Helped me debug complex OOP multiple inheritance issues in minutes.', '["Deep Domain Knowledge", "Punctual", "Practical Examples"]'::jsonb),
('rev_03', 'sess_03', 'rishitha', 'Sri Dhanush', 'sri', 'Figma & Design Systems', 5, 'Rishitha taught me Auto-layout wrapping and component variants. Highly recommended UI mentor!', '["Creative Designer", "Easy to Understand", "High Quality Tokens"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 9. SEED NOTIFICATIONS
INSERT INTO notifications (id, user_id, title, message, time, is_unread, type)
VALUES
('notif_01', 'sri', '🎉 Elite Master Tutor Unlocked!', 'You scored distinction on the 20-Q Python assessment and linked your NPTEL Gold certificate. Hourly rate boosted to 2.5 Credits/hr.', 'Just now', 1, 'badge'),
('notif_02', 'sri', '⚡ Perfect Peer Match Found!', 'Rishitha K. wants to learn Python Core & OOP and offers Figma & Design Systems.', '15m ago', 1, 'match'),
('notif_03', 'sri', '📅 Session Confirmed', 'Your 2-hour session with Rishitha is confirmed for 2026-09-10. 5.0 Credits locked in escrow.', '1h ago', 0, 'session')
ON CONFLICT (id) DO NOTHING;

-- 10. SEED MESSAGES
INSERT INTO messages (id, sender_id, receiver_id, text, time)
VALUES
('msg_01', 'rishitha', 'sri', 'Hey Sri! I saw your NPTEL Elite+Gold certificate in Python. Could you help me with class inheritance and decorators?', '10:15 AM'),
('msg_02', 'sri', 'rishitha', 'Hi Rishitha! Absolutely! I would love to trade for some guidance on Figma Auto-Layout and UI token systems.', '10:18 AM'),
('msg_03', 'rishitha', 'sri', 'That sounds like a perfect 2-way swap! Let us schedule 2 hours for each session.', '10:20 AM')
ON CONFLICT (id) DO NOTHING;
