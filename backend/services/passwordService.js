const bcrypt = require('bcrypt');
const zxcvbn = require('zxcvbn');
const { createLogger } = require('../utils/logger');

const logger = createLogger('PasswordService');

class PasswordService {
  static async hashPassword(password, rounds = 12) {
    return await bcrypt.hash(password, rounds);
  }
  
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
  
  static analyzePasswordStrength(password) {
    const analysis = zxcvbn(password);
    
    return {
      score: analysis.score, // 0-4
      warning: analysis.feedback.warning || null,
      suggestions: analysis.feedback.suggestions || [],
      crackTime: analysis.crack_times_display.offline_fast_hashing_1e10_per_second,
      guesses: analysis.guesses,
      guessesLog10: analysis.guesses_log10
    };
  }
  
  static calculateEntropy(password) {
    const charsetSize = this.getCharsetSize(password);
    return Math.log2(Math.pow(charsetSize, password.length));
  }
  
  static getCharsetSize(password) {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[^a-zA-Z0-9]/.test(password)) size += 32;
    return size;
  }
  
  static validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    const commonPasswords = ['password', '123456', 'qwerty', 'letmein', 'admin'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static generatePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }
}

module.exports = PasswordService;