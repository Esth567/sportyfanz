//utils/ redisClient.js
const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true, // ✅ Important for Upstash
    connectTimeout: 10000,
  },
});

client.on('error', (err) => console.error('❌ Redis error:', err));
client.on('connect', () => console.log('🔌 Redis connecting...'));
client.on('ready', () => console.log('✅ Redis connected'));

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error('Redis connection error:', err);
  }
})();

module.exports = client;
