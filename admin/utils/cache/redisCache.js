// utils/cache.js
const redisClient = require('../redisClient');

// Gracefully handle Redis get
exports.get = async (key) => {
    try {
        return await redisClient.get(key);
    } catch (err) {
        console.warn(`Redis GET failed for ${key}:`, err.message);
        return null;
    }
};

// Gracefully handle Redis set
exports.set = async (key, val, ttl) => {
    try {
        await redisClient.set(key, val, { EX: ttl });
    } catch (err) {
        console.warn(`Redis SET failed for ${key}:`, err.message);
    }
};

// Optional: Clear key with fallback
exports.del = async (key) => {
    try {
        await redisClient.del(key);
    } catch (err) {
        console.warn(`Redis DEL failed for ${key}:`, err.message);
    }
};
