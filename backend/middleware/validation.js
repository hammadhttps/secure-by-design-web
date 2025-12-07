const { body, validationResult } = require('express-validator');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Validation');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed', {
        path: req.path,
        errors: errors.array()
      });
      
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array() 
      });
    }
    
    next();
  };
};

// Common validation schemas
const registerValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const postValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters')
    .escape(),
  body('content')
    .trim()
    .isLength({ min: 1 }).withMessage('Content is required')
    .escape()
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  postValidation
};