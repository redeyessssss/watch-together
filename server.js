const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  maxHttpBufferSize: 1e8 // 100 MB for video files
});

app.use(express.static('public'));

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
        videoData: null,
        videoUrl: null
      });
    }
    
    const room = rooms.get(roomId);
    
    // If this user has video data, store it and notify others
    if (data.videoData) {
      room.videoData = data.videoData;
      console.log(`Room ${roomId}: Video data stored (${data.videoData.length} bytes)`);
      // Notify all other users in the room that video is now available
      socket.to(roomId).emit('video-available', { videoData: data.videoData });
    }
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
      videoData: room.videoData,
      videoUrl: room.videoUrl
    };
    
    console.log(`User ${socket.id} joined room ${roomId}, sending state:`, {
      hasVideoData: !!roomState.videoData,
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
  console.log(`Server running on http://localhost:${PORT}`);
});
