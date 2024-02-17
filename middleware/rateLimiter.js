const redisClient = require('../database/redis');

const rateLimiter = (num_requests, time_interval, error_message) => {
    return async (req, res, next) => {
        ip = req.connection.remoteAddress;
        const response = await redisClient.multi().incr(ip).expire(ip, time_interval).exec();
        if (response[0][1] > num_requests) {
            return res.status(429).json({ message: error_message });
        }
        next();
    }
}

module.exports = rateLimiter;