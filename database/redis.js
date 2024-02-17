const Redis = require('ioredis');
import dotenv from 'dotenv';
dotenv.config();

const redisClient = new Redis(process.env.REDIS_URL);

module.exports = redisClient;
