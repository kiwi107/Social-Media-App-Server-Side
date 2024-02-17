const pool = require('../database/db');
const queries = require('../database/queries');
const redisClient = require("../database/redis");




const getFriends = async (user_id) => {
    try {
        const userID = user_id
        //get friends
        const following = await pool.query(queries.getFollowingByUserId, [userID]);
        const followers = await pool.query(queries.getFollowersByUserId, [userID]);
        //check if they follow each other
        const friends = [];
        following.rows.forEach(friend => {
            followers.rows.forEach(follower => {
                if (friend.following_id === follower.follower_id) {
                    friends.push(friend);
                }
            });
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


const checkRecentChatsInRedis = async (user_id) => {
    const recentChats = await redisClient.exists(`recent_chats_${user_id}`);
    return recentChats;
}


const getRecentChatsFromPostgres = async (user_id) => {
    try {
        //get recent chats
        const userID = user_id
        let recentChats = await pool.query(queries.getChatBySingleUserId, [userID]);
        const loggedUser = await pool.query(queries.getUserById, [userID]);




        //remove logged in user from recent chats
        recentChats.rows.forEach((chat, index) => {
            if (chat.user1_id === loggedUser.rows[0].user_id) {
                recentChats.rows[index].user_id = chat.user2_id;
            } else {
                recentChats.rows[index].user_id = chat.user1_id;
            }
            if (chat.user1_username === loggedUser.rows[0].username) {
                recentChats.rows[index].username = chat.user2_username;
            } else {
                recentChats.rows[index].username = chat.user1_username;
            }
            if (chat.user1_profile_image === loggedUser.rows[0].profile_image) {
                recentChats.rows[index].profile_image = chat.user2_profile_image;
            }
            else {
                recentChats.rows[index].profile_image = chat.user1_profile_image;
            }
        });

        //remove unnecessary fields
        recentChats.rows.forEach((chat, index) => {
            delete recentChats.rows[index].user1_id;
            delete recentChats.rows[index].user2_id;
            delete recentChats.rows[index].user1_username;
            delete recentChats.rows[index].user2_username;
            delete recentChats.rows[index].user1_profile_image;
            delete recentChats.rows[index].user2_profile_image;
        });


        //sort by last access
        recentChats.rows.sort((a, b) => {
            return new Date(b.last_access) - new Date(a.last_access);
        });

        //get last message
        await Promise.all(recentChats.rows.map(async (chat, index) => {
            const lastMessage = await pool.query(queries.getLastMessageByChatId, [chat.chat_id]);
            recentChats.rows[index].last_message = lastMessage.rows[0].content;
            recentChats.rows[index].last_message_time = lastMessage.rows[0].sent_at;
        }));

        return recentChats.rows
    } catch (error) {
        // console.log(error.message)
    }
}


const getRecentChatsFromRedis = async (user_id) => {
    const recentChats = await redisClient.get('recent_chats_' + user_id);
    // console.log(recentChats)
    return JSON.parse(recentChats);
}

const saveRecentChatsInRedis = async (user_id, recentChats) => {
    await redisClient.set(`recent_chats_${user_id}`, JSON.stringify(recentChats));
}


const checkIfChatExistsInPostgres = async (user1_id, user2_id) => {
    const chatExists = await pool.query(queries.getChatByUserId, [user1_id, user2_id]);
    return chatExists.rows.length > 0;
}

const checkIfChatExistsInRedis = async (user1_id, user2_id) => {
    const redisKey = `chat:${Math.min(user1_id, user2_id)}:${Math.max(user1_id, user2_id)}`;
    const chatExists = await redisClient.exists(redisKey);
    return chatExists;
}


const createChatInPostgres = async (user1_id, user2_id) => {
    const newChat = await pool.query(queries.createChat, [user1_id, user2_id]);
    return newChat.rows[0];
}

const createChatInRedis = async (user1_id, user2_id, chat_id) => {
    const redisKey = `chat:${Math.min(user1_id, user2_id)}:${Math.max(user1_id, user2_id)}`;
    redisClient.set(redisKey, chat_id);
}


const getChatFromPostgres = async (user1_id, user2_id) => {
    const chat = await pool.query(queries.getChatByUserId, [user1_id, user2_id]);
    return chat.rows[0];
}

const getChatFromRedis = async (user1_id, user2_id) => {
    const redisKey = `chat:${Math.min(user1_id, user2_id)}:${Math.max(user1_id, user2_id)}`;
    const chat_id = await redisClient.get(redisKey);
    return chat_id;
}


const getMessagesFromPostgres = async (chat_id) => {
    const messages = await pool.query(queries.getMessagesByChatId, [chat_id]);
    return messages.rows;
}

const getMessagesFromRedis = async (chat_id) => {
    const messages = await redisClient.lrange(`messages:${chat_id}`, 0, -1);
    return messages.map((message) => JSON.parse(message));
}

const createMessage = async (chat_id, sender_id, content) => {
    const newMessage = await pool.query(queries.createMessage, [chat_id, sender_id, content]);
    redisClient.rpush(`messages:${chat_id}`, JSON.stringify(newMessage.rows[0]));
    return newMessage.rows[0];
}

const updateChatLastAccess = async (chat_id) => {
    const now = new Date().toISOString();
    await pool.query(queries.updateChatLastAccess, [now, chat_id]);
}


const getChats = async (user_id) => {
    const chats = await pool.query(queries.getChatsIdbyuserId, [user_id]);
    return chats.rows;
}



const createUnreadMessages = async (chat_id, user_id, message_id) => {
    await pool.query(queries.createUnread, [chat_id, user_id, message_id]);
}

const deleteUnreadMessages = async (chat_id, user_id) => {
    await pool.query(queries.deleteUnread, [chat_id, user_id]);
}














module.exports = {
    getRecentChatsFromRedis,
    getFriends,
    checkIfChatExistsInPostgres,
    checkIfChatExistsInRedis,
    createChatInPostgres,
    createChatInRedis,
    getChatFromPostgres,
    getChatFromRedis,
    getMessagesFromPostgres,
    getMessagesFromRedis,
    createMessage,
    updateChatLastAccess,
    checkRecentChatsInRedis,
    getRecentChatsFromPostgres,
    saveRecentChatsInRedis,
    getChats,
    createUnreadMessages,
    deleteUnreadMessages

}