import DOMPurify from 'dompurify';
import { z } from 'zod';

// Input validation schemas using Zod
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  
  email: z.string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must be less than 100 characters'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const postSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .regex(/^[^<>]*$/, 'Title cannot contain HTML tags'),
  
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),
});

// XSS Prevention - Sanitize output
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
  });
};

// Secure local storage operations
class SecureStorage {
  constructor() {
    this.prefix = 'secure_app_';
  }

  setItem(key, value, useSessionStorage = false) {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    const secureKey = this.prefix + key;
    storage.setItem(secureKey, JSON.stringify(value));
  }

  getItem(key, useSessionStorage = false) {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    const secureKey = this.prefix + key;
    const item = storage.getItem(secureKey);
    return item ? JSON.parse(item) : null;
  }

  removeItem(key, useSessionStorage = false) {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    const secureKey = this.prefix + key;
    storage.removeItem(secureKey);
  }

  clear(useSessionStorage = false) {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    Object.keys(storage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        storage.removeItem(key);
      }
    });
  }
}

export const secureStorage = new SecureStorage();

// Password strength checker
export const checkPasswordStrength = (password) => {
  let score = 0;
  let feedback = [];
  
  if (password.length >= 8) score += 1;
  else feedback.push('At least 8 characters');
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters');
  
  let strength = 'Weak';
  if (score >= 4) strength = 'Strong';
  else if (score >= 3) strength = 'Medium';
  
  return { score, strength, feedback };
};

// Frontend rate limiting simulation
export class RateLimiter {
  constructor(maxAttempts = 5, timeWindow = 30000) {
    this.maxAttempts = maxAttempts;
    this.timeWindow = timeWindow;
    this.attempts = new Map();
  }

  attempt(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    // Remove old attempts
    const recentAttempts = userAttempts.filter(time => now - time < this.timeWindow);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false; // Too many attempts
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  clear(key) {
    this.attempts.delete(key);
  }
}

// Export a global rate limiter for forms
export const formRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute