/**
 * SkillSwap Platform - Real-Time Live Video Conferencing & Zoom Web SDK Engine
 * Supports:
 * - Real Webcam & Microphone Hardware Streaming (getUserMedia)
 * - P2P Mesh WebRTC (RTCPeerConnection) with Google STUN Servers
 * - Cross-Window / Cross-Tab (BroadcastChannel) & Cross-Device (WebSocket on /webrtc-signaling)
 * - Microphone Mute/Unmute, Camera On/Off, Screen Sharing, Leave Call
 * - Real-Time Voice Activity Detection (VAD) & Audio Waves
 * - User A (Host) and User B (Learner) Real-Time Audio & Video Rendering
 */

class SkillSwapConference {
  constructor() {
    this.localStream = null;
    this.screenStream = null;
    this.peerConnections = new Map(); // peerId -> RTCPeerConnection
    this.remoteStreams = new Map();    // peerId -> MediaStream
    this.remoteUsers = new Map();      // peerId -> UserProfile

    this.sessionId = null;
    this.roomId = null;
    this.peerId = 'peer_' + Math.random().toString(36).substring(2, 9);
    this.currentMeetingData = null;
    this.currentSessionData = null;

    this.isInCall = false;
    this.isAudioMuted = false;
    this.isVideoOff = false;
    this.isScreenSharing = false;

    // Dual Signaling (WebSocket + BroadcastChannel)
    this.ws = null;
    this.broadcastChannel = null;

    // Google STUN Servers Configuration
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    };

