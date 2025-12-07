const { createLogger } = require('../utils/logger');
const { pool } = require('../config/database');
const User = require('./User');

const logger = createLogger('PostModel');

class Post {
  constructor(id, user_id, title, content, created_at, user = null) {
    this.id = id;
    this.user_id = user_id;
    this.title = title;
    this.content = content;
    this.created_at = created_at;
    this.user = user;
  }

  static async create({ userId, title, content }) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [userId, title, content]
      );
      
      return new Post(
        result.insertId,
        userId,
        title,
        content,
        new Date()
      );
    } catch (error) {
      logger.error('Error creating post:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM posts WHERE id = ? LIMIT 1',
        [id]
      );
      
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return new Post(
        row.id,
        row.user_id,
        row.title,
        row.content,
        row.created_at
      );
    } catch (error) {
      logger.error('Error finding post by id:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findByUserId(userId, limit = 20, offset = 0) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [userId, limit, offset]
      );
      
      return rows.map(row => new Post(
        row.id,
        row.user_id,
        row.title,
        row.content,
        row.created_at
      ));
    } catch (error) {
      logger.error('Error finding posts by user id:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAllWithUsers(limit = 50, offset = 0) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(`
        SELECT p.*, u.username, u.email 
        FROM posts p 
        LEFT JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC 
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      return rows.map(row => {
        const post = new Post(
          row.id,
          row.user_id,
          row.title,
          row.content,
          row.created_at
        );
        
        if (row.username) {
          post.user = {
            username: row.username,
            email: row.email
          };
        }
        
        return post;
      });
    } catch (error) {
      logger.error('Error getting all posts with users:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async update(updates) {
    const connection = await pool.getConnection();
    try {
      const allowedUpdates = ['title', 'content'];
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
        `UPDATE posts SET ${setClause} WHERE id = ?`,
        values
      );
      
      // Update instance properties
      Object.assign(this, updatesToApply);
      
      return this;
    } catch (error) {
      logger.error('Error updating post:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async delete() {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'DELETE FROM posts WHERE id = ?',
        [this.id]
      );
      
      return true;
    } catch (error) {
      logger.error('Error deleting post:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getUser() {
    if (this.user) return this.user;
    
    try {
      const user = await User.findById(this.user_id);
      this.user = user ? user.toJSON() : null;
      return this.user;
    } catch (error) {
      logger.error('Error getting post user:', error);
      return null;
    }
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      title: this.title,
      content: this.content,
      created_at: this.created_at,
      user: this.user
    };
  }

  static async count() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM posts');
      return rows[0].count;
    } catch (error) {
      logger.error('Error counting posts:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async countByUser(userId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT COUNT(*) as count FROM posts WHERE user_id = ?',
        [userId]
      );
      return rows[0].count;
    } catch (error) {
      logger.error('Error counting posts by user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Post;