# 🎨 Collaborative Drawing Canvas

A real-time multi-user drawing application built with vanilla JavaScript, HTML5 Canvas, Node.js, and WebSockets (Socket.io). Multiple users can draw simultaneously with instant synchronization, global undo/redo, and live cursor tracking.

## ✨ Features

### Core Functionality
- **Real-time Drawing**: See other users' strokes as they draw in real-time
- **Drawing Tools**: Brush and eraser with adjustable size (1-50px)
- **Color Picker**: Full color palette + preset colors
- **Global Undo/Redo**: Works across all users with consistent state
- **User Presence**: See who's online with assigned colors
- **Cursor Tracking**: View other users' cursor positions in real-time
- **Room System**: Support for multiple isolated drawing rooms
- **Performance Metrics**: Live FPS and network latency display

### Technical Highlights
- **Vanilla JavaScript**: No frontend frameworks (React/Vue) - pure DOM manipulation
- **Raw Canvas API**: All drawing operations implemented from scratch
- **WebSocket Synchronization**: Socket.io for reliable real-time communication
- **Efficient Rendering**: Optimized canvas operations with separate cursor layer
- **Mobile Support**: Touch events for drawing on mobile devices
- **Keyboard Shortcuts**: Ctrl+Z (undo), Ctrl+Y (redo), B (brush), E (eraser)

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Start the server**:
```bash
npm start
```

3. **Open in browser**:
Navigate to `http://localhost:3000`

4. **Test with multiple users**:
- Open multiple browser windows/tabs
- Or open on different devices on the same network
- Each user gets a unique color automatically

### Development Mode

For auto-restart on file changes:
```bash
npm run dev
```

## 📖 How to Use

1. **Join a Room**:
   - Enter your name (or use default "Guest")
   - Enter room name (default is "default")
   - Click "Join Room"

2. **Drawing**:
   - Select Brush or Eraser tool
   - Choose a color from the picker or presets
   - Adjust brush size with the slider
   - Click and drag on canvas to draw

3. **Collaboration**:
   - See other users drawing in real-time
   - View their cursor positions with usernames
   - Undo/redo affects the entire canvas globally
   - All users see the same canvas state

4. **Keyboard Shortcuts**:
   - `Ctrl+Z`: Undo
   - `Ctrl+Y` or `Ctrl+Shift+Z`: Redo
   - `B`: Switch to Brush
   - `E`: Switch to Eraser

## 🏗️ Project Structure

```
collaborative-canvas/
├── client/                 # Frontend files
│   ├── index.html         # Main HTML structure
│   ├── style.css          # Styling and layout
│   ├── canvas.js          # Canvas drawing logic
│   ├── websocket.js       # WebSocket client manager
│   └── main.js            # App initialization & coordination
├── server/                # Backend files
│   ├── server.js          # Express + Socket.io server
│   ├── rooms.js           # Room and user management
│   └── drawing-state.js   # Drawing operation history
├── package.json           # Dependencies and scripts
├── README.md              # This file
└── ARCHITECTURE.md        # Technical architecture details
```

## 🎯 Technical Implementation

### Canvas Architecture
- **Dual Canvas System**: Separate canvases for drawing and cursors
- **Event-based Drawing**: Mouse and touch event handlers
- **Stroke Optimization**: Path smoothing and efficient rendering
- **Composite Operations**: Proper handling of eraser using `destination-out`

### Real-time Synchronization
- **Event Streaming**: Draw events sent in real-time during stroke
- **Operation History**: Complete strokes saved to server history
- **State Reconciliation**: New users receive full canvas state on join
- **Conflict Resolution**: Last-write-wins with timestamp ordering

### Global Undo/Redo
- **Centralized History**: Server maintains single source of truth
- **Index-based Navigation**: Track current position in operation history
- **Broadcast Updates**: All clients redraw when undo/redo occurs
- **Consistent State**: Guaranteed synchronization across all users

## 🔧 Configuration

### Server Port
Default: `3000`

Change by setting environment variable:
```bash
PORT=8080 npm start
```

### Room Cleanup
Empty rooms are automatically deleted after 5 minutes of inactivity.

## 📊 Performance Characteristics

### Optimization Strategies
1. **Throttled Cursor Updates**: Limited to 20Hz (50ms intervals)
2. **Efficient Redrawing**: Only redraw affected areas when possible
3. **Canvas Double Buffering**: Separate layers for static and dynamic content
4. **WebSocket Batching**: Group small operations to reduce overhead

### Expected Performance
- **FPS**: 60fps on modern browsers
- **Latency**: <100ms on local network, varies with internet connection
- **Concurrent Users**: Tested with 10+ simultaneous users
- **Canvas Size**: Adaptive to viewport (responsive)

## 🐛 Known Limitations

1. **Canvas Persistence**: Canvas is not saved to database (in-memory only)
2. **Large History**: Very long drawing sessions may consume memory
3. **Network Recovery**: Reconnection doesn't replay missed events
4. **Mobile UX**: Touch gestures could be enhanced (pinch-zoom, etc.)
5. **Browser Compatibility**: Best on Chrome/Firefox (modern ES6+ required)

## 🔍 Testing

### Multi-User Testing
1. Open `http://localhost:3000` in multiple browser windows
2. Join the same room with different usernames
3. Test drawing simultaneously
4. Test undo/redo operations
5. Check cursor tracking

### Network Testing
On local network:
1. Find server IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Access from other device: `http://<server-ip>:3000`

## 🚧 Future Enhancements

- [ ] Database persistence (MongoDB/PostgreSQL)
- [ ] User authentication and sessions
- [ ] More drawing tools (shapes, text, images)
- [ ] Layer system
- [ ] Export canvas as PNG/SVG
- [ ] Chat functionality
- [ ] Admin controls (kick users, lock canvas)
- [ ] Drawing playback/replay
- [ ] Collaborative permissions (view-only mode)

## 📝 Time Spent

- **Planning & Architecture**: ~1 hour
- **Server Implementation**: ~2 hours
- **Client Canvas Logic**: ~2 hours
- **WebSocket Integration**: ~1.5 hours
- **UI/UX Development**: ~2 hours
- **Testing & Debugging**: ~1.5 hours
- **Documentation**: ~1 hour
- **Total**: ~11 hours

## 📄 License

MIT License - Feel free to use this project for learning or commercial purposes.

## 🤝 Contributing

This is a technical assessment project, but feedback and suggestions are welcome!

## 📧 Support

For issues or questions, please open a GitHub issue or contact the developer.

---

**Built with ❤️ using Vanilla JavaScript and Socket.io**
