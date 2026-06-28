const express = require('express');
const router = express.Router();
const { submitReview, getReviews, replyReview, generateAIReply, getStats, getLeads } = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth');

router.post('/submit/:slug', submitReview);
router.get('/', authMiddleware, getReviews);
router.post('/:id/reply', authMiddleware, replyReview);
router.get('/:id/ai-reply', authMiddleware, generateAIReply);
router.get('/stats/summary', authMiddleware, getStats);
router.get('/leads', authMiddleware, getLeads);

module.exports = router;
