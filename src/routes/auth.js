const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, savePushToken, changePassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.post('/push-token', authMiddleware, savePushToken);
router.post('/change-password', authMiddleware, changePassword);

module.exports = router;
