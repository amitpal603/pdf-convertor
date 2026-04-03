const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const BlacklistedToken = require('../models/BlacklistedTokenModel');

/**
 * Authentication Middleware
 * 
 * Verifies the presence and validity of the accessToken in cookies.
 * Checks for blacklisted tokens and attaches the user to the request.
 */
const authMiddleware = async (req, res, next) => {
    try {
        // 1. Extract Token from Cookies OR Authorization Header
        let token = req.cookies.accessToken;

        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No login credentials found. Please login.' 
            });
        }

        // 2. Check Blacklist
        const isBlacklisted = await BlacklistedToken.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({ 
                success: false, 
                message: 'Session expired. Please login again.' 
            });
        }

        // 3. Verify Token
        const decoded = jwt.verify(token, process.env.ACCESS_SECRET_TOKEN);

        // 4. Find User and Attach to Request
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found. Session invalid.' 
            });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Session expired. Please refresh your token.' 
            });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid security token. Please login again.' 
            });
        }
        next(err);
    }
};

module.exports = authMiddleware;
