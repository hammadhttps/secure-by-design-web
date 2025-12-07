const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const HashComparisonController = require('../controllers/hashComparisonController');

// Get current user's hash comparisons (requires auth)
router.get('/my', requireAuth, HashComparisonController.getMyComparisons);

// Get all hash comparisons with statistics (requires auth)
router.get('/all', requireAuth, HashComparisonController.getAllComparisons);

// Verify password against a comparison (requires auth)
router.post('/:id/verify', requireAuth, HashComparisonController.verifyComparison);

// Test hash comparison (optional auth - can be used for testing)
router.post('/test', HashComparisonController.testHashComparison);

module.exports = router;

