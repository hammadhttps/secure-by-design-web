const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../middleware/csrfProtection');
const { validate, registerValidation, loginValidation } = require('../middleware/validation');
const AuthController = require('../controllers/authController');

// GET /api/auth/csrf-token - Must be before CSRF protection or use ignoreMethods
// This endpoint doesn't need CSRF protection since it's a GET request
router.get('/csrf-token', AuthController.getCsrfToken);

// POST /api/auth/register
router.post('/register', 
  csrfProtection, 
  validate(registerValidation), 
  AuthController.register
);

// POST /api/auth/login
router.post('/login', 
  csrfProtection, 
  validate(loginValidation), 
  AuthController.login
);

// POST /api/auth/logout
router.post('/logout', AuthController.logout);

// POST /api/auth/analyze-password
router.post('/analyze-password', AuthController.analyzePassword);

module.exports = router;