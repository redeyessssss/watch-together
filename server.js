const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  maxHttpBufferSize: 5e9, // 5 GB
  pingTimeout: 60000,
  pingInterval: 25000
});
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5 GB
});

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File upload endpoint
app.post('/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const videoUrl = `/uploads/${req.file.filename}`;
  console.log('Video uploaded:', videoUrl);
  
  res.json({ 
    success: true, 
    videoUrl: videoUrl,
    filename: req.file.filename
  });
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    const roomId = data.roomId || data;
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { 
        users: new Set(), 
        videoState: { currentTime: 0, playing: false },
        videoUrl: null
      });
    }
    
    const room = rooms.get(roomId);
    
    // If this user has video URL, store it and notify others
    if (data.videoUrl) {
      room.videoUrl = data.videoUrl;
      console.log(`Room ${roomId}: Video URL stored: ${data.videoUrl}`);
      // Notify all other users in the room that video is now available
      socket.to(roomId).emit('video-available', { videoUrl: data.videoUrl });
    }
    
    room.users.add(socket.id);
    
    // Notify others in room
    socket.to(roomId).emit('user-connected', socket.id);
    
    // Send room state including video to this user
    const roomState = {
      ...room.videoState,
      videoUrl: room.videoUrl
    };
    
    console.log(`User ${socket.id} joined room ${roomId}, sending state:`, {
      hasVideoUrl: !!roomState.videoUrl,
      playing: roomState.playing,
      currentTime: roomState.currentTime
    });
    
    socket.emit('room-state', roomState);
  });

  socket.on('video-play', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.videoState.playing = true;
      room.videoState.currentTime = data.currentTime;
    }
    socket.to(data.roomId).emit('video-play', data);
  });

  socket.on('video-pause', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.videoState.playing = false;
      room.videoState.currentTime = data.currentTime;
    }
    socket.to(data.roomId).emit('video-pause', data);
  });

  socket.on('video-seek', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.videoState.currentTime = data.currentTime;
    }
    socket.to(data.roomId).emit('video-seek', data);
  });

  socket.on('webrtc-offer', (data) => {
    socket.to(data.roomId).emit('webrtc-offer', { offer: data.offer, from: socket.id });
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.roomId).emit('webrtc-answer', { answer: data.answer, from: socket.id });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.roomId).emit('webrtc-ice-candidate', { candidate: data.candidate, from: socket.id });
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        socket.to(roomId).emit('user-disconnected', socket.id);
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = http;
