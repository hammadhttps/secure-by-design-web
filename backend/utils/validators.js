const { body } = require('express-validator');
const zxcvbn = require('zxcvbn');

const emailValidator = (field = 'email') => 
  body(field)
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email must be less than 100 characters');

const passwordValidator = (field = 'password', isRequired = true) => {
  const validator = body(field)
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^a-zA-Z0-9]/).optional().withMessage('Consider adding special characters for better security')
    .custom((password) => {
      const result = zxcvbn(password);
      if (result.score < 2) {
        throw new Error('Password is too weak. Please choose a stronger password');
      }
      return true;
    });
  
  return isRequired ? validator.notEmpty().withMessage('Password is required') : validator;
};

const usernameValidator = (field = 'username') =>
  body(field)
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Username can only contain letters, numbers, dots, dashes, and underscores')
    .custom((username) => {
      const reserved = ['admin', 'root', 'system', 'administrator', 'moderator'];
      if (reserved.includes(username.toLowerCase())) {
        throw new Error('This username is reserved');
      }
      return true;
    });

const sanitizeInput = (field) =>
  body(field)
    .trim()
    .escape()
    .stripLow()
    .blacklist('<>[]{}|\\^');

// Export validation chains
module.exports = {
  register: [
    usernameValidator(),
    emailValidator(),
    passwordValidator(),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],
  
  login: [
    emailValidator(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  
  updateProfile: [
    usernameValidator().optional(),
    emailValidator().optional(),
    passwordValidator('newPassword', false).optional(),
    body('currentPassword')
      .if(body('newPassword').exists())
      .notEmpty().withMessage('Current password is required when changing password')
  ],
  
  createPost: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters')
      .escape(),
    body('content')
      .trim()
      .isLength({ min: 1 }).withMessage('Content is required')
      .escape()
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required'),
    passwordValidator('newPassword'),
    body('newPassword')
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      })
  ],
  
  // Individual validators for reuse
  emailValidator,
  passwordValidator,
  usernameValidator,
  sanitizeInput
};