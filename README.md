# 🎓 SkillSwap — Peer-to-Peer Skill Exchange Platform

> **Engineered for Vignan University** by **Sri Dhanush** (B.Tech CSE, 3rd Year).
> A cashless, time-banking peer skill-swap platform featuring **AI Dynamic 20-Question Qualification Assessments**, **Competitive Negative Marking (+3 / -1 / 0)**, **Verified Certificate Integration (NPTEL / Coursera)**, **Review-Driven Ratings**, and **Smart Escrow Credit Contracts**.

---

## 📁 Project Architecture

```
skillswap/
│
├── frontend/
│   ├── index.html               # Main Single Page Application interface
│   ├── css/
│   │   └── style.css            # Responsive styles, design tokens & theme
│   └── js/
│       ├── app.js               # UI controller, matrix navigator, exam modals
│       ├── data.js              # Mock personas, catalog & seed state
│       └── wallet.js            # Client-side state store & API connector
│
├── backend/
│   ├── server.js                # Express app entrypoint & static server
│   ├── routes/
│   │   ├── index.js             # Consolidated API router index & health check
│   │   ├── userRoutes.js        # /api/users routes
│   │   ├── skillRoutes.js       # /api/skills (offered & wanted) routes
│   │   ├── sessionRoutes.js     # /api/sessions & escrow booking routes
│   │   ├── quizRoutes.js        # /api/quizzes & 20-question dynamic exam routes
│   │   ├── certificateRoutes.js # /api/certificates verification routes
│   │   ├── reviewRoutes.js      # /api/reviews & student feedback routes
│   │   └── transactionRoutes.js # /api/transactions ledger routes
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── skillController.js
│   │   ├── sessionController.js
│   │   ├── quizController.js
│   │   ├── certificateController.js
│   │   ├── reviewController.js
│   │   └── transactionController.js
│   ├── middleware/
│   │   ├── auth.js              # User context injection middleware
│   │   ├── errorHandler.js      # Centralized HTTP error handler
│   │   └── requestLogger.js     # HTTP request timing & status logger
│   ├── services/
│   │   └── aiQuizGenerator.js   # Google Gemini 2.5 Flash & Domain Synthesizer
│   └── database/
│       ├── db.js                # SQLite asynchronous database client
│       ├── supabase.js          # Supabase PostgreSQL & SQLite dual-mode driver
│       ├── supabase_schema.sql  # Production PostgreSQL relational schema
│       └── seed.js              # Database seed script for Vignan personas
│
├── .env                         # Environment variables configuration
├── .gitignore                   # Git ignore specifications
├── package.json                 # Node.js project manifest & scripts
├── README.md                    # Platform documentation
└── Dockerfile                   # Production containerization build
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
```bash
npm run seed
```

### 3. Start Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🎯 4-Tier Tutor Classification System

Students earn teaching badges and command higher hourly credit rates based on their qualification and verified credentials:

| Category Tier | Academic & Quiz Requirements | Hourly Credit Rate |
| :--- | :--- | :--- |
| 🥉 **1. Bronze Tutor** | Passed Quiz (42–53 Marks / 70%–89%) + No Certificate | **1.0 Cr / hr** |
| 🥈 **2. Silver Tutor** | High Distinction (≥54 Marks / ≥90%) + No Certificate | **1.5 Cr / hr** |
| 🎖️ **3. Advanced Tutor** | Passed Quiz (42–53 Marks / 70%–89%) + Verified NPTEL/Coursera Cert | **2.0 Cr / hr** |
| 🥇 **4. Elite Master Tutor**| High Distinction (≥54 Marks / ≥90%) + Verified NPTEL/Coursera Cert | **2.5 Cr / hr** |

> ⭐ **Star Ratings (1.0 to 5.0)** are calculated solely from verified student reviews and feedback tags after completed sessions.

---

## 🧠 AI Dynamic 20-Question Assessment & Negative Marking

### 📐 Marking Scheme
- **Correct Answer**: `+3 Marks`
- **Wrong Answer**: `-1 Mark`
- **Unattempted Question**: `0 Marks`
- **Maximum Possible Marks**: `20 × 3 = 60 Marks`
- **Percentage Formula**:
  $$\text{Score \%} = \max\left(0, \text{Math.round}\left(\frac{\text{Marks Obtained}}{60} \times 100\right)\right)$$

### ✨ Features
1. **Dynamic Generation**: Powered by Google Gemini (`gemini-2.5-flash`) with randomized domain synthesizers for Python/OOP, React, UI/UX & Figma, SQL, and Machine Learning.
2. **20-Question Jump Matrix**: Real-time 1-to-20 navigation grid with `answered`, `active`, and `unattempted` states.
3. **Choice Eraser**: "Clear Choice" button enables leaving questions unattempted (0 marks) to prevent negative mark deductions.
4. **Full Response Auditing**: Every attempt records user choices, correct keys, explanations, and mark impacts in `quiz_attempts`.

---

## 🛡️ Smart Credit Escrow Engine

1. **Booking**: When a learner books a session (e.g. 2 hours with an Elite Master @ 2.5 Cr/hr = 5.0 Credits), the credits are **locked in escrow**.
2. **Conducted**: Mentor and learner conduct the peer session via Google Meet / Zoom.
3. **Completion & Review**: Learner marks session complete and submits a star rating + review.
4. **Payout**: Escrow releases the 5.0 credits directly to the tutor's wallet.

---

## 🐳 Docker Containerization

To run SkillSwap inside a Docker container:

```bash
# Build image
docker build -t skillswap:latest .

# Run container
docker run -d -p 3000:3000 --name skillswap-app skillswap:latest
```

---

## 📜 License
Developed for **Vignan University** student community under the **ISC License**.
