const { createLogger } = require('../utils/logger');

const logger = createLogger('ErrorHandler');

function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.session?.userId
  });
  
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Prepare error response
  const errorResponse = {
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };
  
  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  // Send response
  res.status(statusCode).json(errorResponse);
}

module.exports = {
  errorHandler
};