/**
 * Main Application
 * Coordinates canvas drawing, WebSocket communication, and UI interactions
 */

// Global instances
let canvasDrawing;
let wsManager;
let currentRoom = 'default';

// Previous point for remote drawing
const remoteDrawingState = new Map(); // userId -> {lastPoint, tool, color, lineWidth}

/**
 * Initialize the application
 */
function init() {
  // Show join modal
  showJoinModal();
  
  // Initialize canvas
  canvasDrawing = new CanvasDrawing('drawing-canvas', 'cursor-canvas');
  
  // Initialize WebSocket manager
  wsManager = new WebSocketManager();
  
  // Setup canvas callbacks
  setupCanvasCallbacks();
  
  // Setup WebSocket callbacks
  setupWebSocketCallbacks();
  
  // Setup UI event listeners
  setupUIListeners();
  
  // Connect to server
  wsManager.connect();
  
  // Start UI update loops
  startUIUpdates();
}

/**
 * Setup canvas event callbacks
 */
function setupCanvasCallbacks() {
  // Real-time drawing
  canvasDrawing.onDraw = (data) => {
    wsManager.sendDraw(data);
  };
  
  // Stroke complete
  canvasDrawing.onStrokeComplete = (data) => {
    wsManager.sendStrokeComplete(data);
  };
  
  // Cursor movement
  canvasDrawing.onCursorMove = (cursor) => {
    wsManager.sendCursorMove(cursor);
  };
}

/**
 * Setup WebSocket event callbacks
 */
function setupWebSocketCallbacks() {
  // Connection events
  wsManager.onConnected = () => {
    updateConnectionStatus(true);
  };
  
  wsManager.onDisconnected = () => {
    updateConnectionStatus(false);
  };
  
  // Room events
  wsManager.onRoomJoined = (data) => {
    console.log('Room joined successfully');
    hideJoinModal();
    updateUserInfo(data.user);
    updateUsersList(data.users);
    
    // Load initial drawing state
    if (data.drawingState && data.drawingState.operations) {
      canvasDrawing.redrawFromHistory(data.drawingState.operations);
    }
  };
  
  wsManager.onUserJoined = (data) => {
    updateUsersList(data.users);
    showNotification(`${data.user.username} joined the room`);
  };
  
  wsManager.onUserLeft = (data) => {
    updateUsersList(data.users);
    showNotification(`${data.username} left the room`);
  };
  
  // Drawing events
  wsManager.onDraw = (data) => {
    // Handle real-time drawing from other users
    if (!remoteDrawingState.has(data.userId)) {
      remoteDrawingState.set(data.userId, {});
    }
    
    const state = remoteDrawingState.get(data.userId);
    
    if (data.type === 'start') {
      state.lastPoint = data.point;
      state.tool = data.tool;
      state.color = data.color;
      state.lineWidth = data.lineWidth;
      
      canvasDrawing.drawRealtimePoint({
        type: 'start',
        point: data.point,
        tool: data.tool,
        color: data.color,
        lineWidth: data.lineWidth
      });
    } else if (data.type === 'continue') {
      canvasDrawing.drawRealtimePoint({
        type: 'continue',
        point: data.point,
        previousPoint: state.lastPoint,
        tool: state.tool,
        color: state.color,
        lineWidth: state.lineWidth
      });
      
      state.lastPoint = data.point;
    }
  };
  
  wsManager.onOperationAdded = (data) => {
    // Operation added confirmation (not needed for display as we already drew it)
    console.log('Operation added to history:', data.id);
  };
  
  // Cursor events
  wsManager.onCursorMove = (data) => {
    // Cursors are rendered in the update loop
  };
  
  // Undo/Redo events
  wsManager.onUndo = (data) => {
    console.log('Undo operation:', data);
    // Redraw canvas from current state
    const operations = data.operation.id >= 0 ? 
      wsManager.drawingOperations?.slice(0, data.newIndex + 1) || [] : [];
    canvasDrawing.redrawFromHistory(operations);
    
    if (data.userId !== wsManager.socket?.id) {
      showNotification(`${data.username} undid an action`);
    }
  };
  
  wsManager.onRedo = (data) => {
    console.log('Redo operation:', data);
    // Redraw the operation
    if (data.operation.type === 'stroke') {
      canvasDrawing.drawStroke(data.operation);
    }
    
    if (data.userId !== wsManager.socket?.id) {
      showNotification(`${data.username} redid an action`);
    }
  };
  
  // Clear events
  wsManager.onClear = (data) => {
    canvasDrawing.clearCanvas();
    
    if (data.userId !== wsManager.socket?.id) {
      showNotification(`${data.username} cleared the canvas`);
    }
  };
}

/**
 * Setup UI event listeners
 */
