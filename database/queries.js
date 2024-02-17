//users queries
const getUsers = "SELECT * FROM users";
const getUserById = `
SELECT 
  u.user_id,
  u.username,
  u.profile_image,
  u.full_name,
  (SELECT COUNT(*) FROM public.relationships WHERE follower_id = u.user_id) as following_count,
  (SELECT COUNT(*) FROM public.relationships WHERE following_id = u.user_id) as followers_count
FROM
  public.users u
LEFT JOIN
  public.posts p ON u.user_id = p.user_id
WHERE
  u.user_id = $1
GROUP BY
  u.user_id, u.username, u.profile_image, u.full_name;`

const getUserByUsername = "SELECT * FROM users WHERE username=$1"

const createUser = "INSERT INTO users (username, full_name, email, password, dob, profile_image) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *";
const updateUser = "UPDATE users SET username=$1, full_name=$2, email=$3, password=$4, dob=$5 WHERE user_id=$6";
const deleteUser = "DELETE FROM users WHERE user_id=$1";
//check if any username or full_name contains the search term even if not all of it is typed
const searchUsers = `
SELECT
  user_id,
  username,
  full_name,
  profile_image
  FROM
  public.users
  WHERE
  username ILIKE '%' || $1 || '%' OR full_name ILIKE '%' || $1 || '%';`;

//posts queries

// left table: posts - all rows will be returned regardless of whether there is a match in the right table
// right table: likes - only rows that match the left table will be returned
// only posts that have corresponding user will be returned 
const getPosts = `
SELECT
  p.post_id,
  p.text, 
  p.image, 
  p.created_at,
  u.user_id ,
  u.username,
  u.profile_image,
  CAST(COUNT(DISTINCT l.like_id) AS INTEGER) as likes_count,
  CAST(COUNT(DISTINCT c.comment_id) AS INTEGER) as comments_count
FROM
  public.posts p
JOIN
  public.users u ON p.user_id = u.user_id
LEFT JOIN
  public.likes l ON p.post_id = l.post_id
LEFT JOIN
  public.comments c ON p.post_id = c.post_id
GROUP BY
  p.post_id, p.text, p.image, p.created_at, u.user_id, u.username, u.profile_image;
`;


const getPostsByUserId = `
SELECT
  p.post_id,
  p.text,
  p.image,
  p.created_at,
  u.user_id,
  u.username,
  u.profile_image,
  CAST(COUNT(DISTINCT l.like_id) AS INTEGER) as likes_count,
  CAST(COUNT(DISTINCT c.comment_id) AS INTEGER) as comments_count
FROM
  public.posts p
JOIN
  public.users u ON p.user_id = u.user_id
LEFT JOIN
  public.likes l ON p.post_id = l.post_id
LEFT JOIN
  public.comments c ON p.post_id = c.post_id
WHERE
  p.user_id = $1
GROUP BY
  p.post_id, p.text, p.image, p.created_at, u.user_id, u.username, u.profile_image
`;
const getPostByPostId = `
SELECT
  p.post_id,
  p.text,
  p.image,
  p.created_at,
  u.user_id,
  u.username,
  u.profile_image,
  CAST(COUNT(DISTINCT l.like_id) AS INTEGER) as likes_count,
  CAST(COUNT(DISTINCT c.comment_id) AS INTEGER) as comments_count
FROM
  public.posts p
JOIN
  public.users u ON p.user_id = u.user_id
LEFT JOIN
  public.likes l ON p.post_id = l.post_id
LEFT JOIN
  public.comments c ON p.post_id = c.post_id
WHERE
  p.post_id = $1
GROUP BY
  p.post_id, p.text, p.image, p.created_at, u.user_id, u.username, u.profile_image
`;

const createPost = "INSERT INTO posts (user_id,text,image) VALUES ($1,$2,$3) RETURNING *";
const deletePost = "DELETE FROM posts WHERE post_id=$1";


//likes queries
const getLikesByPostId = `
  SELECT
    l.like_id,
    l.post_id,
    l.user_id,
    u.username,
    u.profile_image
  FROM
    public.likes l
  JOIN
    public.users u ON l.user_id = u.user_id
  WHERE
    l.post_id = $1;
`;

const getLikesByUserId = `
  SELECT
    l.post_id,
    l.user_id,
    u.username,
    u.profile_image
  FROM
    public.likes l
  JOIN
    public.users u ON l.user_id = u.user_id
  WHERE
    l.user_id = $1;
`;







const createPostLike = "INSERT INTO likes (post_id,user_id) VALUES ($1,$2) RETURNING *";
const deletePostLike = "DELETE FROM likes WHERE post_id=$1 AND user_id=$2 RETURNING *";

