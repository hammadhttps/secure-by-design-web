const AuthService = require('../services/authService');
const PasswordService = require('../services/passwordService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('AuthController');

class AuthController {
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;
      
      logger.info('Registration attempt', { username, email });
      
      // Password strength analysis
      const strength = PasswordService.analyzePasswordStrength(password);
      const entropy = PasswordService.calculateEntropy(password);
      
      if (strength.score < 2) {
        return res.status(400).json({
          error: 'Weak password',
          message: 'Please choose a stronger password',
          analysis: strength
        });
      }
      
      // Create user
      const user = await AuthService.createUser({ username, email, password });
      
      // Create session
      req.session.userId = user.id;
      req.session.username = user.username;
      
      logger.info('User registered successfully', { userId: user.id });
      
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        passwordAnalysis: {
          strength: strength.score,
          crackTime: strength.crackTime,
          entropy: entropy
        }
      });
      
    } catch (error) {
      logger.error('Registration failed:', error.message);
      
      if (error.message === 'User already exists') {
        return res.status(400).json({ 
          error: 'Registration failed',
          message: 'User with this email or username already exists'
        });
      }
      
      res.status(500).json({ 
        error: 'Registration failed',
        message: 'An unexpected error occurred'
      });
    }
  }
  
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const ip = req.ip;
      
      logger.info('Login attempt', { email, ip });
      
      // Check for brute force attempts
      const failedCount = await AuthService.getFailedLoginCount(ip);
      if (failedCount > 5) {
        logger.warn('Too many failed attempts', { ip, count: failedCount });
        return res.status(429).json({ 
          error: 'Too many failed attempts',
          message: 'Please try again later'
        });
      }
      
      // Authenticate user
      const user = await AuthService.authenticateUser(email, password);
      
      // Clear failed attempts
      await AuthService.clearFailedLogins(ip);
      
      // Create session
      req.session.userId = user.id;
      req.session.username = user.username;
      
      logger.info('User logged in successfully', { userId: user.id });
      
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
      
    } catch (error) {
      logger.warn('Login failed:', error.message);
      
      // Only record failed login if email exists but password is wrong
      if (error.message === 'Invalid password' && req.body.email) {
        await AuthService.recordFailedLogin(req.ip, req.body.email);
        logger.info('Failed login recorded', { email: req.body.email, ip: req.ip });
      }
      
      res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }
  }
  
  static logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        logger.error('Logout error:', err);
        return res.status(500).json({ 
          error: 'Logout failed',
          message: 'Could not destroy session'
        });
      }
      
      res.json({ 
        message: 'Logged out successfully' 
      });
    });
  }
  
  static getCsrfToken(req, res) {
    try {
      // Ensure session is initialized
      if (!req.session) {
        logger.error('Session not initialized');
        return res.status(500).json({ 
          error: 'Failed to generate CSRF token',
          message: 'Session not initialized'
        });
      }
      
      // Generate CSRF token
      const token = req.csrfToken();
      
      if (!token) {
        logger.error('CSRF token generation returned null');
        return res.status(500).json({ 
          error: 'Failed to generate CSRF token',
          message: 'Token generation failed'
        });
      }
      
      // Save session to ensure CSRF secret is persisted
      req.session.save((err) => {
        if (err) {
          logger.error('Session save error:', err);
          return res.status(500).json({ 
            error: 'Failed to generate CSRF token',
            message: 'Session error'
          });
        }
        
        logger.debug('CSRF token generated', { 
          sessionId: req.sessionID,
          hasToken: !!token 
        });
        res.json({ csrfToken: token });
      });
    } catch (error) {
      logger.error('CSRF token generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate CSRF token',
        message: error.message
      });
    }
  }
  
  static async analyzePassword(req, res) {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({
          error: 'Password required',
          message: 'Please provide a password to analyze'
        });
      }
      
      const strength = PasswordService.analyzePasswordStrength(password);
      const entropy = PasswordService.calculateEntropy(password);
      const validation = PasswordService.validatePassword(password);
      
      res.json({
        analysis: {
          strength: {
            score: strength.score,
            label: ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength.score],
            warning: strength.warning,
            suggestions: strength.suggestions,
            crackTime: strength.crackTime
          },
          entropy: {
            value: entropy,
            bits: Math.round(entropy)
          },
          validation: validation
        }
      });
      
    } catch (error) {
      logger.error('Password analysis error:', error);
      res.status(500).json({ 
        error: 'Analysis failed',
        message: 'Failed to analyze password'
      });
    }
  }

  static async getFailedLoginAttempts(req, res) {
    try {
      // Get user email from session
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'You must be logged in to view failed login attempts'
        });
      }

      // Get user email from database
      const { query } = require('../config/database');
      const [users] = await query(
        'SELECT email FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account not found'
        });
      }

      const userEmail = users[0].email;

      // Get recent failed login attempts for this email
      const attempts = await AuthService.getFailedLoginAttemptsForEmail(userEmail, 10);

      res.json({
        attempts: attempts.map(attempt => ({
          id: attempt.id,
          ipAddress: attempt.ip_address,
          email: attempt.email,
          attemptTime: attempt.attempt_time
        })),
        count: attempts.length
      });
    } catch (error) {
      logger.error('Failed to get failed login attempts:', error);
      res.status(500).json({
        error: 'Failed to fetch failed login attempts',
        message: 'An error occurred while fetching failed login attempts'
      });
    }
  }
}

module.exports = AuthController;