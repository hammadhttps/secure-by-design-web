const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import configurations
const securityConfig = require('./config/security');
const databaseConfig = require('./config/database');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { csrfProtection, csrfErrorHandler } = require('./middleware/csrfProtection');

// Import routes
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const hashComparisonRoutes = require('./routes/hashComparisonRoutes');

const app = express();

// Security middleware
app.use(helmet(securityConfig.helmet));
app.use(cors(securityConfig.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware (development only)
if (process.env.NODE_ENV === 'development') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
  
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[${req.method}] ${req.path} - Session: ${req.session?.id || 'none'}`);
    }
    next();
  });
}

// Rate limiting
const limiter = rateLimit(securityConfig.rateLimit);
app.use('/api/', limiter);

// Session configuration
const sessionConfig = securityConfig.session;
const session = require('express-session');
app.use(session(sessionConfig));

// CSRF protection
app.use(csrfProtection);
app.use(csrfErrorHandler);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hash-comparisons', hashComparisonRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Database test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const connection = await require('./config/database').getConnection();
    const [result] = await connection.execute('SELECT 1 as test, DATABASE() as db, VERSION() as version');
    connection.release();
    
    res.json({
      status: 'connected',
      database: result[0].db,
      version: result[0].version,
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found` 
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await databaseConfig.testConnection();
    
    // Initialize database
    await databaseConfig.initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on http://localhost:${PORT}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ Database: ${process.env.DB_NAME || 'security_project'}`);
      console.log(`\nAvailable endpoints:`);
      console.log(`  - http://localhost:${PORT}/api/health`);
      console.log(`  - http://localhost:${PORT}/api/db-test`);
      console.log(`  - http://localhost:${PORT}/api/auth/csrf-token`);
      console.log(`  - http://localhost:${PORT}/api/auth/register`);
      console.log(`  - http://localhost:${PORT}/api/auth/login`);
      console.log(`  - http://localhost:${PORT}/api/hash-comparisons/my`);
      console.log(`  - http://localhost:${PORT}/api/hash-comparisons/all`);
      console.log(`  - http://localhost:${PORT}/api/hash-comparisons/test`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();