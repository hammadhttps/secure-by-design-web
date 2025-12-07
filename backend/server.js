const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const csrf = require('csurf');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// Middleware - Order is important!
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Required for CSRF with cookies

// Session configuration - MUST be before CSRF
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: true, // Changed to true for CSRF token generation
  name: 'sessionId', // Explicit session name
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Debug middleware to log session info
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[${req.method}] ${req.path} - Session ID: ${req.session?.id || 'none'}, Cookie: ${req.headers.cookie ? 'present' : 'missing'}`);
  }
  next();
});

// CSRF protection - MUST be after cookie-parser and session middleware
// Using session-based CSRF (no cookie option needed when using sessions)
// Configure to ignore GET requests (default behavior, but explicit for clarity)
const csrfProtection = csrf({ 
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'] 
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'security_project',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✓ Database connection successful!');
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User: ${dbConfig.user}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Database connection failed!');
    console.error('  Error:', error.message);
    console.error('\nPlease check:');
    console.error('  1. XAMPP MySQL is running');
    console.error('  2. Database "security_project" exists');
    console.error('  3. MySQL credentials are correct');
    console.error('  4. Port 3306 is not blocked');
    return false;
  }
}

// Create tables
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Users table with secure password storage
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      )
    `);
    
    // Posts table (for demonstrating prepared statements)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Failed login attempts table (for brute force protection)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS failed_logins (
        id INT PRIMARY KEY AUTO_INCREMENT,
        ip_address VARCHAR(45),
        email VARCHAR(100),
        attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip (ip_address),
        INDEX idx_time (attempt_time)
      )
    `);
    
    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Password hashing utility
const saltRounds = 12;

async function hashPassword(password) {
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// CSRF error handler - must be before routes that use CSRF
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('CSRF token error:', err.message);
    console.error('Request path:', req.path);
    console.error('Request method:', req.method);
    console.error('Session ID:', req.session?.id);
    console.error('CSRF token received:', req.headers['x-csrf-token'] || req.body?._csrf || 'none');
    console.error('Cookies:', req.headers.cookie || 'none');
    return res.status(403).json({ 
      error: 'Invalid CSRF token',
      message: 'Please refresh the page and try again'
    });
  }
  next(err);
});

// CSRF token endpoint - GET requests are ignored by CSRF validation
// The middleware is needed to generate the token via req.csrfToken()
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  try {
    // Ensure session is initialized
    if (!req.session) {
      console.error('No session found when generating CSRF token');
      return res.status(500).json({ 
        error: 'Session not initialized',
        message: 'Please ensure cookies are enabled' 
      });
    }
    const token = req.csrfToken();
    // Explicitly save the session to ensure it persists
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).json({ 
          error: 'Failed to save session',
          message: err.message 
        });
      }
      console.log('CSRF token generated for session:', req.sessionID);
      res.json({ csrfToken: token });
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate CSRF token',
      message: error.message 
    });
  }
});


// Registration endpoint with password hashing
app.post('/api/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('username').trim().isLength({ min: 3 }).matches(/^[a-zA-Z0-9_]+$/)
], csrfProtection, async (req, res) => {
  console.log('Registration request received');
  console.log('Session ID:', req.session?.id);
  console.log('All headers:', JSON.stringify(req.headers, null, 2));
  console.log('CSRF token in header (x-csrf-token):', req.headers['x-csrf-token']);
  console.log('CSRF token in header (X-CSRF-Token):', req.headers['x-csrf-token']);
  console.log('Request body keys:', Object.keys(req.body || {}));
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;
  
  try {
    const connection = await pool.getConnection();
    
    // Check if user exists using prepared statement
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Insert user with prepared statement
    const [result] = await connection.execute(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    
    connection.release();
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: result.insertId 
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Login endpoint with brute force protection
app.post('/api/login', csrfProtection, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;
  
  try {
    const connection = await pool.getConnection();
    
    // Check recent failed attempts
    const [failedAttempts] = await connection.execute(
      `SELECT COUNT(*) as count FROM failed_logins 
       WHERE ip_address = ? AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [ip]
    );
    
    if (failedAttempts[0].count > 5) {
      connection.release();
      return res.status(429).json({ 
        error: 'Too many failed attempts. Please try again later.' 
      });
    }
    
    // Get user with prepared statement
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      // Log failed attempt
      await connection.execute(
        'INSERT INTO failed_logins (ip_address, email) VALUES (?, ?)',
        [ip, email]
      );
      connection.release();
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      // Log failed attempt
      await connection.execute(
        'INSERT INTO failed_logins (ip_address, email) VALUES (?, ?)',
        [ip, email]
      );
      connection.release();
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Clear failed attempts on successful login
    await connection.execute(
      'DELETE FROM failed_logins WHERE ip_address = ?',
      [ip]
    );
    
    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    
    connection.release();
    res.json({ 
      message: 'Login successful',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create post with prepared statement
app.post('/api/posts', csrfProtection, [
  body('title').trim().isLength({ min: 1, max: 200 }).escape(),
  body('content').trim().isLength({ min: 1 }).escape()
], async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { title, content } = req.body;
  
  try {
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
      [req.session.userId, title, content]
    );
    
    connection.release();
    res.status(201).json({ 
      message: 'Post created successfully',
      postId: result.insertId 
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get posts with safe output
app.get('/api/posts', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [posts] = await connection.execute(`
      SELECT p.*, u.username 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
      LIMIT 50
    `);
    
    connection.release();
    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database connection test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute('SELECT 1 as test, DATABASE() as current_db, USER() as `current_user`, VERSION() as mysql_version');
    connection.release();
    
    res.json({
      status: 'connected',
      database: result[0].current_db,
      user: result[0].current_user,
      mysqlVersion: result[0].mysql_version,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Global error handler - must be last
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize and start server
const PORT = process.env.PORT || 3000;
async function startServer() {
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('\nServer startup aborted due to database connection failure.');
    process.exit(1);
  }
  
  // Initialize database tables
  await initializeDatabase();
  
  // Start server
  app.listen(PORT, () => {
    console.log(`\n✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ API endpoints available at http://localhost:${PORT}/api`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});