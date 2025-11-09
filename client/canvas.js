/**
 * Canvas Drawing Manager
 * Handles all canvas drawing operations with efficient rendering
 */

class CanvasDrawing {
  constructor(canvasId, cursorCanvasId) {
    this.canvas = document.getElementById(canvasId);
    this.cursorCanvas = document.getElementById(cursorCanvasId);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    this.cursorCtx = this.cursorCanvas.getContext('2d', { willReadFrequently: false });
    
    // Drawing state
    this.isDrawing = false;
    this.currentTool = 'brush';
    this.currentColor = '#000000';
    this.lineWidth = 3;
    this.currentStroke = [];
    
    // Performance optimization
    this.drawingQueue = [];
    this.isRendering = false;
    this.lastFrameTime = 0;
    this.fps = 0;
    
    // Initialize canvas
    this.resizeCanvas();
    this.setupEventListeners();
    
    // Start render loop for FPS tracking
    this.startRenderLoop();
  }

  /**
   * Resize canvas to fit container
   */
  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Set display size
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.cursorCanvas.width = rect.width;
    this.cursorCanvas.height = rect.height;
    
    // Set rendering properties
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.cursorCtx.lineCap = 'round';
    this.cursorCtx.lineJoin = 'round';
  }

  /**
   * Setup event listeners for drawing
   */
  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Get mouse position relative to canvas
   */
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  /**
   * Get touch position relative to canvas
   */
  getTouchPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  /**
   * Mouse down handler
   */
  handleMouseDown(e) {
    this.isDrawing = true;
    const pos = this.getMousePos(e);
    this.startStroke(pos);
  }

  /**
   * Mouse move handler
   */
  handleMouseMove(e) {
    const pos = this.getMousePos(e);
    
    // Emit cursor position for other users
    if (this.onCursorMove) {
      this.onCursorMove(pos);
    }
    
    if (this.isDrawing) {
      this.continueStroke(pos);
    }
  }

  /**
   * Mouse up handler
   */
  handleMouseUp(e) {
    if (this.isDrawing) {
      this.endStroke();
    }
    this.isDrawing = false;
  }

  /**
   * Touch start handler
   */
  handleTouchStart(e) {
    e.preventDefault();
    this.isDrawing = true;
    const pos = this.getTouchPos(e);
    this.startStroke(pos);
  }

  /**
   * Touch move handler
   */
  handleTouchMove(e) {
    e.preventDefault();
    if (this.isDrawing) {
      const pos = this.getTouchPos(e);
      this.continueStroke(pos);
    }
  }

  /**
   * Touch end handler
   */
  handleTouchEnd(e) {
    e.preventDefault();
    if (this.isDrawing) {
      this.endStroke();
    }
    this.isDrawing = false;
  }

  /**
   * Handle resize
   */
  handleResize() {
    // Save current canvas content
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Resize canvas
    this.resizeCanvas();
    
    // Restore content
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Start a new stroke
   */
  startStroke(pos) {
    this.currentStroke = [pos];
    
    // Draw initial point
    this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.globalCompositeOperation = this.currentTool === 'eraser' ? 'destination-out' : 'source-over';
    
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    
    // Emit draw event for real-time sync
    if (this.onDraw) {
      this.onDraw({
        type: 'start',
        tool: this.currentTool,
        color: this.currentColor,
        lineWidth: this.lineWidth,
        point: pos
      });
    }
  }

  /**
   * Continue current stroke
   */
  continueStroke(pos) {
    if (this.currentStroke.length === 0) return;
    
    this.currentStroke.push(pos);
    
    // Draw line to new point
    const lastPos = this.currentStroke[this.currentStroke.length - 2];
    this.ctx.beginPath();
    this.ctx.moveTo(lastPos.x, lastPos.y);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    
    // Emit draw event for real-time sync
    if (this.onDraw) {
      this.onDraw({
        type: 'continue',
        point: pos
      });
    }
  }

  /**
   * End current stroke
   */
  endStroke() {
    if (this.currentStroke.length === 0) return;
    
    // Emit stroke complete event
    if (this.onStrokeComplete) {
      this.onStrokeComplete({
        tool: this.currentTool,
        color: this.currentColor,
        lineWidth: this.lineWidth,
        points: this.currentStroke
      });
    }
    
    this.currentStroke = [];
  }

  /**
   * Draw a complete stroke (from other users or history)
   */
  drawStroke(strokeData) {
    if (!strokeData.points || strokeData.points.length === 0) return;
    
    this.ctx.strokeStyle = strokeData.tool === 'eraser' ? '#FFFFFF' : strokeData.color;
    this.ctx.lineWidth = strokeData.lineWidth;
    this.ctx.globalCompositeOperation = strokeData.tool === 'eraser' ? 'destination-out' : 'source-over';
    
    this.ctx.beginPath();
    this.ctx.moveTo(strokeData.points[0].x, strokeData.points[0].y);
    
    for (let i = 1; i < strokeData.points.length; i++) {
      this.ctx.lineTo(strokeData.points[i].x, strokeData.points[i].y);
    }
    
    this.ctx.stroke();
  }

  /**
   * Draw a single point from real-time stream
   */
  drawRealtimePoint(data) {
    this.ctx.strokeStyle = data.tool === 'eraser' ? '#FFFFFF' : data.color;
    this.ctx.lineWidth = data.lineWidth;
    this.ctx.globalCompositeOperation = data.tool === 'eraser' ? 'destination-out' : 'source-over';
    
    if (data.type === 'start') {
      this.ctx.beginPath();
      this.ctx.moveTo(data.point.x, data.point.y);
      this.ctx.lineTo(data.point.x, data.point.y);
      this.ctx.stroke();
    } else if (data.type === 'continue' && data.previousPoint) {
      this.ctx.beginPath();
      this.ctx.moveTo(data.previousPoint.x, data.previousPoint.y);
      this.ctx.lineTo(data.point.x, data.point.y);
      this.ctx.stroke();
    }
  }

  /**
   * Clear the entire canvas
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Redraw canvas from operation history
   */
  redrawFromHistory(operations) {
    this.clearCanvas();
    
    operations.forEach(operation => {
      if (operation.type === 'stroke') {
        this.drawStroke(operation);
      }
    });
  }

  /**
   * Draw remote cursor
   */
  drawCursor(userId, username, cursor, color) {
    // Cursor will be drawn on the cursor canvas
    const cursorSize = 8;
    
    this.cursorCtx.fillStyle = color;
    this.cursorCtx.strokeStyle = 'white';
    this.cursorCtx.lineWidth = 2;
    
    // Draw cursor dot
    this.cursorCtx.beginPath();
    this.cursorCtx.arc(cursor.x, cursor.y, cursorSize, 0, Math.PI * 2);
    this.cursorCtx.fill();
    this.cursorCtx.stroke();
    
    // Draw username label
    this.cursorCtx.font = '12px sans-serif';
    this.cursorCtx.fillStyle = color;
    this.cursorCtx.fillText(username, cursor.x + 12, cursor.y - 8);
  }

  /**
   * Clear cursor canvas
   */
  clearCursors() {
    this.cursorCtx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);
  }

  /**
   * Start render loop for FPS tracking
   */
  startRenderLoop() {
    const loop = (timestamp) => {
      // Calculate FPS
      if (this.lastFrameTime) {
        const delta = timestamp - this.lastFrameTime;
        this.fps = Math.round(1000 / delta);
      }
      this.lastFrameTime = timestamp;
      
      requestAnimationFrame(loop);
    };
    
    requestAnimationFrame(loop);
  }

  /**
   * Get current FPS
   */
  getFPS() {
    return this.fps;
  }

  /**
   * Set current tool
   */
  setTool(tool) {
    this.currentTool = tool;
  }

  /**
   * Set current color
   */
  setColor(color) {
    this.currentColor = color;
  }

  /**
   * Set line width
   */
  setLineWidth(width) {
    this.lineWidth = width;
  }

  /**
   * Get current tool
   */
  getTool() {
    return this.currentTool;
  }

  /**
   * Get current color
   */
  getColor() {
    return this.currentColor;
  }

  /**
   * Get current line width
   */
  getLineWidth() {
    return this.lineWidth;
  }
}
