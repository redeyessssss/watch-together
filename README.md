# Watch Together 💕

A web app for couples to watch movies together with video chat, no matter the distance.

## Features

- 🎬 Synchronized video playback
- 📹 Real-time video chat
- 🔄 Auto-sync play/pause/seek
- 💑 Perfect for long-distance couples

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open http://localhost:3000 in your browser

## How to Use

### Host (Person with the video):
1. Open the app
2. Click "Host Movie" tab
3. Either upload a video from your device OR enter a video URL
4. Click "Create Room & Get QR Code"
5. Share the QR code with your partner (screenshot or show on screen)
6. Click "Start Watching"
7. Allow camera/microphone access

### Join (Partner):
1. Open the app
2. Click "Join with QR" tab
3. Scan the QR code OR enter the room code manually
4. Click "Join Room"
5. Allow camera/microphone access
6. Enjoy your movie night together!

## Video URL Tips

You need a direct link to an MP4 video file. You can:
- Use sample videos from: https://sample-videos.com/
- Host your own video files
- Use any publicly accessible MP4 URL

Example URL: https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4

## Tech Stack

- Node.js + Express
- Socket.io (real-time sync)
- WebRTC (video chat)
- Vanilla JavaScript
