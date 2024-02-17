const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
router.get('/users', profileController.search)

router.get('/:id', profileController.profile)
router.post('/follow/:id', profileController.follow)
router.post('/unfollow/:id', profileController.unfollow)
router.get('/following/:id', profileController.getFollowing)
router.get('/followers/:id', profileController.getFollowers)

module.exports = router;