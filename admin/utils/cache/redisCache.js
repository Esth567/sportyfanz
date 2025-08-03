// cache/redisCache.js
const getRedisClient  = require('../../utils/redisClient');


// Gracefully handle Redis GET
exports.get = async (key) => {
  try {
    const redisClient = await getRedisClient();
    return await redisClient.get(key);
  } catch (err) {
    console.warn(`Redis GET failed for ${key}:`, err.message);
    return null;
  }
};

// Gracefully handle Redis SET
exports.set = async (key, value, ttlSeconds = 1800) => {
  try {
    const redisClient = await getRedisClient(); // ✅ Add this line
    await redisClient.set(key, value, { EX: ttlSeconds });
  } catch (err) {
    console.warn(`⚠️ Redis SET failed for ${key}:`, err.message);
  }
};

// Optional: DEL
exports.del = async (key) => {
  try {
    const redisClient = await getRedisClient(); // ✅ Add this line
    await redisClient.del(key);
  } catch (err) {
    console.warn(`Redis DEL failed for ${key}:`, err.message);
  }
};
