const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redisClient = require('../database/redis');
require('dotenv').config();

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    name: 'sid',
    resave: false,
    saveUninitialized: false,
    store: new RedisStore({ client: redisClient }),
    cookie: {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24,
        secure: true,
        sameSite: 'none',
        httpOnly: true
    }
})

module.exports = sessionMiddleware;
