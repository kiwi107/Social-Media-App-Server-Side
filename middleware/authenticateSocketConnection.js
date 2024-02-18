const jwt = require("jsonwebtoken");
const redisClient = require("../database/redis");
const { onConnect } = require("../controllers/socketController");
require("dotenv").config();
function authenticateSocketConnection(socket, next) {
    const token=socket.handshake.auth.token;

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
