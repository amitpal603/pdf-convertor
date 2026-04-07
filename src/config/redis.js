const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('connect', () => {
    console.log('✅ Redis Client Connected');
});

redisClient.on('error', (err) => {
    console.error('❌ Redis Error:', err.message);
});

// Initialize connection
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('❌ Could not connect to Redis:', err.message);
    }
})();

/**
 * Cache Wrapper Functions
 */
const cache = {
    async get(key) {
        try {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (err) {
            console.error(`Redis Get Error [${key}]:`, err.message);
            return null;
        }
    },

    async set(key, value, ttlSeconds = 3600) {
        try {
            await redisClient.set(key, JSON.stringify(value), {
                EX: ttlSeconds
            });
        } catch (err) {
            console.error(`Redis Set Error [${key}]:`, err.message);
        }
    },

    async del(key) {
        try {
            await redisClient.del(key);
        } catch (err) {
            console.error(`Redis Del Error [${key}]:`, err.message);
        }
    },

    async delPrefix(prefix) {
        try {
            const keys = await redisClient.keys(`${prefix}*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (err) {
            console.error(`Redis DelPrefix Error [${prefix}]:`, err.message);
        }
    }
};

module.exports = { redisClient, cache };

