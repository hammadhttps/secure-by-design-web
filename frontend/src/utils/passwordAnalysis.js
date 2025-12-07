// src/utils/passwordAnalysis.js
import zxcvbn from 'zxcvbn';  // Add this dependency

export class PasswordAnalyzer {
  static analyzePassword(password) {
    const zxcvbnResult = zxcvbn(password);
    const entropy = this.calculateEntropy(password);
    const crackTime = this.estimateCrackTime(zxcvbnResult);
    
    return {
      score: zxcvbnResult.score, // 0-4
      entropy,
      crackTime,
      warnings: zxcvbnResult.feedback.warning,
      suggestions: zxcvbnResult.feedback.suggestions,
      guessLog10: zxcvbnResult.guesses_log10,
      pattern: this.detectPattern(password)
    };
  }
  
  static calculateEntropy(password) {
    const charsetSize = this.getCharsetSize(password);
    return password.length * Math.log2(charsetSize);
  }
  
  static getCharsetSize(password) {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[^a-zA-Z0-9]/.test(password)) size += 33;
    return size;
  }
}