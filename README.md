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

For large movies (5GB+), don't upload directly. Instead:

### Google Drive (Recommended)
1. Upload your movie to Google Drive
2. Right-click → Share → "Anyone with the link"
3. Copy the link (e.g., `https://drive.google.com/file/d/1ABC123XYZ/view`)
4. Convert to direct link: `https://drive.google.com/uc?export=download&id=1ABC123XYZ`
5. Paste in the app!

### Dropbox
1. Upload to Dropbox
2. Get shareable link
3. Change `?dl=0` to `?dl=1` at the end
4. Paste in the app!

### Direct MP4 Links
Any direct video URL works:
- `https://example.com/movie.mp4`
- Sample: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`

### File Upload
- Only for videos under 100MB
- Larger files will be slow or fail

## Deployment

### Deploy to Vercel

**Note:** Vercel's free tier has limitations with WebSocket connections (Socket.io). For production use, consider deploying to:
- Heroku
- Railway
- Render
- DigitalOcean

If you still want to try Vercel:

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

### Deploy to Railway (Recommended)

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `watch-together` repository
4. Railway will auto-detect and deploy
5. Your app will be live with full WebSocket support!

### Deploy to Render

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Click "Create Web Service"
