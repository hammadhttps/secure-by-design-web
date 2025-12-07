const HashComparisonService = require('../services/hashComparisonService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('HashComparisonController');

class HashComparisonController {
  /**
   * Get hash comparisons for the current user
   * GET /api/hash-comparisons/my
   */
  static async getMyComparisons(req, res) {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'You must be logged in to view hash comparisons'
        });
      }
      
      const limit = parseInt(req.query.limit) || 10;
      const comparisons = await HashComparisonService.getComparisonsByUser(userId, limit);
      
      res.json({
        comparisons,
        count: comparisons.length
      });
    } catch (error) {
      logger.error('Get my comparisons error:', error);
      res.status(500).json({
        error: 'Failed to fetch hash comparisons',
        message: error.message
      });
    }
  }
  
  /**
   * Get all hash comparisons with statistics
   * GET /api/hash-comparisons/all
   */
  static async getAllComparisons(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const data = await HashComparisonService.getAllComparisons(limit);
      
      res.json(data);
    } catch (error) {
      logger.error('Get all comparisons error:', error);
      res.status(500).json({
        error: 'Failed to fetch hash comparisons',
        message: error.message
      });
    }
  }
  
  /**
   * Verify password against a stored comparison
   * POST /api/hash-comparisons/:id/verify
   */
  static async verifyComparison(req, res) {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Password is required'
        });
      }
      
      const result = await HashComparisonService.verifyComparison(parseInt(id), password);
      
      res.json({
        verification: result,
        faster: result.bcrypt.verifyTime < result.argon2.verifyTime ? 'bcrypt' : 'argon2',
        timeDifference: Math.abs(result.bcrypt.verifyTime - result.argon2.verifyTime)
      });
    } catch (error) {
      logger.error('Verify comparison error:', error);
      res.status(500).json({
        error: 'Failed to verify comparison',
        message: error.message
      });
    }
  }
  
  /**
   * Create a new hash comparison (for testing)
   * POST /api/hash-comparisons/test
   */
  static async testHashComparison(req, res) {
    try {
      const { password } = req.body;
      const userId = req.session.userId || null; // Optional, can be null for testing
      
      if (!password) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Password is required'
        });
      }
      
      const comparison = await HashComparisonService.saveComparison(userId, password);
      
      res.status(201).json({
        message: 'Hash comparison created successfully',
        comparison
      });
    } catch (error) {
      logger.error('Test hash comparison error:', error);
      res.status(500).json({
        error: 'Failed to create hash comparison',
        message: error.message
      });
    }
  }
}

module.exports = HashComparisonController;

