/**
 * SkillSwap Platform - Centralized Error Handler Middleware
 */

function errorHandler(err, req, res, next) {
  console.error('💥 Server Error:', err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
