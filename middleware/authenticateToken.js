const jwt = require("jsonwebtoken");
require("dotenv").config();


function authenticateToken(req, res, next) {
    let cookies = req.headers.cookie;
    let token = null;
    if (cookies == null) {
        return res.sendStatus(401); // 401 Unauthorized
    } else {
        cookies = cookies.split(';');
        const tokenCookie = cookies.find(cookie => cookie.startsWith('JWT=') || cookie.startsWith(' JWT='));
        if (tokenCookie) {
            token = tokenCookie.split('=')[1];
        }
        if (token == null) {
            return res.sendStatus(401); // 401 Unauthorized
        }
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            // console.log("Token Expired");
            return res.sendStatus(403); // 403 Forbidden
        }

        req.user = user.userID;
        // console.log("token verified"); 
        next();
    });
}

module.exports = authenticateToken;