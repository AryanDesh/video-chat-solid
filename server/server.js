require('dotenv').config();

const app = require('express')();
const server = require('http').createServer(app);
const cors = require('cors');
app.use(cors({
  origin: 'https://video-chat-solid.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
}));


const io = require('socket.io')(server, {
  cors: {
    origin: 'https://video-chat-solid.vercel.app', 
    methods: ['GET', 'POST'], 
  }});

const { v4 : uuidV4 } = require('uuid');

const PORT = process.env.PORT;

const roomMembers = {};

function removeUser(roomID, userID) {
  if (roomMembers.hasOwnProperty(roomID)) {
    roomMembers[roomID] = roomMembers[roomID].filter(user => user.peerID !== userID);
  } else {
    console.log(`Room with ID ${roomID} not found.`);
  }
}

io.on('connection', socket => {
  console.log("connected", socket.id);
  socket.on('create-room', () => {
    const roomID = uuidV4();
    roomMembers[roomID] = [];
    socket.emit('room-created', roomID);
  });

  socket.on('join-room', (roomID, peerID, username) => {
    socket.join(roomID);

    roomMembers[roomID].push({peerID: peerID, username: username});

    socket.on('user-ready', () => {
      socket.to(roomID).emit('new-user-joined', username, peerID);
    });

    socket.on('disconnect', () => {
      removeUser(roomID, peerID);
      socket.to(roomID).emit('user-disconnected', username, peerID);
    });
  });

  socket.on('request-members', (roomID) => {
    socket.emit('requested-members-response', roomMembers[roomID]);
  });

  socket.on('user-chat-message', (roomID, peerID, message) => {
    socket.to(roomID).emit('chat-incoming', peerID, message);
  });

})

server.listen(PORT, () => {
  console.log("Running on Port " + PORT);
})