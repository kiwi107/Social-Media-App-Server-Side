const Redis = require('ioredis');

// Internal Redis URL provided by Render
const redisURL = 'redis://red-cn8gu5v109ks739osqv0:6379';

// Create a new Redis client instance with the provided URL
const redisClient = new Redis(redisURL);

module.exports = redisClient;
