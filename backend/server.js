/**
 * SkillSwap Platform - Modular Express Application Server
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');

const requestLogger = require('./middleware/requestLogger');
const { attachUserContext } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const { initSchema } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(attachUserContext);

// Serve Frontend Static Assets (HTML, CSS, JS, Images)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
app.use(express.static(path.join(__dirname, '..'))); // Fallback static path

// Mount Modular API Routes
app.use('/api', apiRoutes);

// Catch-All Route for Single Page Application
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Initialize DB and Boot Server
async function startServer() {
  try {
    await initSchema();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n========================================================`);
      console.log(`🚀 SkillSwap Platform Live: http://localhost:${PORT}`);
      console.log(`📚 Frontend Path: ${frontendPath}`);
      console.log(`🤖 AI 20-Q Dynamic Assessment & Negative Marking (+3/-1/0) Active`);
      console.log(`========================================================\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start SkillSwap server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