//comments queries
const getComments = "SELECT * FROM comments WHERE post_id=$1";
const createComment = "INSERT INTO comments (post_id, user_id, text) VALUES ($1, $2, $3) RETURNING *";
const deleteComment = "DELETE FROM comments WHERE comment_id=$1";

const getCommentByPostId = `
SELECT
  c.comment_id,
  c.text,
  c.created_at,
  u.user_id,
  u.username,
  u.profile_image
FROM
  public.comments c
JOIN
  public.users u ON c.user_id = u.user_id
WHERE
  c.post_id = $1;
`;

//relationships queries
const createRelationship = "INSERT INTO relationships (follower_id, following_id) VALUES ($1, $2)";
const deleteRelationship = "DELETE FROM relationships WHERE follower_id=$1 AND following_id=$2";
const getFollowersByUserId = `
SELECT
  r.follower_id,
  u.username,
  u.profile_image
FROM
  public.relationships r
JOIN
  public.users u ON r.follower_id = u.user_id
WHERE
  r.following_id = $1;
 `;
const getFollowingByUserId = `
SELECT
  r.following_id,
  u.username,
  u.profile_image
FROM
  public.relationships r
JOIN
  public.users u ON r.following_id = u.user_id
WHERE
  r.follower_id = $1;
  `;



//chat queries
const getChatByUserId = `
SELECT
  c.chat_id,
  c.user1_id,
  c.user2_id,
  u1.username AS user1_username,
  u1.profile_image AS user1_profile_image,
  u2.username AS user2_username,
  u2.profile_image AS user2_profile_image
FROM
  public.chats c
JOIN
  public.users u1 ON c.user1_id = u1.user_id
JOIN
  public.users u2 ON c.user2_id = u2.user_id
WHERE
  (c.user1_id = $1 AND c.user2_id = $2)
  OR
  (c.user1_id = $2 AND c.user2_id = $1);
`;


const getChatBySingleUserId = `
SELECT
  c.chat_id,
  c.user1_id,
  c.user2_id,
  c.last_access,
  u1.username AS user1_username,
  u1.profile_image AS user1_profile_image,
  u2.username AS user2_username,
  u2.profile_image AS user2_profile_image,
  CAST(COUNT(DISTINCT ur.unread_id) AS INTEGER) AS unread_count
FROM
  public.chats c
JOIN
  public.users u1 ON c.user1_id = u1.user_id
JOIN
  public.users u2 ON c.user2_id = u2.user_id
LEFT JOIN
  public.unread_messages ur ON c.chat_id = ur.chat_id AND ur.user_id = $1
WHERE
  c.user1_id = $1 OR c.user2_id = $1
GROUP BY
  c.chat_id, c.user1_id, c.user2_id, c.last_access, u1.username, u1.profile_image, u2.username, u2.profile_image;
`;



const createChat = "INSERT INTO chats (user1_id, user2_id) VALUES ($1, $2) RETURNING *";

const updateChatLastAccess = "UPDATE chats SET last_access = $1 WHERE chat_id = $2";


//messages queries

const getMessagesByChatId = `
SELECT
  m.message_id,
  m.chat_id,
  m.sender_id,
  m.content,
  m.sent_at,
  u.username,
  u.profile_image
FROM
  public.messages m 
JOIN
  public.users u ON m.sender_id = u.user_id
WHERE
  m.chat_id = $1;
`;

const createMessage = "INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *";

const getLastMessageByChatId = `
SELECT
  m.message_id,
  m.chat_id,
  m.sender_id,
  m.content,
  m.sent_at,
  u.username,
  u.profile_image
FROM
  public.messages m 
JOIN
  public.users u ON m.sender_id = u.user_id
WHERE
  m.chat_id = $1
ORDER BY
  m.sent_at DESC
LIMIT 1;
`;

const getChatsIdbyuserId = `
SELECT
  chat_id
FROM
  public.chats
WHERE
  user1_id = $1
  OR  
  user2_id = $1;
`;


const createUnread = "INSERT INTO unread_messages (chat_id, user_id,message_id) VALUES ($1, $2, $3) RETURNING *";
const deleteUnread = "DELETE FROM unread_messages WHERE chat_id=$1 AND user_id=$2";












module.exports = {
  getUsers,
  getUserById,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
  getPosts,
  getPostsByUserId,
  getPostByPostId,
  createPost,
  deletePost,
  getLikesByPostId,
  getLikesByUserId,
  createPostLike,
  deletePostLike,
  getComments,
  createComment,
  deleteComment,
  getCommentByPostId,
  createRelationship,
  deleteRelationship,
  getFollowingByUserId,
  getFollowersByUserId,
  getChatByUserId,
  getChatBySingleUserId,
  createChat,
  updateChatLastAccess,
  getMessagesByChatId,
  createMessage,
  getLastMessageByChatId,
  getChatsIdbyuserId,
  createUnread,
  deleteUnread
};