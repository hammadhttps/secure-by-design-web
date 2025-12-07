const DatabaseService = require('../services/databaseService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('PostController');

class PostController {
  static async createPost(req, res) {
    try {
      const { title, content } = req.body;
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'You must be logged in to create posts'
        });
      }
      
      const postId = await DatabaseService.insert('posts', {
        user_id: userId,
        title: title,
        content: content
      });
      
      logger.info('Post created', { postId, userId });
      
      res.status(201).json({
        message: 'Post created successfully',
        postId: postId
      });
      
    } catch (error) {
      logger.error('Create post error:', error);
      res.status(500).json({
        error: 'Failed to create post',
        message: error.message
      });
    }
  }
  
  static async getPosts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;
      
      // Get total count
      const countResults = await DatabaseService.executeQuery(
        'SELECT COUNT(*) as total FROM posts'
      );
      const total = countResults[0]?.total || 0;
      
      // Get posts with user info - use LEFT JOIN in case user is deleted
      const posts = await DatabaseService.executeQuery(`
        SELECT p.*, u.username, u.email 
        FROM posts p 
        LEFT JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC 
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      // Ensure posts is always an array
      const postsArray = Array.isArray(posts) ? posts : [];
      
      res.json({
        posts: postsArray,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      logger.error('Get posts error:', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        error: 'Failed to fetch posts',
        message: error.message
      });
    }
  }
  
  static async getPostById(req, res) {
    try {
      const { id } = req.params;
      
      const posts = await DatabaseService.executeQuery(`
        SELECT p.*, u.username, u.email 
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.id = ?
      `, [id]);
      
      if (posts.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Post not found'
        });
      }
      
      res.json({
        post: posts[0]
      });
      
    } catch (error) {
      logger.error('Get post error:', error);
      res.status(500).json({
        error: 'Failed to fetch post',
        message: error.message
      });
    }
  }
  
  static async updatePost(req, res) {
    try {
      const { id } = req.params;
      const { title, content } = req.body;
      const userId = req.session.userId;
      
      // Check if post exists and belongs to user
      const post = await DatabaseService.findOne('posts', { id });
      
      if (!post) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Post not found'
        });
      }
      
      if (post.user_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only edit your own posts'
        });
      }
      
      await DatabaseService.update('posts', 
        { title, content, updated_at: new Date() },
        { id }
      );
      
      logger.info('Post updated', { postId: id, userId });
      
      res.json({
        message: 'Post updated successfully'
      });
      
    } catch (error) {
      logger.error('Update post error:', error);
      res.status(500).json({
        error: 'Failed to update post',
        message: error.message
      });
    }
  }
  
  static async deletePost(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      
      // Check if post exists and belongs to user
      const post = await DatabaseService.findOne('posts', { id });
      
      if (!post) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Post not found'
        });
      }
      
      if (post.user_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only delete your own posts'
        });
      }
      
      await DatabaseService.delete('posts', { id });
      
      logger.info('Post deleted', { postId: id, userId });
      
      res.json({
        message: 'Post deleted successfully'
      });
      
    } catch (error) {
      logger.error('Delete post error:', error);
      res.status(500).json({
        error: 'Failed to delete post',
        message: error.message
      });
    }
  }
}

module.exports = PostController;