/**
 * Admin Middleware
 * 
 * Verifies if the authenticated user has the 'admin' role.
 * Should be used AFTER authMiddleware.
 */
const adminMiddleware = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Authentication required.'
            });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. Admin access only.'
            });
        }

        next();
    } catch (err) {
        next(err);
    }
};

module.exports = adminMiddleware;
