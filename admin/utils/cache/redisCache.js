// cache/redisCache.js
const getRedisClient  = require('../redisClient');


// Gracefully handle Redis get
exports.get = async (key) => {
  try {
    const redisClient = await getRedisClient();
    return await redisClient.get(key);
  } catch (err) {
    console.warn(`Redis GET failed for ${key}:`, err.message);
    return null;
  }
};

// Gracefully handle Redis set
exports.set = async (key, value, ttlSeconds = 1800) => {
  try {
    const redisClient = await getRedisClient(); // ✅ added
    await redisClient.set(key, value, { EX: ttlSeconds });
  } catch (err) {
    console.warn(`⚠️ Redis SET failed for ${key}:`, err.message);
  }
};

// Optional: Clear key with fallback
exports.del = async (key) => {
  try {
    const redisClient = await getRedisClient(); // ✅ added
    await redisClient.del(key);
  } catch (err) {
    console.warn(`Redis DEL failed for ${key}:`, err.message);
  }
};
