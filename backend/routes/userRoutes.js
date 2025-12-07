const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../middleware/csrfProtection');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const validators = require('../utils/validators');
const UserController = require('../controllers/userController');

// All user routes require authentication
router.use(requireAuth);

// GET /api/users/profile - Get current user profile
router.get('/profile', UserController.getProfile);

// PUT /api/users/profile - Update user profile
router.put('/profile', 
  csrfProtection,
  validate(validators.updateProfile),
  UserController.updateProfile
);

// GET /api/users/password-strength - Check password strength
router.get('/password-strength', UserController.checkPasswordStrength);

// POST /api/users/change-password - Change password
router.post('/change-password',
  csrfProtection,
  validate(validators.changePassword),
  UserController.changePassword
);

// GET /api/users/activity - Get user activity logs
router.get('/activity', UserController.getActivity);

// GET /api/users/:id - Get user by ID (admin only)
router.get('/:id', UserController.getUserById);

// DELETE /api/users/account - Delete user account
router.delete('/account',
  csrfProtection,
  UserController.deleteAccount
);

module.exports = router;