const pool = require('../database/db');
const queries = require('../database/queries');
const redisClient = require('../database/redis');


const profile = async (req, res) => {
    try {
        const user_id = req.params.id; //user_id of profile being viewed
        const user = await pool.query(queries.getUserById, [user_id]); //user info of profile being viewed
        const loggedInUser = req.user; //user_id of logged in user
        const userPosts = await pool.query(queries.getPostsByUserId, [user_id]);
        const userLikes = await pool.query(queries.getLikesByUserId, [loggedInUser]);

        // check if user has followed
        user.rows[0].user_has_followed = false;
        let followers = await pool.query(queries.getFollowersByUserId, [user_id]);
        if (followers !== null) {
            followers.rows.forEach(follower => {
                if (follower.follower_id == loggedInUser) user.rows[0].user_has_followed = true;
            });
        }

        // Check if logged in user has liked post
        userPosts.rows.forEach(post => {
            let user_has_liked = false;
            const liked = userLikes.rows.filter(like => like.post_id == post.post_id);
            if (liked.length > 0) user_has_liked = true;
            post.user_has_liked = user_has_liked;
        });

        res.status(200).json({
            user: user.rows[0],
            userPosts: userPosts.rows.reverse(),
            loggedInUserId: req.user,
        });

    } catch (error) {
        res.status(500).json({ message: 'Error visiting profile' });
    }
};


const follow = async (req, res) => {
    try {
        const user_id = req.params.id;
        const loggedInUserId = req.user;
        await pool.query(queries.createRelationship, [loggedInUserId, user_id]);
        res.status(200).json({ message: 'Followed' });
    } catch (error) {
        // console.error(error);
        res.status(500).json({ message: 'Error following user' });
    }
};

const unfollow = async (req, res) => {
    try {
        const user_id = req.params.id;
        const loggedInUserId = req.user;
        await pool.query(queries.deleteRelationship, [loggedInUserId, user_id]);
        res.status(200).json({ message: 'Unfollowed' });
    } catch (error) {
        res.status(500).json({ message: 'Error unfollowing user' });
    }
}


const getFollowing = async (req, res) => {
    try {
        const user_id = req.params.id;
        const following = await pool.query(queries.getFollowingByUserId, [user_id]);

        res.status(200).json({ following: following.rows });

    } catch (error) {
        res.status(500).json({ message: 'Error getting followers' });
    }
}


const getFollowers = async (req, res) => {
    try {
        const user_id = req.params.id;
        const followers = await pool.query(queries.getFollowersByUserId, [user_id]);

        res.status(200).json({ followers: followers.rows });

    } catch (error) {
        res.status(500).json({ message: 'Error getting followers' });
    }
}


const search = async (req, res) => {
    try {
        const { username } = req.query;
        const result = await pool.query(queries.searchUsers, [username])
        
        res.status(200).json({ result: result.rows })

    } catch (error) {
        // console.log(error)
        res.status(500).json({ message: 'Error getting users' });
    }
}


module.exports = {
    profile,
    follow,
    unfollow,
    getFollowing,
    getFollowers,
    search
}