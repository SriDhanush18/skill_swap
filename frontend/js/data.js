/**
 * SkillSwap Platform - 4 Exact Tutor Categories & Student Feedback Rating Data
 * Vignan University Peer Knowledge Exchange
 */

const DEFAULT_PERSONAS = {
  sri: {
    id: 'sri',
    name: 'Sri Dhanush',
    college: 'Vignan University',
    major: 'B.Tech CSE (3rd Year, 1st Sem)',
    avatar: 'sri',
    bio: 'B.Tech CSE student at Vignan. NPTEL Elite+Gold (94%) certified in Python. Passionate about Machine Learning & OOP. Swapping for UI/UX Figma and React frontend.',
    credits: 4.0,
    escrowLocked: 0.0,
    lifetimeEarned: 8.0,
    lifetimeSpent: 4.0,
    rating: 4.95,
    reviewsCount: 14,
    badges: ['Vignan Student', '🥇 Elite Master Tutor', 'NPTEL Elite+Gold', '⚡ Fast Responder'],
    skillsOffered: [
      { id: 'sk_sri_1', name: 'Python Core & OOP', level: 'Advanced', category: 'Tech', rate: 2.5, tier: 'Elite Master', is_verified: 1, quiz_score: 95, cert_count: 1, desc: 'Variables, OOPs, Data Structures, File I/O, scripting and problem-solving.' },
      { id: 'sk_sri_2', name: 'Data Structures & Algorithms', level: 'Intermediate', category: 'Tech', rate: 1.5, tier: 'Silver', is_verified: 1, quiz_score: 90, cert_count: 0, desc: 'Arrays, Linked Lists, Trees, Stacks, Queues with Python implementations.' },
      { id: 'sk_sri_3', name: 'Machine Learning Basics', level: 'Intermediate', category: 'Tech', rate: 2.5, tier: 'Elite Master', is_verified: 1, quiz_score: 94, cert_count: 1, desc: 'Scikit-Learn, Regression, Classification models, and NumPy/Pandas pipelines.' }
    ],
    skillsWanted: [
      { id: 'skw_sri_1', name: 'UI/UX Design & Figma', level: 'Beginner', category: 'Design', goal: 'Design modern web app prototypes and wireframes' },
      { id: 'skw_sri_2', name: 'React.js Frontend', level: 'Beginner', category: 'Tech', goal: 'Build component-based responsive single page apps' }
    ],
    certificates: [
      {
        id: 'cert_sri_1',
        skill_name: 'Python Core & OOP',
        authority: 'NPTEL (IIT Madras)',
        title: 'Programming, Data Structures & Algorithms using Python',
        credential_id: 'NPTEL23CS108S4491028',
        score_or_grade: 'Elite + Gold (94% - Top 1%)',
        is_verified: 1
      },
      {
        id: 'cert_sri_2',
        skill_name: 'Machine Learning Basics',
        authority: 'Coursera (DeepLearning.AI)',
        title: 'Machine Learning Specialization by Andrew Ng',
        credential_id: 'COURSERA-ML-8829471',
        score_or_grade: 'Grade: 98.4%',
        is_verified: 1
      }
    ],
    transactions: [
      { id: 'tx_sri_101', user_id: 'sri', date: '2026-08-22', type: 'Welcome Grant', description: 'Vignan University Sign-Up Bonus Credits', amount: 3.0, status: 'Completed', student_name: 'Vignan System' },
      { id: 'tx_sri_102', user_id: 'sri', date: '2026-08-23', type: 'Taught Session', description: 'Taught 2 hrs Python OOP to Rishitha (Elite Master @ 2.5 Cr/hr)', amount: 5.0, status: 'Completed', student_name: 'Rishitha K.' },
      { id: 'tx_sri_103', user_id: 'sri', date: '2026-08-24', type: 'Learned Session', description: 'Learned 2 hrs React Components from Bharath', amount: -4.0, status: 'Completed', student_name: 'Bharath Varma' },
      { id: 'tx_sri_104', user_id: 'sri', date: '2026-08-25', type: 'Course Qualification Bonus', description: '2.0 Bonus Credits awarded for passing Python Core & OOP qualification assessment', amount: 2.0, status: 'Completed', student_name: 'AI Academic Council' },
      { id: 'tx_sri_105', user_id: 'sri', date: '2026-08-26', type: 'Support Resolution Bounty', description: 'Support Desk bounty for classifying and solving Python recursion doubt', amount: 2.0, status: 'Completed', student_name: 'Academic Support Desk' }
    ]
  },
  rishitha: {
    id: 'rishitha',
    name: 'Rishitha',
    college: 'Vignan University',
    major: 'B.Tech IT (3rd Year)',
    avatar: 'rishitha',
    bio: 'UI/UX enthusiast and Figma Pro. Google / Coursera UX Design Professional Certified. I craft accessible design tokens and responsive prototypes. Swapping for Python OOP & ML.',
    credits: 4.0,
    escrowLocked: 0.0,
    lifetimeEarned: 10.0,
    lifetimeSpent: 6.0,
    rating: 4.98,
    reviewsCount: 18,
    badges: ['🥇 Elite Master Tutor', 'Coursera Google UX', 'Figma Pro', 'Vignan Student', '100% On-Time'],
    skillsOffered: [
      { id: 'sk_rish_1', name: 'UI/UX Design & Figma', level: 'Expert', category: 'Design', rate: 2.5, tier: 'Elite Master', is_verified: 1, quiz_score: 98, cert_count: 1, desc: 'Auto-layout, design tokens, responsive grids, and high-fidelity prototyping in Figma.' },
      { id: 'sk_rish_2', name: 'Tailwind & Design Systems', level: 'Advanced', category: 'Design', rate: 1.5, tier: 'Silver', is_verified: 1, quiz_score: 92, cert_count: 0, desc: 'Translating Figma designs into accessible CSS layouts, component tokens, and responsive utilities.' }
    ],
    skillsWanted: [
      { id: 'skw_rish_1', name: 'Python Core & OOP', level: 'Beginner', category: 'Tech', goal: 'Automate data tasks and understand backend scripting' },
      { id: 'skw_rish_2', name: 'Machine Learning Basics', level: 'Beginner', category: 'Tech', goal: 'Learn AI fundamentals and Python ML models' }
    ],
    certificates: [
      {
        id: 'cert_rish_1',
        skill_name: 'UI/UX Design & Figma',
        authority: 'Coursera (Google)',
        title: 'Google UX Design Professional Certificate',
        credential_id: 'GGL-UX-9912048',
        score_or_grade: 'Distinction (Honor Roll)',
        is_verified: 1
      }
    ],
    transactions: [
      { id: 'tx_rish_201', user_id: 'rishitha', date: '2026-08-22', type: 'Welcome Grant', description: 'Vignan University Sign-Up Bonus Credits', amount: 3.0, status: 'Completed', student_name: 'Vignan System' },
      { id: 'tx_rish_202', user_id: 'rishitha', date: '2026-08-23', type: 'Taught Session', description: 'Taught 2 hrs UI/UX Figma Design to Sri Dhanush (Elite Master @ 2.5 Cr/hr)', amount: 5.0, status: 'Completed', student_name: 'Sri Dhanush' },
      { id: 'tx_rish_203', user_id: 'rishitha', date: '2026-08-23', type: 'Learned Session', description: 'Learned 2 hrs Python OOP from Sri Dhanush', amount: -5.0, status: 'Completed', student_name: 'Sri Dhanush' },
      { id: 'tx_rish_204', user_id: 'rishitha', date: '2026-08-24', type: 'Taught Session', description: 'Taught 1 hr Tailwind & Design Systems to Pujitha', amount: 2.0, status: 'Completed', student_name: 'Pujitha Reddy' },
      { id: 'tx_rish_205', user_id: 'rishitha', date: '2026-08-25', type: 'Course Qualification Bonus', description: '2.0 Bonus Credits awarded for UI/UX Design & Figma qualification', amount: 2.0, status: 'Completed', student_name: 'AI Academic Council' }
    ]
  },
  bharath: {
    id: 'bharath',
    name: 'Bharath',
    college: 'Vignan University',
    major: 'B.Tech CSE (4th Year)',
    avatar: 'bharath',
    bio: 'Fullstack developer. AWS Certified Developer. Mentoring students in React.js, Next.js, and Node.js REST APIs.',
    credits: 6.0,
    escrowLocked: 0.0,
    lifetimeEarned: 18.0,
    lifetimeSpent: 12.0,
    rating: 4.92,
    reviewsCount: 24,
    badges: ['🥇 Elite Master Tutor', 'AWS Certified', 'Verified Senior'],
    skillsOffered: [
      { id: 'sk_bha_1', name: 'React.js Frontend', level: 'Expert', category: 'Tech', rate: 2.5, tier: 'Elite Master', is_verified: 1, quiz_score: 92, cert_count: 1, desc: 'React Hooks, State management, custom hooks, React Router, and API integrations.' },
      { id: 'sk_bha_2', name: 'Node.js & Express APIs', level: 'Advanced', category: 'Tech', rate: 1.0, tier: 'Bronze', is_verified: 1, quiz_score: 80, cert_count: 0, desc: 'REST architecture, JWT auth, middleware, and database connections.' }
    ],
    skillsWanted: [
      { id: 'skw_bha_1', name: 'Docker & Kubernetes', level: 'Beginner', category: 'Cloud', goal: 'Learn containerization and microservice orchestration' }
    ],
    certificates: [
      {
        id: 'cert_bha_1',
        skill_name: 'React.js Frontend',
        authority: 'AWS / Amazon',
        title: 'AWS Certified Developer - Associate',
        credential_id: 'AWS-DEV-7729104',
        score_or_grade: 'Score: 890/1000',
        is_verified: 1
      }
    ],
    transactions: [
      { id: 'tx_bha_301', user_id: 'bharath', date: '2026-08-20', type: 'Welcome Grant', description: 'Vignan University Sign-Up Bonus Credits', amount: 3.0, status: 'Completed', student_name: 'Vignan System' },
      { id: 'tx_bha_302', user_id: 'bharath', date: '2026-08-24', type: 'Taught Session', description: 'Taught 2 hrs React.js Frontend to Sri Dhanush (Elite Master @ 2.5 Cr/hr)', amount: 5.0, status: 'Completed', student_name: 'Sri Dhanush' },
      { id: 'tx_bha_303', user_id: 'bharath', date: '2026-08-25', type: 'Taught Session', description: 'Taught 2 hrs Node.js REST APIs to Taman (Bronze @ 1.0 Cr/hr)', amount: 2.0, status: 'Completed', student_name: 'Taman S.' },
      { id: 'tx_bha_304', user_id: 'bharath', date: '2026-08-25', type: 'Learned Session', description: 'Learned 2 hrs Cloud Architecture from Senior Mentor', amount: -4.0, status: 'Completed', student_name: 'Senior Cloud Mentor' }
    ]
  },
  pujitha: {
    id: 'pujitha',
    name: 'Pujitha',
    college: 'Vignan University',
    major: 'B.Tech AI & Data Science (3rd Year)',
    avatar: 'pujitha',
    bio: 'Data science & analytics passionate. NPTEL DBMS Silver Certified. Seeking mentorship in Flutter mobile apps and Figma UI.',
    credits: 3.0,
    escrowLocked: 0.0,
    lifetimeEarned: 7.0,
    lifetimeSpent: 4.0,
    rating: 4.86,
    reviewsCount: 9,
    badges: ['🎖️ Advanced Tutor', 'NPTEL DBMS Silver', 'Data Wizard', 'SQL Certified'],
    skillsOffered: [
      { id: 'sk_puj_1', name: 'SQL & Database Design', level: 'Advanced', category: 'Tech', rate: 2.0, tier: 'Advanced', is_verified: 1, quiz_score: 82, cert_count: 1, desc: 'Complex joins, indexing, query optimization, and relational schema design.' },
      { id: 'sk_puj_2', name: 'Pandas & Data Viz', level: 'Intermediate', category: 'Tech', rate: 1.0, tier: 'Bronze', is_verified: 1, quiz_score: 75, cert_count: 0, desc: 'Data cleaning, aggregation, Seaborn, Matplotlib, and PowerBI dashboards.' }
    ],
    skillsWanted: [
      { id: 'skw_puj_1', name: 'UI/UX Design & Figma', level: 'Beginner', category: 'Design', goal: 'Create modern dashboard mockups before coding' },
      { id: 'skw_puj_2', name: 'Flutter App Development', level: 'Beginner', category: 'Tech', goal: 'Build cross-platform mobile apps' }
    ],
    certificates: [
      {
        id: 'cert_puj_1',
        skill_name: 'SQL & Database Design',
        authority: 'NPTEL (IIT Kharagpur)',
        title: 'Database Management System Concepts & Design',
        credential_id: 'NPTEL24CS55S219034',
        score_or_grade: 'Elite + Silver (84%)',
        is_verified: 1
      }
    ],
    transactions: [
      { id: 'tx_puj_401', user_id: 'pujitha', date: '2026-08-21', type: 'Welcome Grant', description: 'Vignan University Sign-Up Bonus Credits', amount: 3.0, status: 'Completed', student_name: 'Vignan System' },
      { id: 'tx_puj_402', user_id: 'pujitha', date: '2026-08-23', type: 'Taught Session', description: 'Taught 2 hrs SQL Database Design & Indexing to Taman (Advanced @ 2.0 Cr/hr)', amount: 4.0, status: 'Completed', student_name: 'Taman S.' },
      { id: 'tx_puj_403', user_id: 'pujitha', date: '2026-08-24', type: 'Learned Session', description: 'Learned 1 hr Design Systems from Rishitha', amount: -2.0, status: 'Completed', student_name: 'Rishitha K.' }
    ]
  },
  taman: {
    id: 'taman',
    name: 'Taman',
    college: 'Vignan University',
    major: 'B.Tech Cyber Security / CSE (3rd Year)',
    avatar: 'taman',
    bio: 'Cyber security and Linux enthusiast. CompTIA Security+ Certified. Experienced in network reconnaissance & OWASP.',
    credits: 3.0,
    escrowLocked: 0.0,
    lifetimeEarned: 6.0,
    lifetimeSpent: 3.0,
    rating: 4.88,
    reviewsCount: 8,
    badges: ['🎖️ Advanced Tutor', 'CompTIA Security+', 'Linux Guru', 'Verified Tutor'],
    skillsOffered: [
      { id: 'sk_tam_1', name: 'Cyber Security & Ethical Hacking', level: 'Advanced', category: 'Tech', rate: 2.0, tier: 'Advanced', is_verified: 1, quiz_score: 86, cert_count: 1, desc: 'Reconnaissance, Nmap, Wireshark, vulnerability scanning, and OWASP Top 10.' },
      { id: 'sk_tam_2', name: 'Linux System Administration', level: 'Advanced', category: 'Tech', rate: 1.5, tier: 'Silver', is_verified: 1, quiz_score: 91, cert_count: 0, desc: 'Bash scripting, permissions, process management, SSH keys, and firewall setups.' }
    ],
    skillsWanted: [
      { id: 'skw_tam_1', name: 'React.js Frontend', level: 'Beginner', category: 'Tech', goal: 'Build interactive security dashboard web interfaces' }
    ],
    certificates: [
      {
        id: 'cert_tam_1',
        skill_name: 'Cyber Security & Ethical Hacking',
        authority: 'CompTIA',
        title: 'CompTIA Security+ (SY0-601)',
        credential_id: 'COMP-SEC-441029',
        score_or_grade: 'Certified Security Specialist',
        is_verified: 1
      }
    ],
    transactions: [
      { id: 'tx_tam_501', user_id: 'taman', date: '2026-08-21', type: 'Welcome Grant', description: 'Vignan University Sign-Up Bonus Credits', amount: 3.0, status: 'Completed', student_name: 'Vignan System' },
      { id: 'tx_tam_502', user_id: 'taman', date: '2026-08-23', type: 'Learned Session', description: 'Learned 2 hrs SQL Database Design from Pujitha', amount: -4.0, status: 'Completed', student_name: 'Pujitha Reddy' },
      { id: 'tx_tam_503', user_id: 'taman', date: '2026-08-24', type: 'Taught Session', description: 'Taught 2 hrs Linux System Administration & Bash to Peers', amount: 3.0, status: 'Completed', student_name: 'Junior CSE Peers' }
    ]
  },
  admin: {
    id: 'admin',
    name: 'Dr. S. K. Rao',
    college: 'Vignan University',
    major: 'Faculty Coordinator & Platform Admin',
    avatar: 'admin',
    bio: 'Department of CSE Faculty Coordinator overseeing university peer-to-peer skill exchanges, NPTEL/Coursera certificate verification, and quiz moderation.',
    credits: 999.0,
    escrowLocked: 0.0,
    lifetimeEarned: 100.0,
    lifetimeSpent: 0.0,
    rating: 5.0,
    reviewsCount: 50,
    isAdmin: true,
    badges: ['University Admin', 'Faculty Lead', 'Cert Validator'],
    skillsOffered: [],
    skillsWanted: [],
    certificates: [],
    transactions: [
      { id: 'tx_adm_901', user_id: 'admin', date: '2026-08-01', type: 'System Grant', description: 'Faculty Admin Treasury Allocation for Discretionary Grants', amount: 999.0, status: 'Completed', student_name: 'Vignan University Central Treasury' }
    ]
  }
};
