const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { createLogger } = require('../utils/logger');

const logger = createLogger('AuthService');
const saltRounds = 12;

class AuthService {
  static async hashPassword(password) {
    return await bcrypt.hash(password, saltRounds);
  }
  
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
  
  static async createUser(userData) {
    const { username, email, password } = userData;
    
    // Check if user exists
    const [existing] = await query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    
    if (existing.length > 0) {
      throw new Error('User already exists');
    }
    
    // Hash password
    const passwordHash = await this.hashPassword(password);
    
    // Insert user
    const [result] = await query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    
    const userId = result.insertId;
    
    // Save hash comparison (async, don't wait for it)
    const HashComparisonService = require('./hashComparisonService');
    HashComparisonService.saveComparison(userId, password)
      .catch(err => {
        logger.warn('Failed to save hash comparison (non-critical):', err.message);
      });
    
    return {
      id: userId,
      username,
      email
    };
  }
  
  static async authenticateUser(email, password) {
    // Get user
    const [users] = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    const user = users[0];
    
    // Verify password
    const isValid = await this.verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      throw new Error('Invalid password');
    }
    
    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  static async recordFailedLogin(ip, email) {
    try {
      await query(
        'INSERT INTO failed_logins (ip_address, email) VALUES (?, ?)',
        [ip, email]
      );
    } catch (error) {
      logger.error('Failed to record failed login:', error);
    }
  }
  
  static async getFailedLoginCount(ip) {
    try {
      const [result] = await query(
        `SELECT COUNT(*) as count FROM failed_logins 
         WHERE ip_address = ? AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
        [ip]
      );
      return result[0].count;
    } catch (error) {
      logger.error('Failed to get failed login count:', error);
      return 0;
    }
  }
  
  static async clearFailedLogins(ip) {
    try {
      await query(
        'DELETE FROM failed_logins WHERE ip_address = ?',
        [ip]
      );
    } catch (error) {
      logger.error('Failed to clear failed logins:', error);
    }
  }

  static async getFailedLoginAttemptsForEmail(email, limit = 10) {
    try {
      const [results] = await query(
        `SELECT id, ip_address, email, attempt_time 
         FROM failed_logins 
         WHERE email = ? 
         ORDER BY attempt_time DESC 
         LIMIT ?`,
        [email, limit]
      );
      return results;
    } catch (error) {
      logger.error('Failed to get failed login attempts:', error);
      return [];
    }
  }
}

module.exports = AuthService;