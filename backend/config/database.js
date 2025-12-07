const mysql = require('mysql2/promise');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Database');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'security_project',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

const pool = mysql.createPool(dbConfig);

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('Database connection successful');
    logger.info(`Host: ${dbConfig.host}:${dbConfig.port}`);
    logger.info(`Database: ${dbConfig.database}`);
    logger.info(`User: ${dbConfig.user}`);
    connection.release();
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    logger.error('\nPlease check:');
    logger.error('  1. XAMPP MySQL is running');
    logger.error('  2. Database exists');
    logger.error('  3. MySQL credentials are correct');
    return false;
  }
}

async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Posts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Failed login attempts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS failed_logins (
        id INT PRIMARY KEY AUTO_INCREMENT,
        ip_address VARCHAR(45),
        email VARCHAR(100),
        attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip (ip_address),
        INDEX idx_time (attempt_time),
        INDEX idx_email_ip (email, ip_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Hash comparisons table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS hash_comparisons (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        bcrypt_hash VARCHAR(255),
        argon2_hash VARCHAR(255),
        bcrypt_time_ms INT,
        argon2_time_ms INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    connection.release();
    logger.info('Database tables initialized successfully');
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
}

// Export functions
module.exports = {
  pool,
  getConnection: () => pool.getConnection(),
  testConnection,
  initializeDatabase,
  query: (sql, params) => pool.execute(sql, params)
};