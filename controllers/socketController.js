const redisClient = require("../database/redis");
const pool = require('../database/db');
const queries = require('../database/queries');
const { checkIfChatExistsInPostgres,
    checkIfChatExistsInRedis,
    createChatInPostgres,
    createChatInRedis,
    getChatFromPostgres,
    getChatFromRedis,
    getMessagesFromPostgres,
    getMessagesFromRedis,
    createMessage,
    updateChatLastAccess,
    getRecentChatsFromPostgres,
    getChats,
    createUnreadMessages,
    deleteUnreadMessages,
} = require('./chatController');

// we have a Redis client instance (redisClient) and a Socket.IO instance (io) initialized

// Function to get the key for the online users set
const getOnlineUsersKey = () => 'online_users';

const getOnlineUsers = async () => {
    const onlineUsers = await redisClient.smembers('online_users');
    return onlineUsers;
}


const onDisconnect = (socket) => {
    const userId = socket.user.userID;
    // Remove the user from the online users set
    redisClient.srem(getOnlineUsersKey(), userId);
};

const onConnect = async (socket, user) => {
    const userId = user.userID;
    socket.user = user;
    // Add the user to the online users set
    redisClient.sadd('online_users', userId);

    // get chats and join them - to enable the display of typing in recent chats
    // const chats = await pool.query(queries.getChatsIdbyuserId, [userId]);
    // chats.rows.forEach(chat => {
    //     socket.join(chat.chat_id);
    // })


};

// when user enters a chat, we want to return the messages from the chat
const onJoinRoom = async (io, socket, user1_id, user2_id) => {
    let room_id = null;
    let messages = [];
    //check if the chat exists in postgres (not their first time to chat)
    if (await checkIfChatExistsInPostgres(user1_id, user2_id)) {
        const chat = await getChatFromPostgres(user1_id, user2_id);

        room_id = chat.chat_id;
        //check if the chat exists in redis
        if (await checkIfChatExistsInRedis(user1_id, user2_id)) {
            messages = await getMessagesFromRedis(room_id);
        } else {
            //chat exists in postgres but not in redis
            messages = await getMessagesFromPostgres(room_id);
            //sort messages by date
            messages.sort((a, b) => a.sent_at - b.sent_at);
            messages.forEach((message) => {
                redisClient.rpush(`messages:${room_id}`, JSON.stringify(message));
            });
            await createChatInRedis(user1_id, user2_id, room_id);
        }


        //join the room & send messages to the client
        socket.join(room_id);
        // const usersInRoom = io.sockets.adapter.rooms.get(room_id);
        
        //delete the unread messages
        await deleteUnreadMessages(room_id, socket.user.userID);
        const recentChats = await getRecentChatsFromPostgres(socket.user.userID);
        io.to(socket.id).emit('recentChatsUpdate', recentChats);

        io.to(room_id).emit('messages', { messages: messages, chat_id: room_id });
    }
    //chat does not exist
    else {
        const newChat = await createChatInPostgres(user1_id, user2_id);
        room_id = newChat.chat_id;
        createChatInRedis(user1_id, user2_id, room_id);

        //join the room & send messages to the client
        socket.join(room_id);

        io.to(room_id).emit('messages', { messages: [], chat_id: room_id });
    }
}


const onMessage = async (io, socket, data) => {
    const newMessgae = await createMessage(data.chat_id, data.sender_id, data.message);
    await updateChatLastAccess(data.chat_id);

    //broadcast the message to everyone in the room
    io.to(data.chat_id).emit('messageReceived', newMessgae);

    //check if the receiver is in the room, to decide if the message will be marked unread
    const receiverSocketId = await redisClient.get(data.receiver_id);
    const usersInRoom = io.sockets.adapter.rooms.get(data.chat_id);
    //remove the sender from the room
    // usersInRoom.delete(socket.id);

    if (!usersInRoom.has(receiverSocketId)) {
        await createUnreadMessages(data.chat_id, data.receiver_id, newMessgae.message_id);
    }

    //update recent chats
    const senderRecentChats = await getRecentChatsFromPostgres(data.sender_id);
    const senderSocketId = await redisClient.get(data.sender_id);
    io.to(senderSocketId).emit('recentChatsUpdate', senderRecentChats);

    const receiverRecentChats = await getRecentChatsFromPostgres(data.receiver_id);
    io.to(receiverSocketId).emit('recentChatsUpdate', receiverRecentChats);

}

module.exports = {
    onDisconnect,
    onConnect,
    getOnlineUsers,
    onJoinRoom,
    onMessage
}