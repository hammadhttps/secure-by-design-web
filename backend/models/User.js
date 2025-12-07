const bcrypt = require('bcrypt');
const { createLogger } = require('../utils/logger');
const { pool } = require('../config/database');

const logger = createLogger('UserModel');

class User {
  constructor(id, username, email, password_hash, created_at) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password_hash = password_hash;
    this.created_at = created_at;
  }

  static async create({ username, email, password }) {
    const connection = await pool.getConnection();
    try {
      // Hash password with bcrypt
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);
      
      const [result] = await connection.execute(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, password_hash]
      );
      
      return new User(
        result.insertId,
        username,
        email,
        password_hash,
        new Date()
      );
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findByEmail(email) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE email = ? LIMIT 1',
        [email]
      );
      
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return new User(
        row.id,
        row.username,
        row.email,
        row.password_hash,
        row.created_at
      );
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE id = ? LIMIT 1',
        [id]
      );
      
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return new User(
        row.id,
        row.username,
        row.email,
        row.password_hash,
        row.created_at
      );
    } catch (error) {
      logger.error('Error finding user by id:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findByUsername(username) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE username = ? LIMIT 1',
        [username]
      );
      
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return new User(
        row.id,
        row.username,
        row.email,
        row.password_hash,
        row.created_at
      );
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  async updateProfile(updates) {
    const connection = await pool.getConnection();
    try {
      const allowedUpdates = ['username', 'email'];
      const updatesToApply = {};
      
      for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
          updatesToApply[key] = updates[key];
        }
      }
      
      if (Object.keys(updatesToApply).length === 0) {
        return this;
      }
      
      const setClause = Object.keys(updatesToApply)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = Object.values(updatesToApply);
      values.push(this.id);
      
      await connection.execute(
        `UPDATE users SET ${setClause} WHERE id = ?`,
        values
      );
      
      // Update instance properties
      Object.assign(this, updatesToApply);
      
      return this;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async changePassword(currentPassword, newPassword) {
    // Verify current password
    const isValid = await this.verifyPassword(currentPassword);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, this.id]
      );
      
      // Update instance
      this.password_hash = newPasswordHash;
      
      return true;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async delete() {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [this.id]
      );
      
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      created_at: this.created_at
    };
  }

  static async count() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
      return rows[0].count;
    } catch (error) {
      logger.error('Error counting users:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAll(limit = 50, offset = 0) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      
      return rows.map(row => new User(
        row.id,
        row.username,
        row.email,
        row.password_hash,
        row.created_at
      ));
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = User;