const jwt = require("jsonwebtoken");
const redisClient = require("../database/redis");
const { onConnect } = require("../controllers/socketController");
require("dotenv").config();

function authenticateSocketConnection(socket, next) {
    const cookies = socket.handshake.headers.cookie;
    let token = null;

    if (!cookies) {
        return next(new Error('Unauthorized'));
    }

    const cookiesArray = cookies.split(';');
    const tokenCookie = cookiesArray.find(cookie => cookie.startsWith('JWT=') || cookie.startsWith(' JWT='));

    if (tokenCookie) {
        token = tokenCookie.split('=')[1];
    }

    if (!token) {
        return next(new Error('Unauthorized'));
    }
    //the user object is the payload from the jwt
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            // console.log("Token Expired");
            return next(new Error('Forbidden'));
        }

        // console.log("token verified"); 
        onConnect(socket, user);


        next();
    });
}

module.exports = authenticateSocketConnection;
