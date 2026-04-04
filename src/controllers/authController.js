const User = require('../models/UserModel');
const BlacklistedToken = require('../models/BlacklistedTokenModel');
const jwt = require('jsonwebtoken');

/**
 * Register a new user
 */
exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Create new user (password is hashed in pre-save hook)
        const user = await User.create({ name, email, password });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Login user and generate tokens
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate Tokens
        const accessToken = jwt.sign(
            { id: user._id, email: user.email },
            process.env.ACCESS_SECRET_TOKEN,
            { expiresIn: '1d' } // 1 day for access token
        );

        const refreshToken = jwt.sign(
            { id: user._id },
            process.env.REFRESH_SECRET_TOKEN,
            { expiresIn: '7d' } // 7 days for refresh token
        );

        // Store refresh token in user record
        user.refreshToken = refreshToken;
        await user.save();

        // Set Cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Secure in production
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'Lax',
        };

        res.cookie('accessToken', accessToken, { 
            ...cookieOptions, 
            maxAge: 24 * 60 * 60 * 1000 // 1 day 
        });

        res.cookie('refreshToken', refreshToken, { 
            ...cookieOptions, 
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days 
        });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            accessToken 
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Logout user and clear cookies
 */
exports.logout = async (req, res, next) => {
    try {
        let token = req.cookies.accessToken;

        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (token) {
            // Decode token to get expiration time
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp) {
                // Add token to blacklist
                await BlacklistedToken.create({
                    token,
                    expiresAt: new Date(decoded.exp * 1000)
                });
            }

            const userId = decoded ? decoded.id : null;
            if (userId) {
                await User.findByIdAndUpdate(userId, { refreshToken: null });
            }
        }

        // Clear Cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get current authenticated user profile
 */
exports.getMe = async (req, res, next) => {
    const {id} = req.user
    try {

        const user = await User.findById(id).select('-password -refreshToken')
        if(!user){
            return res.status(404).json({
                success: false,
                message: 'User not found'
            })
        }
        res.status(200).json({
            success: true,
            user: user
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Refresh Token Controller
 * 
 * Securely regenerates the access token and rotates the refresh token.
 */
exports.refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({ success: false, message: 'No refresh token provided. Please login.' });
        }

        // Verify Refresh Token
        const decoded = jwt.verify(token, process.env.REFRESH_SECRET_TOKEN);

        // Find user and check if the stored refresh token matches the provided one
        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== token) {
            return res.status(403).json({ success: false, message: 'Invalid or expired refresh token. Please login again.' });
        }

        // Generate NEW tokens (Rotation)
        const newAccessToken = jwt.sign(
            { id: user._id, email: user.email },
            process.env.ACCESS_SECRET_TOKEN,
            { expiresIn: '1d' }
        );

        const newRefreshToken = jwt.sign(
            { id: user._id },
            process.env.REFRESH_SECRET_TOKEN,
            { expiresIn: '7d' }
        );

        // Update user's refresh token in database
        user.refreshToken = newRefreshToken;
        await user.save();

        // Set Updated Cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'Lax',
        };

        res.cookie('accessToken', newAccessToken, { 
            ...cookieOptions, 
            maxAge: 24 * 60 * 60 * 1000 // 1 day 
        });

        res.cookie('refreshToken', newRefreshToken, { 
            ...cookieOptions, 
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days 
        });

        res.status(200).json({
            success: true,
            message: 'Token renewed successfully'
        });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Refresh token expired. Please login again.' });
        }
        next(err);
    }
};
