/**
 * Collaborative Canvas Server
 * WebSocket server for real-time drawing synchronization
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const RoomManager = require('./rooms');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const roomManager = new RoomManager();

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  let currentRoom = null;
  let currentUser = null;

  /**
   * Handle room join
   */
  socket.on('join-room', (data) => {
    const { roomId, username } = data;
    currentRoom = roomId || 'default';
    
    // Join socket.io room
    socket.join(currentRoom);
    
    // Add user to room manager
    currentUser = roomManager.addUserToRoom(currentRoom, socket.id, username);
    
    // Get current drawing state
    const drawingState = roomManager.getDrawingState(currentRoom);
    const roomUsers = roomManager.getRoomUsers(currentRoom);
    
    // Send initial state to the joining user
    socket.emit('room-joined', {
      user: currentUser,
      users: roomUsers,
      drawingState: drawingState.getFullState()
    });
    
    // Notify other users in the room
    socket.to(currentRoom).emit('user-joined', {
      user: currentUser,
      users: roomUsers
    });
    
    console.log(`${currentUser.username} joined room: ${currentRoom}`);
  });

  /**
   * Handle drawing events (real-time stroke data)
   */
  socket.on('draw', (data) => {
    if (!currentRoom) return;
    
    // Add user info and broadcast to other users in real-time
    const drawData = {
      ...data,
      userId: socket.id,
      username: currentUser?.username,
      userColor: currentUser?.color
    };
    
    // Broadcast to other users immediately (not saved to history yet)
    socket.to(currentRoom).emit('draw', drawData);
  });

  /**
   * Handle stroke completion (save to operation history)
   */
  socket.on('stroke-complete', (data) => {
    if (!currentRoom) return;
    
    const drawingState = roomManager.getDrawingState(currentRoom);
    
    // Create operation object
    const operation = {
      type: 'stroke',
      userId: socket.id,
      username: currentUser?.username,
      userColor: currentUser?.color,
      tool: data.tool,
      color: data.color,
      lineWidth: data.lineWidth,
      points: data.points
    };
    
    // Add to operation history
    const operationId = drawingState.addOperation(operation);
    
    // Broadcast to all users (including sender for confirmation)
    io.to(currentRoom).emit('operation-added', {
      ...operation,
      id: operationId
    });
  });

  /**
   * Handle cursor movement
   */
  socket.on('cursor-move', (data) => {
    if (!currentRoom) return;
    
    roomManager.updateUserCursor(currentRoom, socket.id, data);
    
    // Broadcast cursor position to other users
    socket.to(currentRoom).emit('cursor-move', {
      userId: socket.id,
      username: currentUser?.username,
      cursor: data,
      color: currentUser?.color
    });
  });

  /**
   * Handle undo operation
   */
  socket.on('undo', () => {
    if (!currentRoom) return;
    
    const drawingState = roomManager.getDrawingState(currentRoom);
    const result = drawingState.undo();
    
    if (result) {
      // Broadcast undo to all users
      io.to(currentRoom).emit('undo-operation', {
        userId: socket.id,
        username: currentUser?.username,
        operation: result.operation,
        newIndex: result.newIndex
      });
    }
  });

  /**
   * Handle redo operation
   */
  socket.on('redo', () => {
    if (!currentRoom) return;
    
    const drawingState = roomManager.getDrawingState(currentRoom);
    const result = drawingState.redo();
    
    if (result) {
      // Broadcast redo to all users
      io.to(currentRoom).emit('redo-operation', {
        userId: socket.id,
        username: currentUser?.username,
        operation: result.operation,
        newIndex: result.newIndex
      });
    }
  });

  /**
   * Handle clear canvas
   */
  socket.on('clear-canvas', () => {
    if (!currentRoom) return;
    
    const drawingState = roomManager.getDrawingState(currentRoom);
    drawingState.clear();
    
    // Broadcast clear to all users
    io.to(currentRoom).emit('canvas-cleared', {
      userId: socket.id,
      username: currentUser?.username
    });
  });

  /**
   * Handle disconnect
   */
  socket.on('disconnect', () => {
    if (currentRoom && currentUser) {
      roomManager.removeUserFromRoom(currentRoom, socket.id);
      const roomUsers = roomManager.getRoomUsers(currentRoom);
      
      // Notify other users
      socket.to(currentRoom).emit('user-left', {
        userId: socket.id,
        username: currentUser.username,
        users: roomUsers
      });
      
      console.log(`${currentUser.username} left room: ${currentRoom}`);
    }
    
    console.log(`Client disconnected: ${socket.id}`);
  });

  /**
   * Handle errors
   */
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Collaborative Canvas Server running on port ${PORT}`);
  console.log(`📍 Open http://localhost:${PORT} in multiple browser windows to test`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
