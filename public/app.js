const socket = io();

let roomId = null;
let peerConnection = null;
let localStream = null;
let isInitiator = false;
let videoSource = null;

const setupScreen = document.getElementById('setup-screen');
const watchScreen = document.getElementById('watch-screen');
const videoFileInput = document.getElementById('video-file');
const videoUrlInput = document.getElementById('video-url');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomCodeInput = document.getElementById('room-code-input');
const qrModal = document.getElementById('qr-modal');
const startWatchingBtn = document.getElementById('start-watching-btn');
const displayRoomCode = document.getElementById('display-room-code');
const videoPlayer = document.getElementById('video-player');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const currentRoomSpan = document.getElementById('current-room');
const connectionStatus = document.getElementById('connection-status');

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
  });
});

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Handle video file upload
videoFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    videoSource = URL.createObjectURL(file);
    console.log('File selected:', file.name, file.type);
  }
});

// Create room and show QR code
createRoomBtn.addEventListener('click', async () => {
  const videoUrl = videoUrlInput.value.trim();
  
  if (!videoSource && !videoUrl) {
    alert('Please upload a video or enter a video URL');
    return;
  }
  
  if (!videoSource && videoUrl) {
    videoSource = videoUrl;
  }
  
  // Generate random room ID
  roomId = 'room-' + Math.random().toString(36).substr(2, 9);
  
  // Generate QR code
  const joinUrl = `${window.location.origin}?room=${roomId}`;
  const qrContainer = document.getElementById('qr-code');
  qrContainer.innerHTML = ''; // Clear previous QR
  
  new QRCode(qrContainer, {
    text: joinUrl,
    width: 250,
    height: 250,
    colorDark: '#667eea',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  
  displayRoomCode.textContent = roomId;
  qrModal.classList.add('active');
  isInitiator = true;
  
  console.log('Room created:', roomId, 'Video source type:', videoSource.startsWith('blob:') ? 'file' : 'url');
});

// Start watching after showing QR
startWatchingBtn.addEventListener('click', async () => {
  qrModal.classList.remove('active');
  await startWatching();
});

// Join room with code
joinRoomBtn.addEventListener('click', async () => {
  roomId = roomCodeInput.value.trim();
  
  if (!roomId) {
    alert('Please enter a room code');
    return;
  }
  
  await startWatching();
});

// Check URL for room parameter (QR code scan)
const urlParams = new URLSearchParams(window.location.search);
const urlRoomId = urlParams.get('room');
if (urlRoomId) {
  roomCodeInput.value = urlRoomId;
  document.querySelector('[data-tab="join"]').click();
}

async function startWatching() {
  currentRoomSpan.textContent = roomId;
  
  setupScreen.classList.remove('active');
  watchScreen.classList.add('active');
  
  await initializeMedia();
  
  // If host with uploaded file, convert to base64 and send
  if (isInitiator && videoSource && videoSource.startsWith('blob:')) {
    const file = videoFileInput.files[0];
    if (file) {
      connectionStatus.textContent = 'Uploading video...';
      const reader = new FileReader();
      reader.onload = (e) => {
        const videoData = e.target.result;
        videoPlayer.src = videoData;
        console.log('Host: Video loaded from file, joining room with video data');
        socket.emit('join-room', { roomId, videoData });
        connectionStatus.textContent = 'Waiting for partner...';
      };
      reader.readAsDataURL(file);
      return; // Don't join room yet, wait for file to load
    }
  } else if (isInitiator && videoSource) {
    // URL-based video
    videoPlayer.src = videoSource;
    console.log('Host: Video loaded from URL:', videoSource);
    socket.emit('join-room', { roomId, videoUrl: videoSource });
    connectionStatus.textContent = 'Waiting for partner...';
  } else {
    // Joiner - wait for video from host
    console.log('Joiner: Waiting for video from host');
    socket.emit('join-room', { roomId });
    connectionStatus.textContent = 'Waiting for video...';
  }
}

// Add video player event listeners for debugging
videoPlayer.addEventListener('loadstart', () => {
  console.log('Video loading started');
});

videoPlayer.addEventListener('loadeddata', () => {
  console.log('Video data loaded');
  connectionStatus.textContent = 'Video ready!';
});

videoPlayer.addEventListener('error', (e) => {
  console.error('Video error:', videoPlayer.error);
  connectionStatus.textContent = 'Video error - check console';
});

async function initializeMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    localVideo.srcObject = localStream;
    connectionStatus.textContent = 'Camera ready';
  } catch (error) {
    console.error('Error accessing media devices:', error);
    connectionStatus.textContent = 'Camera access denied';
  }
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(iceServers);
  
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }
  
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.add('connected');
  };
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc-ice-candidate', {
        roomId: roomId,
        candidate: event.candidate
      });
    }
  };
  
  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState);
    if (peerConnection.connectionState === 'disconnected') {
      connectionStatus.textContent = 'Disconnected';
      connectionStatus.classList.remove('connected');
    }
  };
  
  return peerConnection;
}

