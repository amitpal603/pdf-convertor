const Service = require('../models/ServiceModel');
const { cache } = require('../config/redis');

/**
 * Get all services (tools)
 * Implements Cache-Aside pattern for 'Base Data Fetch'
 */
exports.getAllServices = async (req, res, next) => {
    try {
        const cacheKey = 'base:services';
        
        // 1. Try to get from cache
        const cachedServices = await cache.get(cacheKey);
        if (cachedServices) {
            return res.status(200).json({
                success: true,
                count: cachedServices.length,
                data: cachedServices,
                source: 'cache'
            });
        }

        // 2. If not in cache, fetch from MongoDB
        const services = await Service.find().sort({ displayOrder: 1 });

        // 3. Store in cache (TTL: 24 hours as services change rarely)
        if (services.length > 0) {
            await cache.set(cacheKey, services, 86400); 
        }

        res.status(200).json({
            success: true,
            count: services.length,
            data: services,
            source: 'database'
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Create a new service (Admin only or for initial setup)
 */
exports.createService = async (req, res, next) => {
    try {
        const service = await Service.create(req.body);
        
        // Invalidate services cache
        await cache.del('base:services');

        res.status(201).json({
            success: true,
            data: service
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete a service
 */
exports.deleteService = async (req, res, next) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        
        // Invalidate services cache
        await cache.del('base:services');

        res.status(200).json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (err) {
        next(err);
    }
};
