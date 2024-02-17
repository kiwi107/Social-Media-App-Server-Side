const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');
const { upload } = require('../middleware/multer');







//posts
router.get('/', postsController.getPosts);
router.get('/:id', postsController.getPost);
router.post('/', upload.single('image'), postsController.createPost);

//likes
router.post('/like', postsController.likePost);
router.delete('/unlike/:id', postsController.unlikePost);
router.get('/likes/:id', postsController.getLikes);


//comments
router.post('/comment', postsController.comment);


module.exports = router;