    // Voice Activity Detection
    this.audioContext = null;
    this.analyser = null;
    this.vadInterval = null;
  }

  /**
   * Initialize and join a real-time live meeting for a Skill Swap session
   * @param {string} sessionId Skill Swap session ID
   * @param {Object} sessionData Session metadata from backend
   * @param {Object} meetingData Unified meeting and signature information from backend
   */
  async startMeeting(sessionId, sessionData, meetingData) {
    this.sessionId = sessionId;
    this.currentSessionData = sessionData;
    this.currentMeetingData = meetingData;
    this.roomId = `skillswap_meet_${sessionId}`;

    const currentUser = window.store.getCurrentPersona();
    this.currentUserProfile = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      avatar: currentUser.avatar,
      role: currentUser.role,
      isHost: meetingData.isHost || (sessionData.teacher_id === currentUser.id)
    };

    console.log(`🎥 Initializing Live Video Meeting [Room: ${this.roomId}] as "${this.currentUserProfile.name}" (${this.currentUserProfile.isHost ? 'Host' : 'Participant'})`);

    // 1. Acquire Local Camera & Microphone Stream
    await this.initLocalMedia();

    // 2. Connect to WebSocket Signaling Server
    this.initWebSocketSignaling();

    // 3. Connect to Cross-Tab BroadcastChannel Signaling
    this.initBroadcastSignaling();

    this.isInCall = true;
    this.initVoiceActivityDetection();
    this.updateMediaButtonsUI();

    return {
      success: true,
      roomId: this.roomId,
      peerId: this.peerId,
      localStream: this.localStream
    };
  }

  /**
   * Acquire local webcam and microphone stream
   */
  async initLocalMedia() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        this.isVideoOff = false;
        this.isAudioMuted = false;
        console.log('✅ Local camera and microphone hardware acquired successfully.');
      } else {
        throw new Error('MediaDevices API not supported in this browser environment.');
      }
    } catch (err) {
      console.warn('⚠️ Camera / Mic hardware access notice:', err.message);
      // Create empty/dummy media stream so WebRTC connection proceeds gracefully
      this.localStream = this.createFallbackMediaStream();
      this.isVideoOff = true;
      if (window.app?.showToast) {
        window.app.showToast('Camera/Mic permission prompt closed or in preview mode. Live room ready.', 'info');
      }
    }

    // Attach local stream to the local user video tile
    this.renderLocalVideoTile();
  }

  /**
   * Fallback stream if camera is unavailable or denied
   */
  createFallbackMediaStream() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#161922';
      ctx.fillRect(0, 0, 640, 480);
      return canvas.captureStream ? canvas.captureStream(15) : new MediaStream();
    } catch (e) {
      return new MediaStream();
    }
  }

  /**
   * Render the local video feed in the appropriate video box
   */
  renderLocalVideoTile() {
    const isHost = this.currentUserProfile?.isHost;
    const instructorVideo = document.getElementById('liveRoomInstructorVideo');
    const instructorAvatarHolder = document.getElementById('liveRoomInstructorAvatarHolder');

    if (isHost && instructorVideo) {
      instructorVideo.srcObject = this.localStream;
      instructorVideo.muted = true; // Mute local audio feedback to prevent echo
      instructorVideo.style.display = 'block';
      if (instructorAvatarHolder) instructorAvatarHolder.style.display = 'none';
      instructorVideo.play().catch(() => {});
    }
  }

  /**
   * Connect to WebSocket Signaling Server
   */
  initWebSocketSignaling() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/webrtc-signaling`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('⚡ WebSocket Signaling Connected to /webrtc-signaling');
        this.sendSignalingMessage({
          type: 'join-room',
          roomId: this.roomId,
          peerId: this.peerId,
          userProfile: this.currentUserProfile
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleSignalingMessage(message);
        } catch (e) {
          console.warn('Signaling parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket signaling connection notice:', err);
      };

      this.ws.onclose = () => {
        console.log('WebSocket signaling connection closed.');
      };
    } catch (err) {
      console.warn('WebSocket init exception:', err);
    }
  }

  /**
   * Connect to Cross-Tab BroadcastChannel Signaling
   */
  initBroadcastSignaling() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel(`skillswap_channel_${this.roomId}`);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.peerId !== this.peerId) {
            this.handleSignalingMessage(event.data);
          }
        };

        // Announce presence across tabs
        this.broadcastChannel.postMessage({
          type: 'join-room',
          roomId: this.roomId,
          peerId: this.peerId,
          userProfile: this.currentUserProfile
        });
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }
  }

  /**
   * Send a signaling message through WebSocket and BroadcastChannel
   */
  sendSignalingMessage(msg) {
    const payload = {
      ...msg,
      roomId: this.roomId,
      peerId: this.peerId
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (e) {}
    }
  }

  /**
   * Handle incoming signaling messages
   */
  async handleSignalingMessage(msg) {
    const { type, peerId, senderPeerId, targetPeerId, userProfile, sdp, candidate, peers, mediaState, emoji, text, senderName } = msg;

    switch (type) {
      case 'room-joined': {
        // We received list of existing peers in the room -> initiate offer to each
        if (peers && Array.isArray(peers)) {
          for (const p of peers) {
            if (p.peerId !== this.peerId) {
              this.remoteUsers.set(p.peerId, p.userProfile);
              await this.createPeerConnection(p.peerId, true, p.userProfile);
            }
          }
        }
        break;
      }

      case 'peer-joined': {
        if (peerId && peerId !== this.peerId) {
          console.log(`👤 Peer Joined Meeting: ${userProfile?.name || peerId}`);
          this.remoteUsers.set(peerId, userProfile);
          if (window.app?.showToast) {
            window.app.showToast(`👋 ${userProfile?.name || 'Peer'} joined the live meeting!`, 'user');
          }
          // The peer who was already in the room creates an offer to the newly joined peer
          await this.createPeerConnection(peerId, true, userProfile);
        }
        break;
      }

      case 'offer': {
        if (senderPeerId && senderPeerId !== this.peerId) {
          console.log(`📩 Received SDP Offer from ${senderPeerId}`);
          if (userProfile) this.remoteUsers.set(senderPeerId, userProfile);
          const pc = await this.createPeerConnection(senderPeerId, false, userProfile);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.sendSignalingMessage({
            type: 'answer',
            targetPeerId: senderPeerId,
            sdp: pc.localDescription
          });
        }
        break;
      }

      case 'answer': {
        if (senderPeerId && this.peerConnections.has(senderPeerId)) {
          console.log(`📩 Received SDP Answer from ${senderPeerId}`);
          const pc = this.peerConnections.get(senderPeerId);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
        break;
      }

      case 'ice-candidate': {
        if (senderPeerId && candidate && this.peerConnections.has(senderPeerId)) {
          const pc = this.peerConnections.get(senderPeerId);
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('Error adding ICE candidate:', e);
          }
        }
        break;
      }

      case 'media-state': {
        if (senderPeerId) {
          this.handleRemoteMediaStateChange(senderPeerId, mediaState);
        }
        break;
      }

      case 'peer-left': {
        if (peerId) {
          this.handlePeerLeft(peerId);
        }
        break;
      }

      case 'reaction': {
        this.renderFloatingReaction(emoji || '👏', senderName);
        break;
      }

      case 'chat-message': {
        this.appendInMeetingChatMessage(senderName || 'Peer', text);
        break;
      }
    }
  }

  /**
   * Create an RTCPeerConnection for a remote peer
   */
  async createPeerConnection(remotePeerId, isInitiator, remoteProfile) {
    if (this.peerConnections.has(remotePeerId)) {
      return this.peerConnections.get(remotePeerId);
    }

    console.log(`🔗 Creating RTCPeerConnection with peer: ${remotePeerId} (Initiator: ${isInitiator})`);
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(remotePeerId, pc);

    // Add local media tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          targetPeerId: remotePeerId,
          candidate: event.candidate
        });
      }
    };

    // Handle incoming remote media tracks (User A sees User B & User B sees User A)
    pc.ontrack = (event) => {
      console.log(`📺 Received remote ${event.track.kind} track from peer: ${remotePeerId}`);
      let remoteStream = this.remoteStreams.get(remotePeerId);
      if (!remoteStream) {
        remoteStream = new MediaStream();
        this.remoteStreams.set(remotePeerId, remoteStream);
      }
      remoteStream.addTrack(event.track);

      // Render the remote peer's live video and audio
      this.renderRemotePeerTile(remotePeerId, remoteStream, remoteProfile);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🌐 WebRTC Connection State with ${remotePeerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.handlePeerLeft(remotePeerId);
      }
    };

    // If initiator, create and send SDP offer
    if (isInitiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        this.sendSignalingMessage({
          type: 'offer',
          targetPeerId: remotePeerId,
          sdp: pc.localDescription,
          userProfile: this.currentUserProfile
        });
      } catch (err) {
        console.warn('Error creating SDP offer:', err);
      }
    }

    return pc;
  }

  /**
   * Render a remote peer's video box in the meeting stage
   */
  renderRemotePeerTile(peerId, stream, userProfile) {
    const profile = userProfile || this.remoteUsers.get(peerId) || { name: 'Peer', role: 'STUDENT' };
    const attendeesGrid = document.getElementById('liveRoomAttendeesGrid');
    const instructorVideo = document.getElementById('liveRoomInstructorVideo');
    const instructorAvatarHolder = document.getElementById('liveRoomInstructorAvatarHolder');
    const instructorName = document.getElementById('liveRoomInstructorName');
    const instructorTag = document.getElementById('liveRoomInstructorTag');

    // If remote user is the host and we are the student, attach to instructor podium
    if (profile.isHost && instructorVideo) {
      instructorVideo.srcObject = stream;
      instructorVideo.muted = false; // Hear the instructor!
      instructorVideo.style.display = 'block';
      if (instructorAvatarHolder) instructorAvatarHolder.style.display = 'none';
      if (instructorName) instructorName.textContent = `${profile.name} (Host Tutor)`;
      if (instructorTag) instructorTag.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i> ${profile.name} (Host Tutor)`;
      instructorVideo.play().catch(() => {});
      return;
    }

    // Otherwise render in attendees grid tile
    if (attendeesGrid) {
      let existingTile = document.getElementById(`peerTile_${peerId}`);
      if (!existingTile) {
        existingTile = document.createElement('div');
        existingTile.className = 'video-box student-tile';
        existingTile.id = `peerTile_${peerId}`;
        existingTile.style.position = 'relative';
        existingTile.innerHTML = `
          <video id="peerVideo_${peerId}" class="room-video-feed" autoplay playsinline style="display: block; width: 100%; height: 100%; object-fit: cover; border-radius: inherit;"></video>
          <div class="video-live-badge"><span class="status-dot-green"></span> <span>HD 720p</span></div>
          <div class="video-name-tag"><i class="fa-solid fa-graduation-cap"></i> <span id="peerNameTag_${peerId}">${profile.name} (${profile.role || 'Peer'})</span></div>
          <div class="video-status-mic" id="peerMicTag_${peerId}"><i class="fa-solid fa-microphone"></i></div>
        `;
        attendeesGrid.appendChild(existingTile);
      }

      const videoEl = document.getElementById(`peerVideo_${peerId}`);
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.muted = false; // Hear the peer!
        videoEl.play().catch(() => {});
      }
    }
  }

  /**
   * Handle media state change from a remote peer (e.g. muted/camera off)
   */
  handleRemoteMediaStateChange(peerId, state) {
    if (!state) return;
    const micTag = document.getElementById(`peerMicTag_${peerId}`);
    if (micTag) {
      micTag.innerHTML = state.isAudioMuted ? '<i class="fa-solid fa-microphone-slash" style="color: #ef4444;"></i>' : '<i class="fa-solid fa-microphone" style="color: #10b981;"></i>';
    }
    const videoEl = document.getElementById(`peerVideo_${peerId}`);
    if (videoEl && state.isVideoOff !== undefined) {
      videoEl.style.opacity = state.isVideoOff ? '0.3' : '1.0';
    }
  }

  /**
   * Clean up when a peer leaves
   */
  handlePeerLeft(peerId) {
    console.log(`🚪 Peer left the meeting: ${peerId}`);
    if (this.peerConnections.has(peerId)) {
      this.peerConnections.get(peerId).close();
      this.peerConnections.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.remoteUsers.delete(peerId);

    const tile = document.getElementById(`peerTile_${peerId}`);
    if (tile) tile.remove();

    if (window.app?.showToast) {
      window.app.showToast('A participant has left the meeting.', 'info');
    }
  }

  // ==========================================
  // Media Controls (Mute, Video, Screen Share, Leave)
  // ==========================================
  toggleMicrophone() {
    this.isAudioMuted = !this.isAudioMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isAudioMuted;
      });
    }

    this.sendSignalingMessage({
      type: 'media-state',
      mediaState: {
        isAudioMuted: this.isAudioMuted,
        isVideoOff: this.isVideoOff
      }
    });

    this.updateMediaButtonsUI();
    if (window.app?.showToast) {
      window.app.showToast(this.isAudioMuted ? 'Microphone Muted' : 'Microphone Live (Unmuted)', this.isAudioMuted ? 'microphone-slash' : 'microphone');
    }
    return this.isAudioMuted;
  }

  toggleCamera() {
    this.isVideoOff = !this.isVideoOff;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !this.isVideoOff;
      });
    }

    this.sendSignalingMessage({
      type: 'media-state',
      mediaState: {
        isAudioMuted: this.isAudioMuted,
        isVideoOff: this.isVideoOff
      }
    });

    this.updateMediaButtonsUI();
    if (window.app?.showToast) {
      window.app.showToast(this.isVideoOff ? 'Camera Stopped' : 'Camera Live', this.isVideoOff ? 'video-slash' : 'video');
    }
    return this.isVideoOff;
  }

  async toggleScreenShare() {
    if (!this.isScreenSharing) {
      try {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        const screenTrack = this.screenStream.getVideoTracks()[0];
        // Replace video track on all peer connections
        this.peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Update local video element to display shared screen
        const localVideo = document.getElementById('liveRoomInstructorVideo');
        if (localVideo) localVideo.srcObject = this.screenStream;

        screenTrack.onended = () => {
          this.stopScreenShare();
        };

        this.isScreenSharing = true;
        if (window.app?.showToast) window.app.showToast('Screen sharing started', 'desktop');
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err.message);
      }
    } else {
      this.stopScreenShare();
    }
    this.updateMediaButtonsUI();
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    // Restore camera video track on all peer connections
    if (this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack);
        }
      });

      const localVideo = document.getElementById('liveRoomInstructorVideo');
      if (localVideo) localVideo.srcObject = this.localStream;
    }

    this.isScreenSharing = false;
    this.updateMediaButtonsUI();
    if (window.app?.showToast) window.app.showToast('Screen sharing stopped', 'desktop');
  }

  leaveMeeting() {
    // 1. Notify peers
    this.sendSignalingMessage({ type: 'leave-room' });

    // 2. Stop all hardware tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    // 3. Close peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.remoteUsers.clear();

    // 4. Close signaling channels
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    this.isInCall = false;
    if (window.app?.showToast) {
      window.app.showToast('Left the live video meeting.', 'phone-slash');
    }
  }

  // ==========================================
  // Voice Activity Detection (VAD) & Audio Waves
  // ==========================================
  initVoiceActivityDetection() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass || !this.localStream || this.localStream.getAudioTracks().length === 0) return;

      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.vadInterval = setInterval(() => {
        if (this.isAudioMuted || !this.isInCall) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const isSpeaking = average > 18;

        // Animate audio wave bars in media controls bar
        const bars = document.querySelectorAll('.audio-wave-bars .bar');
        bars.forEach((b, idx) => {
          if (isSpeaking) {
            b.style.height = `${Math.min(18, 4 + (dataArray[idx * 4] || 10) / 14)}px`;
            b.style.background = '#10b981';
          } else {
            b.style.height = '4px';
            b.style.background = '#64748b';
          }
        });
      }, 100);
    } catch (e) {
      console.warn('VAD initialization note:', e);
    }
  }

  updateMediaButtonsUI() {
    const micBtn = document.getElementById('roomToggleMicBtn');
    const micLabel = document.getElementById('roomMicBtnLabel');
    const micStatusText = document.getElementById('liveMicStatusText');
    const camBtn = document.getElementById('roomToggleCamBtn');
    const camLabel = document.getElementById('roomCamBtnLabel');
    const camStatusText = document.getElementById('liveCamStatusText');
    const screenBtn = document.getElementById('roomToggleScreenBtn');

    if (micBtn) {
      micBtn.classList.toggle('active', !this.isAudioMuted);
      micBtn.classList.toggle('muted', this.isAudioMuted);
      const icon = micBtn.querySelector('i');
      if (icon) icon.className = this.isAudioMuted ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone';
    }
    if (micLabel) micLabel.textContent = this.isAudioMuted ? 'Unmute' : 'Mute';
    if (micStatusText) {
      micStatusText.textContent = this.isAudioMuted ? 'Muted' : 'Mic Live';
      micStatusText.style.color = this.isAudioMuted ? '#f87171' : 'var(--accent-emerald)';
    }

    if (camBtn) {
      camBtn.classList.toggle('active', !this.isVideoOff);
      camBtn.classList.toggle('off', this.isVideoOff);
      const icon = camBtn.querySelector('i');
      if (icon) icon.className = this.isVideoOff ? 'fa-solid fa-video-slash' : 'fa-solid fa-video';
    }
    if (camLabel) camLabel.textContent = this.isVideoOff ? 'Start Video' : 'Stop Video';
    if (camStatusText) {
      camStatusText.textContent = this.isVideoOff ? 'Camera Off' : 'HD 1080p Video';
    }

    if (screenBtn) {
      screenBtn.classList.toggle('active', this.isScreenSharing);
      const label = screenBtn.querySelector('.ctrl-label');
      if (label) label.textContent = this.isScreenSharing ? 'Stop Share' : 'Share Screen';
    }
  }

  sendReaction(emoji) {
    this.renderFloatingReaction(emoji, this.currentUserProfile?.name || 'You');
    this.sendSignalingMessage({
      type: 'reaction',
      emoji,
      userProfile: this.currentUserProfile
    });
  }

  renderFloatingReaction(emoji, senderName) {
    const stage = document.querySelector('.session-main-stage') || document.body;
    const el = document.createElement('div');
    el.className = 'floating-reaction-bubble';
    el.style.cssText = `
      position: absolute;
      bottom: 90px;
      right: ${40 + Math.random() * 120}px;
      font-size: 2.2rem;
      z-index: 100;
      pointer-events: none;
      animation: floatUpFade 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
    `;
    el.innerHTML = `<span>${emoji}</span>`;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  appendInMeetingChatMessage(sender, text) {
    const chatContainer = document.getElementById('liveRoomChatMessages');
    if (chatContainer) {
      const msgEl = document.createElement('div');
      msgEl.style.cssText = 'background: rgba(255,255,255,0.06); padding: 0.4rem 0.6rem; border-radius: 6px; margin-bottom: 0.4rem; font-size: 0.8rem;';
      msgEl.innerHTML = `<strong>${sender}:</strong> <span style="color: #cbd5e1;">${text}</span>`;
      chatContainer.appendChild(msgEl);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }
}

// Instantiate global conference engine
window.skillSwapConference = new SkillSwapConference();
