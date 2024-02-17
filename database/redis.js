const Redis = require('ioredis');
require('dotenv').config();

const redisClient = new Redis(process.env.REDIS_URL);

module.exports = redisClient;
