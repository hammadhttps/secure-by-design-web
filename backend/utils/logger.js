const winston = require('winston');
const path = require('path');

const logDir = 'logs';

// Create log directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Helper function to create module-specific logger
function createLogger(moduleName) {
  return {
    info: (message, meta = {}) => logger.info(`[${moduleName}] ${message}`, meta),
    error: (message, meta = {}) => logger.error(`[${moduleName}] ${message}`, meta),
    warn: (message, meta = {}) => logger.warn(`[${moduleName}] ${message}`, meta),
    debug: (message, meta = {}) => logger.debug(`[${moduleName}] ${message}`, meta)
  };
}

module.exports = {
  logger,
  createLogger
};