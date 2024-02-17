const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const bodyparser = require('body-parser');


//routers
const authRoutes = require('./routes/authRoutes');
const postsRoutes = require('./routes/postsRoutes');
const profileRoutes = require('./routes/profileRoutes');
const chatRoutes = require('./routes/chatRoutes');

//middleware
const authenticateToken = require('./middleware/authenticateToken');
const authenticateSocketConnection = require('./middleware/authenticateSocketConnection');


const helmet = require('helmet');

const sessionMiddleware = require('./middleware/session');
require('dotenv').config();


//socket controllers
const { getOnlineUsers, onDisconnect, onJoinRoom, onMessage } = require('./controllers/socketController');
const { checkRecentChatsInRedis, getRecentChatsFromPostgres, getRecentChatsFromRedis, saveRecentChatsInRedis } = require('./controllers/chatController');






const app = express();

// Middleware
app.use(morgan('dev'));
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
  credentials: true // enable cookies
}));


const server = require('http').createServer(app);

const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    credentials: true // enable cookies
  },
});



app.use(express.json());


app.use(cookieParser());


app.use(sessionMiddleware);


app.use(bodyparser.urlencoded({ extended: true }));

// Routes
app.use("/", authRoutes);
// app.use("/posts", authenticateToken, postsRoutes);
app.use("/posts", postsRoutes);

app.use("/profile", authenticateToken, profileRoutes);
app.use("/chat", authenticateToken, chatRoutes);



// Socket.io
io.use(authenticateSocketConnection);
const redisClient = require('./database/redis');


io.on('connect', async socket => {
  const user = socket.user;
  // Send online users to all clients
  io.emit('onlineUsersUpdate', await getOnlineUsers());

  //save socket if id in redis with key as user id
  redisClient.set(user.userID, socket.id);

  io.to(socket.id).emit('recentChatsUpdate', await getRecentChatsFromPostgres(user.userID));
  // console.log(`${user.userID} connected`);

  socket.on('joinRoom', async (data) => {
    const user1_id = data.user1_id;
    const user2_id = data.user2_id;
    const page = data.pageNumber
    try {
      await onJoinRoom(io, socket, user1_id, user2_id, page);

    } catch (error) {
      // console.error(error.message);
    }
  });

  socket.on('leaveRoom', (data) => {
    // console.log('leaving room')
    socket.leave(data.chat_id);
  });

  socket.on('message', async (data) => {
    try {
      await onMessage(io, socket, data);
    } catch (error) {
      // console.error(error.message);
    }
  });

  socket.on('typing', async (data) => {
    //send to te chat room (broadcast == dont include sender)
    //used this instead of socket.broadcast.to(data.chat_id), because the other user may not be in the room
    //but still may see the message from recent chats
    const receiverSocketId = await redisClient.get(data.receiver_id);
    io.to(receiverSocketId).emit('typing', { chat_id: data.chat_id, typing: true });
  });

  socket.on('disconnect', async () => {
    // console.log(`${user.userID} disconnected`);
    onDisconnect(socket);
    io.emit('onlineUsersUpdate', await getOnlineUsers());
  });

});









const port = process.env.PORT;
server.listen(port, () => {
  // console.log(`Server listening at http://localhost:${port}`);
});
