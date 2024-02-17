const pool = require('../database/db');
const queries = require('../database/queries');
const { ref, uploadBytesResumable, getDownloadURL } = require('firebase/storage');
const { storage } = require('../middleware/multer');


// for feed
// needs to be paginated 
const getPosts = async (req, res) => {
    try {
        const user_id = req.user;
        const posts = await pool.query(queries.getPosts);
        const userLikes = await pool.query(queries.getLikesByUserId, [user_id]);
        posts.rows.reverse();

        // check if user has liked post
        posts.rows.forEach(post => {
            let user_has_liked = false;
            const liked = userLikes.rows.filter(like => like.post_id == post.post_id);
            if (liked.length > 0) user_has_liked = true;
            post.user_has_liked = user_has_liked;
        });

        //pagination for infinite scroll
        const length = posts.rows.length;
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const startIndex = (page - 1) * limit;
        let endIndex = page * limit;

        if (endIndex > length) endIndex = length;


        posts.rows = posts.rows.slice(startIndex, endIndex);

        const hasMore = endIndex < length;

        res.status(200).json({ posts: posts.rows, hasMore: hasMore });
    } catch (error) {
        // console.error(`Error getting posts: ${error.message}`);
        res.status(500).json({ message: 'Error getting posts' });
    }
};




// for post details page
const getPost = async (req, res) => {
    try {
        const post_id = req.params.id;
        const post = await pool.query(queries.getPostByPostId, [post_id]);
        const userLikes = await pool.query(queries.getLikesByUserId, [req.user]);


        //get post comments
        const comments = await pool.query(queries.getCommentByPostId, [post_id]);

        // Check if user has liked post
        let user_has_liked = false;
        const liked = userLikes.rows.filter(like => like.post_id == post_id);
        if (liked.length > 0) user_has_liked = true;
        post.rows[0].user_has_liked = user_has_liked;

        res.status(200).json({
            post: post.rows[0],
            comments: comments.rows
        });
    } catch (error) {
        res.status(500).json({ message: 'Error getting post' });
    }
};




const createPost = async (req, res) => {
    try {
        const user_id = req.user;
        const { text } = req.body;
        let image = '';
        if (req.file) image = req.file.originalname;
        // console.log(req.file);

        //validating not empty fields
        if (!text && !image) {
            return res.status(400).json({ message: 'Please enter text or image' });
        }

        const storageRef = ref(storage, `posts/${req.file.originalname}`);
        const metadata = {
            contentType: req.file.mimetype
        };
        const snapshot = await uploadBytesResumable(storageRef, req.file.buffer, metadata);

        const imageURL = await getDownloadURL(snapshot.ref);





        const newPost = await pool.query(queries.createPost, [user_id, text, imageURL]);
        const post = await pool.query(queries.getPostByPostId, [newPost.rows[0].post_id]);
        res.status(201).json({ message: 'Post created', post: post.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error creating post' });
        console.error(error.message);
    }
};

const likePost = async (req, res) => {
    try {
        const { post_id } = req.body;
        const user_id = req.user;
        const postLikes = await pool.query(queries.getLikesByPostId, [post_id]);

        //check if user has already liked post
        const liked = postLikes.rows.filter(like => like.user_id == user_id);
        if (liked.length > 0) {
            return res.status(400).json({ message: 'Post already liked' });
        }

        //create like
        const newlike = await pool.query(queries.createPostLike, [post_id, user_id]);
        // to match the like object in the front end, unnecessary fields are deleted
        let like = newlike.rows[0];
        delete like.post_id
        delete like.created_at

        return res.status(201).json({ message: 'Post liked', like: like });

    } catch (error) {
        res.status(500).json({ message: 'Error liking post' });
    }
};

const unlikePost = async (req, res) => {
    try {
        const post_id = req.params.id;
        const user_id = req.user;
        const postLikes = await pool.query(queries.getLikesByPostId, [post_id]);

        //check if user has already liked post
        const liked = postLikes.rows.filter(like => like.user_id == user_id);
        if (liked.length === 0) {
            return res.status(400).json({ message: 'Post not liked' });
        }

        //delete like
        const unlike = await pool.query(queries.deletePostLike, [post_id, user_id]);
        return res.status(201).json({ message: 'Post unliked', user_id: user_id });

    } catch (error) {
        res.status(500).json({ message: 'Error unliking post' });
    }
};


const getLikes = async (req, res) => {
    try {
        const post_id = req.params.id;
        const likes = await pool.query(queries.getLikesByPostId, [post_id]);
        res.status(200).json({ likes: likes.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error getting likes' });
    }
};




const comment = async (req, res) => {
    try {
        const { post_id, text } = req.body;
        const user_id = req.user;
        const newComment = await pool.query(queries.createComment, [post_id, user_id, text]);
        const user = await pool.query(queries.getUserById, [user_id]);
        newComment.rows[0].username = user.rows[0].username;
        newComment.rows[0].profile_image = user.rows[0].profile_image;
        res.status(201).json({ message: 'Comment created', comment: newComment.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error creating comment' });
    }
}






module.exports = {
    getPosts,
    getPost,
    createPost,
    likePost,
    unlikePost,
    getLikes,
    comment
};