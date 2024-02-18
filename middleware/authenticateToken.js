const jwt = require("jsonwebtoken");
require("dotenv").config();


function authenticateToken(req, res, next) {
    let token = req.headers['jwt']
    if (token == null) {
        return res.sendStatus(401); // 401 Unauthorized
    } else {


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
}

module.exports = authenticateToken;