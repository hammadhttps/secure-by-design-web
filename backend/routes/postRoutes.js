const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../middleware/csrfProtection');
const { requireAuth } = require('../middleware/auth');
const { validate, postValidation } = require('../middleware/validation');
const PostController = require('../controllers/postController');

// Apply authentication middleware to all post routes
router.use(requireAuth);

// GET /api/posts
router.get('/', PostController.getPosts);

// GET /api/posts/:id
router.get('/:id', PostController.getPostById);

// POST /api/posts
router.post('/', 
  csrfProtection, 
  validate(postValidation), 
  PostController.createPost
);

// PUT /api/posts/:id
router.put('/:id', 
  csrfProtection, 
  validate(postValidation), 
  PostController.updatePost
);

// DELETE /api/posts/:id
router.delete('/:id', 
  csrfProtection, 
  PostController.deletePost
);

module.exports = router;