function setupUIListeners() {
  // Join room button
  document.getElementById('join-btn').addEventListener('click', handleJoinRoom);
  
  // Enter key in input fields
  document.getElementById('username-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleJoinRoom();
  });
  document.getElementById('room-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleJoinRoom();
  });
  
  // Tool buttons
  document.getElementById('brush-tool').addEventListener('click', () => {
    setTool('brush');
  });
  document.getElementById('eraser-tool').addEventListener('click', () => {
    setTool('eraser');
  });
  
  // Color picker
  document.getElementById('color-picker').addEventListener('input', (e) => {
    canvasDrawing.setColor(e.target.value);
  });
  
  // Preset colors
  document.querySelectorAll('.color-preset').forEach(preset => {
    preset.addEventListener('click', () => {
      const color = preset.dataset.color;
      canvasDrawing.setColor(color);
      document.getElementById('color-picker').value = color;
    });
  });
  
  // Brush size
  document.getElementById('brush-size').addEventListener('input', (e) => {
    const size = parseInt(e.target.value);
    canvasDrawing.setLineWidth(size);
    updateBrushPreview(size);
  });
  
  // Action buttons
  document.getElementById('undo-btn').addEventListener('click', () => {
    wsManager.sendUndo();
  });
  
  document.getElementById('redo-btn').addEventListener('click', () => {
    wsManager.sendRedo();
  });
  
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the canvas for everyone?')) {
      wsManager.sendClear();
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+Z: Undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      wsManager.sendUndo();
    }
    
    // Ctrl+Y or Ctrl+Shift+Z: Redo
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
      e.preventDefault();
      wsManager.sendRedo();
    }
    
    // B: Brush tool
    if (e.key === 'b' || e.key === 'B') {
      setTool('brush');
    }
    
    // E: Eraser tool
    if (e.key === 'e' || e.key === 'E') {
      setTool('eraser');
    }
  });
  
  // Initialize brush preview
  updateBrushPreview(canvasDrawing.getLineWidth());
}

/**
 * Handle room join
 */
function handleJoinRoom() {
  const username = document.getElementById('username-input').value.trim() || 'Guest';
  const roomId = document.getElementById('room-input').value.trim() || 'default';
  
  currentRoom = roomId;
  wsManager.joinRoom(roomId, username);
  
  document.getElementById('room-name').textContent = `Room: ${roomId}`;
}

/**
 * Set current tool
 */
function setTool(tool) {
  canvasDrawing.setTool(tool);
  
  // Update UI
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (tool === 'brush') {
    document.getElementById('brush-tool').classList.add('active');
  } else if (tool === 'eraser') {
    document.getElementById('eraser-tool').classList.add('active');
  }
}

/**
 * Update brush preview
 */
function updateBrushPreview(size) {
  const preview = document.getElementById('brush-preview-dot');
  const sizeValue = document.getElementById('brush-size-value');
  
  preview.style.width = `${size}px`;
  preview.style.height = `${size}px`;
  preview.style.background = canvasDrawing.getColor();
  sizeValue.textContent = `${size}px`;
}

/**
 * Update connection status
 */
function updateConnectionStatus(connected) {
  const statusEl = document.getElementById('connection-status');
  const statusText = statusEl.querySelector('.status-text');
  
  if (connected) {
    statusEl.classList.remove('disconnected');
    statusEl.classList.add('connected');
    statusText.textContent = 'Connected';
  } else {
    statusEl.classList.remove('connected');
    statusEl.classList.add('disconnected');
    statusText.textContent = 'Disconnected';
  }
}

/**
 * Update user info
 */
function updateUserInfo(user) {
  document.getElementById('user-name').textContent = `User: ${user.username}`;
  document.getElementById('user-name').style.background = user.color;
  document.getElementById('user-name').style.color = 'white';
}

/**
 * Update users list
 */
function updateUsersList(users) {
  const usersList = document.getElementById('users-list');
  const userCount = document.getElementById('user-count');
  
  userCount.textContent = users.length;
  
  usersList.innerHTML = users.map(user => `
    <div class="user-item">
      <div class="user-color-dot" style="background: ${user.color};"></div>
      <span class="user-name">${user.username}</span>
    </div>
  `).join('');
}

/**
 * Show notification
 */
function showNotification(message) {
  console.log('Notification:', message);
  // Could be enhanced with a toast notification system
}

/**
 * Show join modal
 */
function showJoinModal() {
  document.getElementById('join-modal').classList.remove('hidden');
}

/**
 * Hide join modal
 */
function hideJoinModal() {
  document.getElementById('join-modal').classList.add('hidden');
}

/**
 * Start UI update loops
 */
function startUIUpdates() {
  // Update FPS counter
  setInterval(() => {
    document.getElementById('fps-counter').textContent = canvasDrawing.getFPS();
  }, 500);
  
  // Update latency
  setInterval(() => {
    const latency = wsManager.getLatency();
    document.getElementById('latency').textContent = latency > 0 ? `${latency}ms` : '-';
  }, 1000);
  
  // Update remote cursors
  function updateCursors() {
    canvasDrawing.clearCursors();
    
    const remoteCursors = wsManager.getRemoteCursors();
    remoteCursors.forEach((data, userId) => {
      canvasDrawing.drawCursor(userId, data.username, data.cursor, data.color);
    });
    
    requestAnimationFrame(updateCursors);
  }
  
  requestAnimationFrame(updateCursors);
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
