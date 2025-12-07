const { query } = require('../config/database');
const HashingComparison = require('../hashingComparison');
const { createLogger } = require('../utils/logger');

const logger = createLogger('HashComparisonService');

class HashComparisonService {
  /**
   * Save hash comparison to database
   * @param {number} userId - User ID
   * @param {string} password - Plain password (for hashing)
   * @returns {Promise<Object>} Comparison data
   */
  static async saveComparison(userId, password) {
    try {
      // Generate both hashes and measure time
      const comparison = await HashingComparison.hashAll(password);
      
      // Save to database (userId can be null for testing)
      const [result] = await query(
        `INSERT INTO hash_comparisons 
         (user_id, bcrypt_hash, argon2_hash, bcrypt_time_ms, argon2_time_ms) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId || null,
          comparison.bcrypt.hash,
          comparison.argon2.hash,
          comparison.bcrypt.time,
          comparison.argon2.time
        ]
      );
      
      logger.info('Hash comparison saved', {
        userId,
        comparisonId: result.insertId,
        bcryptTime: comparison.bcrypt.time,
        argon2Time: comparison.argon2.time
      });
      
      return {
        id: result.insertId,
        userId,
        bcryptTime: comparison.bcrypt.time,
        argon2Time: comparison.argon2.time,
        faster: comparison.bcrypt.time < comparison.argon2.time ? 'bcrypt' : 'argon2',
        timeDifference: Math.abs(comparison.bcrypt.time - comparison.argon2.time)
      };
    } catch (error) {
      logger.error('Failed to save hash comparison:', error);
      throw error;
    }
  }
  
  /**
   * Get hash comparisons for a user
   * @param {number} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Array of comparison records
   */
  static async getComparisonsByUser(userId, limit = 10) {
    try {
      const [results] = await query(
        `SELECT id, user_id, bcrypt_time_ms, argon2_time_ms, created_at
         FROM hash_comparisons 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userId, limit]
      );
      
      return results.map(row => ({
        id: row.id,
        userId: row.user_id,
        bcryptTime: row.bcrypt_time_ms,
        argon2Time: row.argon2_time_ms,
        faster: row.bcrypt_time_ms < row.argon2_time_ms ? 'bcrypt' : 'argon2',
        timeDifference: Math.abs(row.bcrypt_time_ms - row.argon2_time_ms),
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Failed to get hash comparisons:', error);
      throw error;
    }
  }
  
  /**
   * Get all hash comparisons with statistics
   * @param {number} limit - Number of records to return
   * @returns {Promise<Object>} Statistics and recent comparisons
   */
  static async getAllComparisons(limit = 50) {
    try {
      // Get recent comparisons
      const [recent] = await query(
        `SELECT hc.*, u.username, u.email
         FROM hash_comparisons hc
         LEFT JOIN users u ON hc.user_id = u.id
         ORDER BY hc.created_at DESC 
         LIMIT ?`,
        [limit]
      );
      
      // Get statistics
      const [stats] = await query(
        `SELECT 
           COUNT(*) as total_comparisons,
           AVG(bcrypt_time_ms) as avg_bcrypt_time,
           AVG(argon2_time_ms) as avg_argon2_time,
           SUM(CASE WHEN bcrypt_time_ms < argon2_time_ms THEN 1 ELSE 0 END) as bcrypt_faster_count,
           SUM(CASE WHEN argon2_time_ms < bcrypt_time_ms THEN 1 ELSE 0 END) as argon2_faster_count
         FROM hash_comparisons`
      );
      
      return {
        statistics: {
          totalComparisons: stats[0].total_comparisons || 0,
          avgBcryptTime: Math.round(stats[0].avg_bcrypt_time || 0),
          avgArgon2Time: Math.round(stats[0].avg_argon2_time || 0),
          bcryptFasterCount: stats[0].bcrypt_faster_count || 0,
          argon2FasterCount: stats[0].argon2_faster_count || 0
        },
        recent: recent.map(row => ({
          id: row.id,
          userId: row.user_id,
          username: row.username,
          email: row.email,
          bcryptTime: row.bcrypt_time_ms,
          argon2Time: row.argon2_time_ms,
          faster: row.bcrypt_time_ms < row.argon2_time_ms ? 'bcrypt' : 'argon2',
          timeDifference: Math.abs(row.bcrypt_time_ms - row.argon2_time_ms),
          createdAt: row.created_at
        }))
      };
    } catch (error) {
      logger.error('Failed to get all hash comparisons:', error);
      throw error;
    }
  }
  
  /**
   * Verify password against stored hashes
   * @param {number} comparisonId - Comparison record ID
   * @param {string} password - Plain password to verify
   * @returns {Promise<Object>} Verification results
   */
  static async verifyComparison(comparisonId, password) {
    try {
      // Get the stored hashes
      const [results] = await query(
        'SELECT bcrypt_hash, argon2_hash FROM hash_comparisons WHERE id = ?',
        [comparisonId]
      );
      
      if (results.length === 0) {
        throw new Error('Comparison record not found');
      }
      
      const { bcrypt_hash, argon2_hash } = results[0];
      
      // Verify both
      const startBcrypt = Date.now();
      const bcryptValid = await bcrypt.compare(password, bcrypt_hash);
      const bcryptVerifyTime = Date.now() - startBcrypt;
      
      const startArgon2 = Date.now();
      const argon2Valid = await argon2.verify(argon2_hash, password);
      const argon2VerifyTime = Date.now() - startArgon2;
      
      return {
        bcrypt: {
          valid: bcryptValid,
          verifyTime: bcryptVerifyTime
        },
        argon2: {
          valid: argon2Valid,
          verifyTime: argon2VerifyTime
        },
        bothValid: bcryptValid && argon2Valid
      };
    } catch (error) {
      logger.error('Failed to verify comparison:', error);
      throw error;
    }
  }
}

module.exports = HashComparisonService;

