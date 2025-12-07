const { createLogger } = require('../utils/logger');

const logger = createLogger('Auth');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    logger.warn('Unauthorized access attempt', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
  }
  
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    logger.warn('Admin access required', {
      path: req.path,
      userId: req.session.userId
    });
    
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'You do not have permission to access this resource'
    });
  }
  
  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};