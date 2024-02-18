const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv').config();
const pool = require('../database/db');
const queries = require('../database/queries');
const session = require('express-session');
const { ref, uploadBytesResumable, getDownloadURL } = require('firebase/storage');
const { storage } = require('../middleware/multer');






const register = async (req, res) => {
    try {
        const { username, fullName, email, dob, password, confirmPassword } = req.body;
        const salt = await bcrypt.genSalt();

        //hashing password
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        //processing profile image
        let profileimageURL = '';
        if (!req.file) {
            profileimageURL = 'https://firebasestorage.googleapis.com/v0/b/kiwigram-307be.appspot.com/o/default.jpeg?alt=media&token=591aa8c1-7b4e-4a88-865c-ace07ff18ca2';
        } else {
            profileimageURL = req.file.originalname;
            const storageRef = ref(storage, `profile_images/${profileimage}`);
            await uploadBytesResumable(storageRef, req.file.buffer);
            profileimageURL = await getDownloadURL(storageRef);
        }


        //validating not empty fields
        if (!username || !fullName || !email || !dob || !password || !confirmPassword) {
            return res.status(400).json({ message: "Please fill in all fields" });
        }


        //validating unique username
        const existingUser = await pool.query(queries.getUserByUsername, [username]);
        if (existingUser.rows.length) {
            return res.status(400).json({ message: "Username already exists" });
        }

        //checking if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" })
        }

        //creating new user
        const newUser = await pool.query(queries.createUser, [username, fullName, email, hashedPassword, dob, profileimageURL]);
        const newUserID = await pool.query(queries.getUserByUsername, [username]);


        //authentication
        const payload = {
            username: username,
            userID: newUserID.rows[0].user_id
        }
        const secretKey = process.env.ACCESS_TOKEN_SECRET;


        const token = jwt.sign(payload, secretKey, {
            expiresIn: '1d',
        });


        // req.session.user = {
        //     username: username,
        //     userID: newUserID.rows[0].user_id
        // }



        // res.cookie('JWT', token, {
        //     httpOnly: true, //to avoid XSS attacks
        //     expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        //     path: '/',

        // });



        res.status(200).json({ auth: true, token: token, user: newUser.rows[0] });



    } catch (error) {
        // console.error('Error during registration:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
};



const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        //validating not empty fields
        if (!username || !password) {
            return res.status(400).json({ message: 'Please fill in all fields' });
        }
        let existingUserPassword = '';

        const existingUser = await pool.query(queries.getUserByUsername, [username]);
        if (!existingUser.rows.length) {
            return res.status(401).json({ message: 'Invalid username' });
        } else {
            existingUserPassword = existingUser.rows[0].password;
        }



        let isPasswordValid = await bcrypt.compare(password, existingUserPassword);


        if (isPasswordValid) {

            const payload = {
                username: existingUser.rows[0].username,
                userID: existingUser.rows[0].user_id
            }
            const secretKey = process.env.ACCESS_TOKEN_SECRET;

            const token = jwt.sign(payload, secretKey, {
                expiresIn: '1d',
            });

            // req.session.user = {
            //     username: existingUser.rows[0].username,
            //     userID: existingUser.rows[0].user_id
            // }



            // res.cookie('JWT', token, {
            //     httpOnly: true, //to avoid XSS attacks
            //     //one year
            //     expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
            //     path: '/',

            // });

            res.status(200).json({ auth: true, token: token, user: existingUser.rows[0] });

        } else {
            return res.status(401).json({ message: 'Invalid username or password' });

        }


    } catch (error) {
        // console.error('Error during login:', error);
        res.status(500).json({ auth: false, message: 'Login failed' }); // 500 Internal Server Error
    }
};

const logout = (req, res) => {
    res.clearCookie('JWT');
    res.status(200).json({ message: 'Logout successful' });
};

module.exports = {
    register,
    login,
    logout
};


