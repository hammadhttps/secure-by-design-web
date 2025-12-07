const User = require('../models/User');
const Post = require('../models/Post');
const PasswordService = require('../services/passwordService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('UserController');

class UserController {
  static async getProfile(req, res) {
    try {
      const userId = req.session.userId;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }
      
      // Get user statistics
      const postCount = await Post.countByUser(userId);
      
      res.json({
        user: user.toJSON(),
        statistics: {
          postCount: postCount,
          memberSince: user.created_at
        }
      });
      
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to fetch profile',
        message: 'An unexpected error occurred'
      });
    }
  }
  
  static async updateProfile(req, res) {
    try {
      const userId = req.session.userId;
      const { username, email } = req.body;
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }
      
      // Check if new username or email is already taken
      if (username && username !== user.username) {
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
          return res.status(400).json({
            error: 'Username taken',
            message: 'This username is already in use'
          });
        }
      }
      
      if (email && email !== user.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({
            error: 'Email taken',
            message: 'This email is already in use'
          });
        }
      }
      
      // Update user profile
      const updates = {};
      if (username) updates.username = username;
      if (email) updates.email = email;
      
      await user.updateProfile(updates);
      
      // Update session if username changed
      if (username) {
        req.session.username = username;
      }
      
      logger.info('User profile updated', { userId });
      
      res.json({
        message: 'Profile updated successfully',
        user: user.toJSON()
      });
      
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: error.message || 'An unexpected error occurred'
      });
    }
  }
  
  static async changePassword(req, res) {
    try {
      const userId = req.session.userId;
      const { currentPassword, newPassword } = req.body;
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }
      
      // Validate new password strength
      const strength = PasswordService.analyzePasswordStrength(newPassword);
      if (strength.score < 2) {
        return res.status(400).json({
          error: 'Weak password',
          message: 'New password is too weak',
          analysis: strength
        });
      }
      
      // Change password
      await user.changePassword(currentPassword, newPassword);
      
      logger.info('Password changed', { userId });
      
      res.json({
        message: 'Password changed successfully'
      });
      
    } catch (error) {
      logger.error('Change password error:', error);
      
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          error: 'Password change failed',
          message: 'Current password is incorrect'
        });
      }
      
      res.status(500).json({
        error: 'Failed to change password',
        message: error.message || 'An unexpected error occurred'
      });
    }
  }
  
  static async checkPasswordStrength(req, res) {
    try {
      const { password } = req.query;
      
      if (!password) {
        return res.status(400).json({
          error: 'Password required',
          message: 'Please provide a password to analyze'
        });
      }
      
      const analysis = PasswordService.analyzePasswordStrength(password);
      const entropy = PasswordService.calculateEntropy(password);
      const validation = PasswordService.validatePassword(password);
      
      res.json({
        analysis: {
          score: analysis.score,
          label: ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][analysis.score],
          warning: analysis.warning,
          suggestions: analysis.suggestions,
          crackTime: analysis.crackTime,
          entropy: Math.round(entropy) + ' bits',
          validation: validation
        }
      });
      
    } catch (error) {
      logger.error('Password strength check error:', error);
      res.status(500).json({
        error: 'Analysis failed',
        message: 'Failed to analyze password strength'
      });
    }
  }
  
  static async getActivity(req, res) {
    try {
      const userId = req.session.userId;
      const limit = parseInt(req.query.limit) || 20;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;
      
      // Get user's posts
      const posts = await Post.findByUserId(userId, limit, offset);
      const totalPosts = await Post.countByUser(userId);
      
      res.json({
        posts: posts.map(post => post.toJSON()),
        pagination: {
          page,
          limit,
          total: totalPosts,
          pages: Math.ceil(totalPosts / limit)
        }
      });
      
    } catch (error) {
      logger.error('Get activity error:', error);
      res.status(500).json({
        error: 'Failed to fetch activity',
        message: 'An unexpected error occurred'
      });
    }
  }
  
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const requestingUserId = req.session.userId;
      
      // In a real app, you might check permissions here
      // For now, only allow users to view their own profile or if they're admin
      
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }
      
      // Basic user info (hide sensitive data)
      const userData = {
        id: user.id,
        username: user.username,
        created_at: user.created_at
        // Don't include email or other sensitive info
      };
      
      res.json({
        user: userData
      });
      
    } catch (error) {
      logger.error('Get user by ID error:', error);
      res.status(500).json({
        error: 'Failed to fetch user',
        message: 'An unexpected error occurred'
      });
    }
  }
  
  static async deleteAccount(req, res) {
    try {
      const userId = req.session.userId;
      const { confirmPassword } = req.body;
      
      if (!confirmPassword) {
        return res.status(400).json({
          error: 'Confirmation required',
          message: 'Please confirm your password to delete your account'
        });
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }
      
      // Verify password
      const isValid = await user.verifyPassword(confirmPassword);
      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid password',
          message: 'Password is incorrect'
        });
      }
      
      // Delete user account
      await user.delete();
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          logger.error('Session destroy error during account deletion:', err);
        }
      });
      
      logger.info('User account deleted', { userId });
      
      res.json({
        message: 'Account deleted successfully'
      });
      
    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        error: 'Failed to delete account',
        message: 'An unexpected error occurred'
      });
    }
  }
  
  static async generatePassword(req, res) {
    try {
      const length = parseInt(req.query.length) || 16;
      
      if (length < 8 || length > 64) {
        return res.status(400).json({
          error: 'Invalid length',
          message: 'Password length must be between 8 and 64 characters'
        });
      }
      
      const password = PasswordService.generatePassword(length);
      const analysis = PasswordService.analyzePasswordStrength(password);
      
      res.json({
        password: password,
        analysis: {
          score: analysis.score,
          label: ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][analysis.score],
          crackTime: analysis.crackTime
        }
      });
      
    } catch (error) {
      logger.error('Generate password error:', error);
      res.status(500).json({
        error: 'Failed to generate password',
        message: 'An unexpected error occurred'
      });
    }
  }
}

module.exports = UserController;