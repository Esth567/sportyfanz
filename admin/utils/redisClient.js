//utils/ redisClient.js
const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true, // ✅ Important for Upstash
  },
});

client.on('error', err => console.error('Redis error:', err));

(async () => {
  try {
    await client.connect();
    console.log('Redis connected ✅');
  } catch (err) {
    console.error('Redis connection error:', err);
  }
})();

module.exports = client;
