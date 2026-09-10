/**
 * SkillSwap Platform - Modular Express Application Server & WebRTC Signaling Hub
 */

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const requestLogger = require('./middleware/requestLogger');
const { attachUserContext } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const { initSchema } = require('./database/db');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(attachUserContext);

// Serve Frontend Static Assets (HTML, CSS, JS, Images)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
app.use(express.static(path.join(__dirname, '..'))); // Fallback static path

// Mount Modular API Routes
app.use('/api', apiRoutes);

// Catch-All Route for Single Page Application
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/webrtc-signaling')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// ==========================================
// WebSocket Real-Time WebRTC Signaling Server
// ==========================================
const wss = new WebSocketServer({ server, path: '/webrtc-signaling' });
const rooms = new Map(); // roomId -> Map(peerId -> { ws, userProfile })

wss.on('connection', (ws) => {
  let currentRoomId = null;
  let currentPeerId = null;

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw);
      const { type, roomId, peerId, targetPeerId, userProfile, sdp, candidate, mediaState, text, emoji } = data;

      switch (type) {
        case 'join-room': {
          currentRoomId = roomId || 'skillswap-room-default';
          currentPeerId = peerId || 'peer_' + Math.random().toString(36).substring(2, 9);

          if (!rooms.has(currentRoomId)) {
            rooms.set(currentRoomId, new Map());
          }
          const room = rooms.get(currentRoomId);

          // Get list of all existing peers in this meeting room
          const existingPeers = [];
          room.forEach((info, existingId) => {
            existingPeers.push({
              peerId: existingId,
              userProfile: info.userProfile
            });
          });

          // Add this peer to the room
          room.set(currentPeerId, { ws, userProfile });

          // Send confirmation back to newly joined peer with existing peers list
          ws.send(JSON.stringify({
            type: 'room-joined',
            roomId: currentRoomId,
            peerId: currentPeerId,
            peers: existingPeers
          }));

          // Notify all existing peers that a new participant has joined
          room.forEach((info, existingId) => {
            if (existingId !== currentPeerId && info.ws.readyState === 1) {
              info.ws.send(JSON.stringify({
                type: 'peer-joined',
                roomId: currentRoomId,
                peerId: currentPeerId,
                userProfile
              }));
            }
          });
          break;
        }

        case 'offer': {
          if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId);
            const target = room.get(targetPeerId);
            if (target && target.ws.readyState === 1) {
              target.ws.send(JSON.stringify({
                type: 'offer',
                senderPeerId: currentPeerId,
                sdp,
                userProfile
              }));
            }
          }
          break;
        }

        case 'answer': {
          if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId);
            const target = room.get(targetPeerId);
            if (target && target.ws.readyState === 1) {
              target.ws.send(JSON.stringify({
                type: 'answer',
                senderPeerId: currentPeerId,
                sdp
              }));
            }
          }
          break;
        }

        case 'ice-candidate': {
          if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId);
            const target = room.get(targetPeerId);
            if (target && target.ws.readyState === 1) {
              target.ws.send(JSON.stringify({
                type: 'ice-candidate',
                senderPeerId: currentPeerId,
                candidate
              }));
            }
          }
          break;
        }

        case 'media-state': {
          if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId);
            room.forEach((info, otherId) => {
              if (otherId !== currentPeerId && info.ws.readyState === 1) {
                info.ws.send(JSON.stringify({
                  type: 'media-state',
                  senderPeerId: currentPeerId,
                  mediaState
                }));
              }
            });
          }
          break;
        }

        case 'chat-message': {
          if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId);
            room.forEach((info) => {
              if (info.ws.readyState === 1) {
                info.ws.send(JSON.stringify({
                  type: 'chat-message',
                  senderPeerId: currentPeerId,
                  senderName: userProfile?.name || 'User',
                  text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
              }
            });
          }
          break;
        }

        case 'reaction': {
          if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId);
            room.forEach((info) => {
              if (info.ws.readyState === 1) {
                info.ws.send(JSON.stringify({
                  type: 'reaction',
                  senderPeerId: currentPeerId,
                  senderName: userProfile?.name || 'User',
                  emoji
                }));
              }
            });
          }
          break;
        }

        case 'leave-room': {
          handlePeerLeave(currentRoomId, currentPeerId);
          break;
        }
      }
    } catch (e) {
      console.warn('WebSocket message error:', e.message);
    }
  });

  const handlePeerLeave = (rId, pId) => {
    if (rId && pId && rooms.has(rId)) {
      const room = rooms.get(rId);
      room.delete(pId);
      if (room.size === 0) {
        rooms.delete(rId);
      } else {
        room.forEach((info) => {
          if (info.ws.readyState === 1) {
            info.ws.send(JSON.stringify({
              type: 'peer-left',
              roomId: rId,
              peerId: pId
            }));
          }
        });
      }
    }
  };

  ws.on('close', () => {
    handlePeerLeave(currentRoomId, currentPeerId);
  });

  ws.on('error', () => {
    handlePeerLeave(currentRoomId, currentPeerId);
  });
});

// Initialize DB and Boot Server
async function startServer() {
  try {
    await initSchema();
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n========================================================`);
      console.log(`🚀 SkillSwap Platform Live: http://localhost:${PORT}`);
      console.log(`📚 Frontend Path: ${frontendPath}`);
      console.log(`🎥 Real-Time WebRTC Video & Zoom Hub: Active on /webrtc-signaling`);
      console.log(`🤖 AI 20-Q Dynamic Assessment & Negative Marking (+3/-1/0) Active`);
      console.log(`========================================================\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start SkillSwap server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server };
