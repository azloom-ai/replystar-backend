const express = require('express');
const router = express.Router();
const { submitReview, getReviews, replyReview, generateAIReply, getStats } = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth');

router.post('/submit/:slug', submitReview);
router.get('/', authMiddleware, getReviews);
router.post('/:id/reply', authMiddleware, replyReview);
router.get('/:id/ai-reply', authMiddleware, generateAIReply);
router.get('/stats/summary', authMiddleware, getStats);

module.exports = router;
