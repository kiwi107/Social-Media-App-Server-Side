const config = require('../firebase.config');
const multer = require('multer');
const { initializeApp } = require('firebase/app');
const { getStorage } = require('firebase/storage');




initializeApp(config);
const storage = getStorage();
const upload = multer({
    storage: multer.memoryStorage()
});

module.exports = { upload, storage };
