const csrf = require('csurf');
const { createLogger } = require('../utils/logger');

const logger = createLogger('CSRF');

const csrfProtection = csrf({ 
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  cookie: false // Use session-based CSRF, not cookie-based
});

function csrfErrorHandler(err, req, res, next) {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.error('CSRF token validation failed:', {
      path: req.path,
      method: req.method,
      sessionId: req.session?.id,
      tokenReceived: req.headers['x-csrf-token'] || req.body?._csrf || 'none'
    });
    
    return res.status(403).json({ 
      error: 'Invalid CSRF token',
      message: 'Please refresh the page and try again',
      code: 'CSRF_TOKEN_INVALID'
    });
  }
  next(err);
}

module.exports = {
  csrfProtection,
  csrfErrorHandler
};