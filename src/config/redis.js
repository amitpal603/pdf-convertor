const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            // Only reconnect when the error contains "READONLY"
            return true;
        }
        return false;
    }
});

redisClient.on('connect', () => {
    console.log('✅ Redis Connected');
});

redisClient.on('error', (err) => {
    console.error('❌ Redis Error:', err.message);
});

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
            await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
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
                await redisClient.del(...keys);
            }
        } catch (err) {
            console.error(`Redis DelPrefix Error [${prefix}]:`, err.message);
        }
    }
};

module.exports = { redisClient, cache };