socket.on('user-connected', async (userId) => {
  console.log('User connected:', userId);
  isInitiator = true;
  
  const pc = createPeerConnection();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  
  socket.emit('webrtc-offer', {
    roomId: roomId,
    offer: offer
  });
});

socket.on('webrtc-offer', async (data) => {
  console.log('Received offer');
  
  const pc = createPeerConnection();
  await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
  
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  
  socket.emit('webrtc-answer', {
    roomId: roomId,
    answer: answer
  });
});

socket.on('webrtc-answer', async (data) => {
  console.log('Received answer');
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('webrtc-ice-candidate', async (data) => {
  if (peerConnection) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});

socket.on('room-state', (state) => {
  console.log('🎬 Received room state:', {
    hasVideoData: !!state.videoData,
    hasVideoUrl: !!state.videoUrl,
    videoDataLength: state.videoData ? state.videoData.length : 0,
    playing: state.playing,
    currentTime: state.currentTime
  });
  
  // Set video source if provided
  if (state.videoData && !videoPlayer.src) {
    console.log('✅ Loading video from data (uploaded file)');
    videoPlayer.src = state.videoData;
    connectionStatus.textContent = 'Video loaded from partner';
  } else if (state.videoUrl && !videoPlayer.src) {
    console.log('✅ Loading video from URL:', state.videoUrl);
    videoPlayer.src = state.videoUrl;
    connectionStatus.textContent = 'Video loaded from URL';
  } else if (!state.videoData && !state.videoUrl) {
    console.log('⚠️ No video in room state yet - waiting for host to upload');
  }
  
  // Sync playback state after video is ready
  if (videoPlayer.readyState >= 2) {
    // Video already loaded
    if (state.playing) {
      videoPlayer.currentTime = state.currentTime;
      videoPlayer.play().catch(e => console.log('Play prevented:', e));
    } else {
      videoPlayer.currentTime = state.currentTime;
    }
  } else if (videoPlayer.src) {
    // Wait for video to load
    videoPlayer.addEventListener('loadedmetadata', () => {
      console.log('📹 Video metadata loaded, ready to play');
      if (state.playing) {
        videoPlayer.currentTime = state.currentTime;
        videoPlayer.play().catch(e => console.log('Play prevented:', e));
      } else {
        videoPlayer.currentTime = state.currentTime;
      }
    }, { once: true });
  }
});

// Listen for video becoming available after joining
socket.on('video-available', (data) => {
  console.log('🎉 Video now available from host!');
  if (data.videoData && !videoPlayer.src) {
    console.log('✅ Loading video from data');
    videoPlayer.src = data.videoData;
    connectionStatus.textContent = 'Video loaded from partner';
  } else if (data.videoUrl && !videoPlayer.src) {
    console.log('✅ Loading video from URL:', data.videoUrl);
    videoPlayer.src = data.videoUrl;
    connectionStatus.textContent = 'Video loaded from URL';
  }
});

let isSyncing = false;

videoPlayer.addEventListener('play', () => {
  if (!isSyncing) {
    socket.emit('video-play', {
      roomId: roomId,
      currentTime: videoPlayer.currentTime
    });
  }
});

videoPlayer.addEventListener('pause', () => {
  if (!isSyncing) {
    socket.emit('video-pause', {
      roomId: roomId,
      currentTime: videoPlayer.currentTime
    });
  }
});

videoPlayer.addEventListener('seeked', () => {
  if (!isSyncing) {
    socket.emit('video-seek', {
      roomId: roomId,
      currentTime: videoPlayer.currentTime
    });
  }
});

socket.on('video-play', (data) => {
  isSyncing = true;
  videoPlayer.currentTime = data.currentTime;
  videoPlayer.play().catch(e => console.log('Play prevented:', e));
  setTimeout(() => { isSyncing = false; }, 500);
});

socket.on('video-pause', (data) => {
  isSyncing = true;
  videoPlayer.currentTime = data.currentTime;
  videoPlayer.pause();
  setTimeout(() => { isSyncing = false; }, 500);
});

socket.on('video-seek', (data) => {
  isSyncing = true;
  videoPlayer.currentTime = data.currentTime;
  setTimeout(() => { isSyncing = false; }, 500);
});

socket.on('user-disconnected', () => {
  connectionStatus.textContent = 'Partner disconnected';
  connectionStatus.classList.remove('connected');
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
});
