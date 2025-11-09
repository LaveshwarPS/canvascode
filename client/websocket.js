/**
 * WebSocket Manager
 * Handles real-time communication with the server
 */

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.currentUser = null;
    this.users = [];
    this.remoteCursors = new Map(); // userId -> {cursor, username, color}
    this.latency = 0;
    this.lastPingTime = 0;
    
    // Event callbacks
    this.onConnected = null;
    this.onDisconnected = null;
    this.onRoomJoined = null;
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onDraw = null;
    this.onStrokeComplete = null;
    this.onCursorMove = null;
    this.onUndo = null;
    this.onRedo = null;
    this.onClear = null;
    this.onOperationAdded = null;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    // Connect to server (Socket.io handles connection automatically)
    this.socket = io({
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    this.setupEventListeners();
    this.startLatencyMonitoring();
  }

  /**
   * Setup Socket.io event listeners
   */
  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.connected = true;
      if (this.onConnected) {
        this.onConnected();
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.connected = false;
      if (this.onDisconnected) {
        this.onDisconnected();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    // Room events
    this.socket.on('room-joined', (data) => {
      console.log('Joined room:', data);
      this.currentUser = data.user;
      this.users = data.users;
      
      if (this.onRoomJoined) {
        this.onRoomJoined(data);
      }
    });

    this.socket.on('user-joined', (data) => {
      console.log('User joined:', data.user.username);
      this.users = data.users;
      
      if (this.onUserJoined) {
        this.onUserJoined(data);
      }
    });

    this.socket.on('user-left', (data) => {
      console.log('User left:', data.username);
      this.users = data.users;
      this.remoteCursors.delete(data.userId);
      
      if (this.onUserLeft) {
        this.onUserLeft(data);
      }
    });

    // Drawing events
    this.socket.on('draw', (data) => {
      if (this.onDraw) {
        this.onDraw(data);
      }
    });

    this.socket.on('operation-added', (data) => {
      if (this.onOperationAdded) {
        this.onOperationAdded(data);
      }
    });

    // Cursor events
    this.socket.on('cursor-move', (data) => {
      this.remoteCursors.set(data.userId, {
        cursor: data.cursor,
        username: data.username,
        color: data.color
      });
      
      if (this.onCursorMove) {
        this.onCursorMove(data);
      }
    });

    // Undo/Redo events
    this.socket.on('undo-operation', (data) => {
      if (this.onUndo) {
        this.onUndo(data);
      }
    });

    this.socket.on('redo-operation', (data) => {
      if (this.onRedo) {
        this.onRedo(data);
      }
    });

    // Canvas clear event
    this.socket.on('canvas-cleared', (data) => {
      if (this.onClear) {
        this.onClear(data);
      }
    });

    // Latency monitoring
    this.socket.on('pong', () => {
      this.latency = Date.now() - this.lastPingTime;
    });
  }

  /**
   * Join a drawing room
   */
  joinRoom(roomId, username) {
    this.socket.emit('join-room', { roomId, username });
  }

  /**
   * Send drawing data (real-time stroke)
   */
  sendDraw(data) {
    if (!this.connected) return;
    this.socket.emit('draw', data);
  }

  /**
   * Send stroke complete (add to history)
   */
  sendStrokeComplete(data) {
    if (!this.connected) return;
    this.socket.emit('stroke-complete', data);
  }

  /**
   * Send cursor position
   */
  sendCursorMove(cursor) {
    if (!this.connected) return;
    
    // Throttle cursor updates to reduce network traffic
    if (!this.lastCursorSend || Date.now() - this.lastCursorSend > 50) {
      this.socket.emit('cursor-move', cursor);
      this.lastCursorSend = Date.now();
    }
  }

  /**
   * Send undo command
   */
  sendUndo() {
    if (!this.connected) return;
    this.socket.emit('undo');
  }

  /**
   * Send redo command
   */
  sendRedo() {
    if (!this.connected) return;
    this.socket.emit('redo');
  }

  /**
   * Send clear canvas command
   */
  sendClear() {
    if (!this.connected) return;
    this.socket.emit('clear-canvas');
  }

  /**
   * Start latency monitoring
   */
  startLatencyMonitoring() {
    setInterval(() => {
      if (this.connected) {
        this.lastPingTime = Date.now();
        this.socket.emit('ping');
      }
    }, 2000);
  }

  /**
   * Get current latency
   */
  getLatency() {
    return this.latency;
  }

  /**
   * Get connection status
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get all users
   */
  getUsers() {
    return this.users;
  }

  /**
   * Get remote cursors
   */
  getRemoteCursors() {
    return this.remoteCursors;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
