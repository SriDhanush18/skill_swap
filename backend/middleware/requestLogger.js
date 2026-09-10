/**
 * SkillSwap Platform - Request Logger Middleware
 */

function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} ${color}${status}\x1b[0m (${duration}ms)`);
  });

  next();
}

module.exports = requestLogger;
