const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, refreshToken } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// All authentication routes start with /api/auth/
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);

// Protected profile route
router.get('/me', authMiddleware, getMe);

module.exports = router;
