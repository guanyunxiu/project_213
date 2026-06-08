const redis = require('redis');

const client = redis.createClient({
  host: 'localhost',
  port: 6379
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

client.on('connect', () => {
  console.log('Redis connected successfully');
});

async function connectRedis() {
  try {
    await client.connect();
  } catch (error) {
    console.error('Redis connection failed:', error);
  }
}

module.exports = { client, connectRedis };
