const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {upload} = require('../middleware/multer');
const rateLimiter = require('../middleware/rateLimiter');




// API's
router.post('/register', upload.single('image'), authController.register);
router.post('/login', rateLimiter(5, 60, "Too many requests, wait 1 minute and try logging in again"), authController.login);
router.post('/logout', authController.logout);


module.exports = router;