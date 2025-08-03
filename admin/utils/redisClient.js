//utils/ redisClient.js
const redis = require('redis');
require('dotenv').config();

let client;

async function getRedisClient() {
  if (!client) {
    client = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: true,
        connectTimeout: 10000,
      },
    });

    client.on('error', (err) => console.error('❌ Redis error:', err));
    client.on('connect', () => console.log('🔌 Redis connecting...'));
    client.on('ready', () => console.log('✅ Redis connected'));

    await client.connect();
  }

  return client;
}

module.exports = getRedisClient;
