const { db, initSchema } = require('./db');

async function seedDatabase() {
  console.log('🌱 Seeding SkillSwap Database with 4 Exact Tutor Categories & Student Feedback Ratings...');

  await db.runAsync(`DROP TABLE IF EXISTS notifications`);
  await db.runAsync(`DROP TABLE IF EXISTS messages`);
  await db.runAsync(`DROP TABLE IF EXISTS reviews`);
  await db.runAsync(`DROP TABLE IF EXISTS transactions`);
  await db.runAsync(`DROP TABLE IF EXISTS sessions`);
  await db.runAsync(`DROP TABLE IF EXISTS quiz_attempts`);
  await db.runAsync(`DROP TABLE IF EXISTS quiz_questions`);
  await db.runAsync(`DROP TABLE IF EXISTS quizzes`);
  await db.runAsync(`DROP TABLE IF EXISTS certificates`);
  await db.runAsync(`DROP TABLE IF EXISTS skills_wanted`);
  await db.runAsync(`DROP TABLE IF EXISTS skills_offered`);
  await db.runAsync(`DROP TABLE IF EXISTS users`);

  await initSchema();

  // 1. Seed Users (Sri Dhanush, Rishitha, Bharath, Pujitha, Taman, Dr. S. K. Rao)
  const users = [
    {
      id: 'sri',
      name: 'Sri Dhanush',
      college: 'Vignan University',
      major: 'B.Tech CSE (3rd Year, 1st Sem)',
      avatar: 'sri',
      bio: 'B.Tech CSE student at Vignan. NPTEL Elite+Gold (94%) certified in Python. Passionate about Machine Learning & OOP. Swapping for UI/UX Figma and React frontend.',
      credits: 4.0,
      escrow_locked: 0.0,
      lifetime_earned: 8.0,
      lifetime_spent: 4.0,
      rating: 4.95,
      reviews_count: 14,
      badges: ['Vignan Student', '🥇 Elite Master Tutor', 'NPTEL Elite+Gold', '⚡ Fast Responder'],
      is_admin: 0
    },
    {
      id: 'rishitha',
      name: 'Rishitha',
      college: 'Vignan University',
      major: 'B.Tech IT (3rd Year)',
      avatar: 'rishitha',
      bio: 'UI/UX enthusiast and Figma Pro. Google / Coursera UX Design Professional Certified. I craft accessible design tokens and responsive prototypes. Swapping for Python OOP & ML.',
      credits: 4.0,
      escrow_locked: 0.0,
      lifetime_earned: 10.0,
      lifetime_spent: 6.0,
      rating: 4.98,
      reviews_count: 18,
      badges: ['🥇 Elite Master Tutor', 'Coursera Google UX', 'Figma Pro', 'Vignan Student', '100% On-Time'],
      is_admin: 0
    },
    {
      id: 'bharath',
      name: 'Bharath',
      college: 'Vignan University',
      major: 'B.Tech CSE (4th Year)',
      avatar: 'bharath',
      bio: 'Fullstack developer. AWS Certified Developer. Mentoring students in React.js, Next.js, and Node.js REST APIs.',
      credits: 6.0,
      escrow_locked: 0.0,
      lifetime_earned: 18.0,
      lifetime_spent: 12.0,
      rating: 4.92,
      reviews_count: 24,
      badges: ['🥇 Elite Master Tutor', 'AWS Certified', 'Verified Senior'],
      is_admin: 0
    },
    {
      id: 'pujitha',
      name: 'Pujitha',
      college: 'Vignan University',
      major: 'B.Tech AI & Data Science (3rd Year)',
      avatar: 'pujitha',
      bio: 'Data science & analytics passionate. NPTEL DBMS Silver Certified. Seeking mentorship in Flutter mobile apps and Figma UI.',
      credits: 3.0,
      escrow_locked: 0.0,
      lifetime_earned: 7.0,
      lifetime_spent: 4.0,
      rating: 4.86,
      reviews_count: 9,
      badges: ['🎖️ Advanced Tutor', 'NPTEL DBMS Silver', 'Data Wizard', 'SQL Certified'],
      is_admin: 0
    },
    {
      id: 'taman',
      name: 'Taman',
      college: 'Vignan University',
      major: 'B.Tech Cyber Security / CSE (3rd Year)',
      avatar: 'taman',
      bio: 'Cyber security and Linux enthusiast. CompTIA Security+ Certified. Experienced in network reconnaissance & OWASP.',
      credits: 3.0,
      escrow_locked: 0.0,
      lifetime_earned: 6.0,
      lifetime_spent: 3.0,
      rating: 4.88,
      reviews_count: 8,
      badges: ['🎖️ Advanced Tutor', 'CompTIA Security+', 'Linux Guru', 'Verified Mentor'],
      is_admin: 0
    },
    {
      id: 'admin',
      name: 'Dr. S. K. Rao',
      college: 'Vignan University',
      major: 'Faculty Coordinator & Platform Admin',
      avatar: 'admin',
      bio: 'Department of CSE Faculty Coordinator overseeing university peer-to-peer skill exchanges, NPTEL/Coursera certificate verification, and quiz moderation.',
      credits: 999.0,
      escrow_locked: 0.0,
      lifetime_earned: 100.0,
      lifetime_spent: 0.0,
      rating: 5.0,
      reviews_count: 50,
      badges: ['University Admin', 'Faculty Lead', 'Cert Validator'],
      is_admin: 1
    }
  ];

  for (const u of users) {
    await db.runAsync(
      `INSERT INTO users (id, name, college, major, avatar, bio, credits, escrow_locked, lifetime_earned, lifetime_spent, rating, reviews_count, badges_json, is_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.name, u.college, u.major, u.avatar, u.bio, u.credits, u.escrow_locked, u.lifetime_earned, u.lifetime_spent, u.rating, u.reviews_count, JSON.stringify(u.badges), u.is_admin]
    );
  }

  // 2. Seed Authorized Certificates (NPTEL, Coursera, AWS, CompTIA)
  const certs = [
    {
      id: 'cert_sri_1',
      user_id: 'sri',
      skill_name: 'Python Core & OOP',
      authority: 'NPTEL (IIT Madras)',
      title: 'Programming, Data Structures & Algorithms using Python',
      credential_id: 'NPTEL23CS108S4491028',
      credential_url: 'https://nptel.ac.in/noc/E_Certificate/NPTEL23CS108S4491028',
      score_or_grade: 'Elite + Gold (94% - Top 1% in India)',
      is_verified: 1
    },
    {
      id: 'cert_sri_2',
      user_id: 'sri',
      skill_name: 'Machine Learning Basics',
      authority: 'Coursera (DeepLearning.AI)',
      title: 'Machine Learning Specialization by Andrew Ng',
      credential_id: 'COURSERA-ML-8829471',
      credential_url: 'https://coursera.org/verify/COURSERA-ML-8829471',
      score_or_grade: 'Grade: 98.4%',
      is_verified: 1
    },
    {
      id: 'cert_rish_1',
      user_id: 'rishitha',
      skill_name: 'UI/UX Design & Figma',
      authority: 'Coursera (Google)',
      title: 'Google UX Design Professional Certificate',
      credential_id: 'GGL-UX-9912048',
      credential_url: 'https://coursera.org/verify/professional-cert/GGL-UX-9912048',
      score_or_grade: 'Distinction (Honor Roll)',
      is_verified: 1
    },
    {
      id: 'cert_bha_1',
      user_id: 'bharath',
      skill_name: 'React.js Frontend',
      authority: 'AWS / Amazon',
      title: 'AWS Certified Developer - Associate',
      credential_id: 'AWS-DEV-7729104',
      credential_url: 'https://aws.amazon.com/verification/AWS-DEV-7729104',
      score_or_grade: 'Score: 890/1000',
      is_verified: 1
    },
    {
      id: 'cert_puj_1',
      user_id: 'pujitha',
      skill_name: 'SQL & Database Design',
      authority: 'NPTEL (IIT Kharagpur)',
      title: 'Database Management System Concepts & Design',
      credential_id: 'NPTEL24CS55S219034',
      credential_url: 'https://nptel.ac.in/noc/E_Certificate/NPTEL24CS55S219034',
      score_or_grade: 'Elite + Silver (84%)',
      is_verified: 1
    },
    {
      id: 'cert_tam_1',
      user_id: 'taman',
      skill_name: 'Cyber Security & Ethical Hacking',
      authority: 'CompTIA',
      title: 'CompTIA Security+ (SY0-601)',
      credential_id: 'COMP-SEC-441029',
      credential_url: 'https://comptia.org/verify/COMP-SEC-441029',
      score_or_grade: 'Certified Security Specialist',
      is_verified: 1
    }
  ];

  for (const c of certs) {
    await db.runAsync(
      `INSERT INTO certificates (id, user_id, skill_name, authority, title, credential_id, credential_url, score_or_grade, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.user_id, c.skill_name, c.authority, c.title, c.credential_id, c.credential_url, c.score_or_grade, c.is_verified]
    );
  }

  // 3. Seed Skills Offered with the 4 Exact Tutor Categories:
  // Tier 1: Bronze (Passed 70-89% + No Cert) -> 1.0 Cr/hr
  // Tier 2: Silver (Quiz >= 90% + No Cert) -> 1.5 Cr/hr
  // Tier 3: Advanced (Passed + NPTEL/Coursera Cert) -> 2.0 Cr/hr
  // Tier 4: Elite Master (Quiz >= 90% + NPTEL/Coursera Cert) -> 2.5 Cr/hr
  const skillsOffered = [
    // Sri Dhanush
    { id: 'sk_sri_1', user_id: 'sri', name: 'Python Core & OOP', level: 'Advanced', category: 'Tech', rate: 2.5, tier: 'Elite Master', desc: 'Variables, OOPs, Data Structures, File I/O, scripting and problem-solving.', is_verified: 1, quiz_score: 95, cert_count: 1 },
    { id: 'sk_sri_2', user_id: 'sri', name: 'Data Structures & Algorithms', level: 'Intermediate', category: 'Tech', rate: 1.5, tier: 'Silver', desc: 'Arrays, Linked Lists, Trees, Stacks, Queues with Python implementations.', is_verified: 1, quiz_score: 90, cert_count: 0 },
    { id: 'sk_sri_3', user_id: 'sri', name: 'Machine Learning Basics', level: 'Intermediate', category: 'Tech', rate: 2.5, tier: 'Elite Master', desc: 'Scikit-Learn, Regression, Classification models, and NumPy/Pandas pipelines.', is_verified: 1, quiz_score: 94, cert_count: 1 },

    // Rishitha
    { id: 'sk_rish_1', user_id: 'rishitha', name: 'UI/UX Design & Figma', level: 'Expert', category: 'Design', rate: 2.5, tier: 'Elite Master', desc: 'Auto-layout, design tokens, responsive grids, and high-fidelity prototyping in Figma.', is_verified: 1, quiz_score: 98, cert_count: 1 },
    { id: 'sk_rish_2', user_id: 'rishitha', name: 'Tailwind & Design Systems', level: 'Advanced', category: 'Design', rate: 1.5, tier: 'Silver', desc: 'Translating Figma designs into accessible CSS layouts, component tokens, and responsive utilities.', is_verified: 1, quiz_score: 92, cert_count: 0 },

    // Bharath
    { id: 'sk_bha_1', user_id: 'bharath', name: 'React.js Frontend', level: 'Expert', category: 'Tech', rate: 2.5, tier: 'Elite Master', desc: 'React Hooks, State management, custom hooks, React Router, and API integrations.', is_verified: 1, quiz_score: 92, cert_count: 1 },
    { id: 'sk_bha_2', user_id: 'bharath', name: 'Node.js & Express APIs', level: 'Advanced', category: 'Tech', rate: 1.0, tier: 'Bronze', desc: 'REST architecture, JWT auth, middleware, and database connections.', is_verified: 1, quiz_score: 80, cert_count: 0 },

    // Pujitha
    { id: 'sk_puj_1', user_id: 'pujitha', name: 'SQL & Database Design', level: 'Advanced', category: 'Tech', rate: 2.0, tier: 'Advanced', desc: 'Complex joins, indexing, query optimization, and relational schema design.', is_verified: 1, quiz_score: 82, cert_count: 1 },
    { id: 'sk_puj_2', user_id: 'pujitha', name: 'Pandas & Data Viz', level: 'Intermediate', category: 'Tech', rate: 1.0, tier: 'Bronze', desc: 'Data cleaning, aggregation, Seaborn, Matplotlib, and PowerBI dashboards.', is_verified: 1, quiz_score: 75, cert_count: 0 },

    // Taman
    { id: 'sk_tam_1', user_id: 'taman', name: 'Cyber Security & Ethical Hacking', level: 'Advanced', category: 'Tech', rate: 2.0, tier: 'Advanced', desc: 'Reconnaissance, Nmap, Wireshark, vulnerability scanning, and OWASP Top 10.', is_verified: 1, quiz_score: 86, cert_count: 1 },
    { id: 'sk_tam_2', user_id: 'taman', name: 'Linux System Administration', level: 'Advanced', category: 'Tech', rate: 1.5, tier: 'Silver', desc: 'Bash scripting, permissions, process management, SSH keys, and firewall setups.', is_verified: 1, quiz_score: 91, cert_count: 0 }
  ];

  for (const s of skillsOffered) {
    await db.runAsync(
      `INSERT INTO skills_offered (id, user_id, name, level, category, rate, tier, description, is_verified, quiz_score, cert_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.user_id, s.name, s.level, s.category, s.rate, s.tier, s.desc, s.is_verified, s.quiz_score, s.cert_count]
    );
  }

  // 4. Seed Skills Wanted
  const skillsWanted = [
    { id: 'skw_sri_1', user_id: 'sri', name: 'UI/UX Design & Figma', level: 'Beginner', category: 'Design', goal: 'Design modern web app prototypes and wireframes' },
    { id: 'skw_sri_2', user_id: 'sri', name: 'React.js Frontend', level: 'Beginner', category: 'Tech', goal: 'Build component-based responsive single page apps' },
    { id: 'skw_rish_1', user_id: 'rishitha', name: 'Python Core & OOP', level: 'Beginner', category: 'Tech', goal: 'Automate data tasks and understand backend scripting' },
    { id: 'skw_rish_2', user_id: 'rishitha', name: 'Machine Learning Basics', level: 'Beginner', category: 'Tech', goal: 'Learn AI fundamentals and Python ML models' },
    { id: 'skw_bha_1', user_id: 'bharath', name: 'Docker & Kubernetes', level: 'Beginner', category: 'Cloud', goal: 'Learn containerization and microservice orchestration' },
    { id: 'skw_puj_1', user_id: 'pujitha', name: 'UI/UX Design & Figma', level: 'Beginner', category: 'Design', goal: 'Create modern dashboard mockups before coding' },
    { id: 'skw_puj_2', user_id: 'pujitha', name: 'Flutter App Development', level: 'Beginner', category: 'Tech', goal: 'Build cross-platform mobile apps' },
    { id: 'skw_tam_1', user_id: 'taman', name: 'React.js Frontend', level: 'Beginner', category: 'Tech', goal: 'Build interactive security dashboard web interfaces' }
  ];

  for (const sw of skillsWanted) {
    await db.runAsync(
      `INSERT INTO skills_wanted (id, user_id, name, level, category, goal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sw.id, sw.user_id, sw.name, sw.level, sw.category, sw.goal]
    );
  }

  // 5. Seed Domain Qualification Quizzes
  const quizzes = [
    { id: 'quiz_python', skill_name: 'Python Core & OOP', category: 'Tech', title: 'Python & OOP Mentor Certification Assessment', passing_score: 70, time_limit_minutes: 5 },
    { id: 'quiz_uiux', skill_name: 'UI/UX Design & Figma', category: 'Design', title: 'UI/UX & Figma Pro Mentor Qualification Test', passing_score: 70, time_limit_minutes: 5 },
    { id: 'quiz_react', skill_name: 'React.js Frontend', category: 'Tech', title: 'React.js Frontend Mentor Certification', passing_score: 70, time_limit_minutes: 5 },
    { id: 'quiz_sql', skill_name: 'SQL & Database Design', category: 'Tech', title: 'SQL & Database Design Mentor Certification', passing_score: 70, time_limit_minutes: 5 }
  ];

  for (const q of quizzes) {
    await db.runAsync(
      `INSERT INTO quizzes (id, skill_name, category, title, passing_score, time_limit_minutes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [q.id, q.skill_name, q.category, q.title, q.passing_score, q.time_limit_minutes]
    );
  }

  // 6. Seed Quiz Questions
  const questions = [
    {
      id: 'qq_python_1',
      quiz_id: 'quiz_python',
      question: 'What is the output of the following Python code regarding mutable default arguments?',
      code_snippet: `def append_to(element, target=[]):\n    target.append(element)\n    return target\n\nprint(append_to(1))\nprint(append_to(2))`,
      options: ['[1] and [2]', '[1] and [1, 2]', '[1, 2] and [1, 2]', 'Error: Mutable default argument'],
      correct_index: 1,
      explanation: 'In Python, default arguments are evaluated once when the function is defined, retaining the mutated list across invocations.'
    },
    {
      id: 'qq_python_2',
      quiz_id: 'quiz_python',
      question: 'In Python OOP, what is the primary purpose of super() in a subclass constructor?',
      code_snippet: `class Student(User):\n    def __init__(self, name, roll):\n        super().__init__(name)\n        self.roll = roll`,
      options: ['It creates a copy of the parent object', 'It delegates method execution to the parent class based on MRO', 'It converts the class into an interface', 'It makes all attributes private'],
      correct_index: 1,
      explanation: 'super() delegates calls to the parent class according to the Method Resolution Order.'
    },
    {
      id: 'qq_uiux_1',
      quiz_id: 'quiz_uiux',
      question: 'In Figma, what happens when you set an Auto-Layout child frame resizing to "Fill Container"?',
      code_snippet: '',
      options: ['The child element shrinks to fit text', 'The child element expands horizontally/vertically to fill parent frame', 'The child stays at fixed pixel width', 'The child detaches from component'],
      correct_index: 1,
      explanation: 'Fill Container dynamically stretches the child element to consume available dimensions inside the parent frame.'
    },
    {
      id: 'qq_uiux_2',
      quiz_id: 'quiz_uiux',
      question: 'According to WCAG 2.1 AA standards, what is the minimum contrast ratio for normal body text?',
      code_snippet: '',
      options: ['3:1', '4.5:1', '7:1', '2:1'],
      correct_index: 1,
      explanation: 'WCAG 2.1 AA requires at least 4.5:1 contrast for regular text.'
    }
  ];

  for (const qq of questions) {
    await db.runAsync(
      `INSERT INTO quiz_questions (id, quiz_id, question, code_snippet, options_json, correct_option_index, explanation)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [qq.id, qq.quiz_id, qq.question, qq.code_snippet, JSON.stringify(qq.options), qq.correct_index, qq.explanation]
    );
  }

  // 7. Seed Sample Session
  await db.runAsync(
    `INSERT INTO sessions (id, teacher_id, student_id, skill, hours, rate, credits, date, time, status, topic, code_workspace)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['sess_1', 'rishitha', 'sri', 'UI/UX Design & Figma', 2, 2.5, 5.0, '2026-08-25 (Tomorrow)', '4:00 PM - 6:00 PM', 'Confirmed', 'Figma Auto-layout & Design Tokens Masterclass', '// Collaborative Workspace - UI/UX Design Session\n// Mentor: Rishitha (Elite Master Tutor @ 2.5 Cr/hr) | Learner: Sri Dhanush\n// 5.0 Credits Locked in Escrow']
  );

  // 8. Seed Initial Transactions
  const txs = [
    { id: 'tx_101', user_id: 'sri', date: '2026-08-22', type: 'Welcome Grant', desc: 'Vignan University Sign-Up Bonus Credits', amount: 3.0, status: 'Completed', student: 'Sri Dhanush' },
    { id: 'tx_102', user_id: 'sri', date: '2026-08-23', type: 'Taught Session', desc: 'Taught 2 hrs Python OOP to Rishitha (Elite Master @ 2.5 Cr/hr)', amount: 5.0, status: 'Completed', student: 'Sri Dhanush' },
    { id: 'tx_103', user_id: 'sri', date: '2026-08-24', type: 'Learned Session', desc: 'Learned 2 hrs React Components from Bharath', amount: -4.0, status: 'Completed', student: 'Sri Dhanush' }
  ];

  for (const t of txs) {
    await db.runAsync(
      `INSERT INTO transactions (id, user_id, date, type, description, amount, status, student_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.user_id, t.date, t.type, t.desc, t.amount, t.status, t.student]
    );
  }

  // 9. Seed Student Reviews (Ratings are calculated based on student feedback!)
  const reviews = [
    {
      id: 'rev_1',
      session_id: 'sess_prev_1',
      target_user_id: 'sri',
      reviewer_name: 'Rishitha',
      reviewer_avatar: 'rishitha',
      skill: 'Python Core & OOP',
      rating: 5,
      comment: 'Sri is an Elite Master tutor! His NPTEL Gold certification knowledge and 95% quiz distinction made learning OOP concepts and recursion effortless.',
      tags: ['NPTEL Verified', 'Super Clear', 'Elite Tutor', 'Hands-on Coding']
    },
    {
      id: 'rev_2',
      session_id: 'sess_prev_2',
      target_user_id: 'sri',
      reviewer_name: 'Taman',
      reviewer_avatar: 'taman',
      skill: 'Data Structures',
      rating: 5,
      comment: 'Explains complex binary search trees with clean diagrams. Great peer mentor!',
      tags: ['Patient', 'Punctual', 'Clear Explanations']
    },
    {
      id: 'rev_3',
      session_id: 'sess_prev_3',
      target_user_id: 'rishitha',
      reviewer_name: 'Sri Dhanush',
      reviewer_avatar: 'sri',
      skill: 'UI/UX Design & Figma',
      rating: 5,
      comment: 'Rishitha has a Google UX Professional certificate and taught me auto-layout in 45 mins. Worth every credit!',
      tags: ['Google UX Pro', 'Super Clear', 'Figma Pro']
    }
  ];

  for (const r of reviews) {
    await db.runAsync(
      `INSERT INTO reviews (id, session_id, target_user_id, reviewer_name, reviewer_avatar, skill, rating, comment, tags_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.session_id, r.target_user_id, r.reviewer_name, r.reviewer_avatar, r.skill, r.rating, r.comment, JSON.stringify(r.tags)]
    );
  }

  // 10. Seed Messages
  await db.runAsync(
    `INSERT INTO messages (id, sender_id, receiver_id, text, time)
     VALUES (?, ?, ?, ?, ?)`,
    ['msg_1', 'rishitha', 'sri', 'Hey Sri! Since we are both Elite Master Tutors (Quiz 90%+ & NPTEL/Google UX), let us do a 2-hour swap!', '10:15 AM']
  );

  // 11. Seed Notifications
  await db.runAsync(
    `INSERT INTO notifications (id, user_id, title, message, time, is_unread, type)
     VALUES (?, ?, '🥇 Elite Master Tutor Tier Unlocked!', 'Your NPTEL Elite+Gold Certificate & 95% Quiz score unlocked Elite Master Tier (2.5 Cr/hr)!', '10 mins ago', 1, 'quiz')`,
    ['notif_1', 'sri']
  );

  console.log('✅ Database successfully seeded with 4 Tutor Categories (Bronze, Silver, Advanced, Elite Master) and Student Feedback Ratings!');
}

seedDatabase().catch(err => {
  console.error('❌ Error seeding database:', err);
});
