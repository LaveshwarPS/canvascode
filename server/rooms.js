/**
 * Room Manager
 * Manages multiple drawing rooms and user sessions
 */

const DrawingState = require('./drawing-state');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room object
    this.userColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788'
    ];
  }

  /**
   * Get or create a room
   * @param {string} roomId - Room identifier
   * @returns {Object} - Room object
   */
  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: new Map(), // socketId -> user object
        drawingState: new DrawingState(roomId),
        createdAt: Date.now()
      });
    }
    return this.rooms.get(roomId);
  }

  /**
   * Add user to a room
   * @param {string} roomId - Room identifier
   * @param {string} socketId - Socket ID
   * @param {string} username - User's display name
   * @returns {Object} - User object
   */
  addUserToRoom(roomId, socketId, username) {
    const room = this.getRoom(roomId);
    
    // Assign a color to the user (cycle through available colors)
    const colorIndex = room.users.size % this.userColors.length;
    const user = {
      id: socketId,
      username: username || `User${room.users.size + 1}`,
      color: this.userColors[colorIndex],
      cursor: { x: 0, y: 0 },
      joinedAt: Date.now()
    };

    room.users.set(socketId, user);
    return user;
  }

  /**
   * Remove user from a room
   * @param {string} roomId - Room identifier
   * @param {string} socketId - Socket ID
   */
  removeUserFromRoom(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.users.delete(socketId);

    // Clean up empty rooms after 5 minutes
    if (room.users.size === 0) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(roomId);
        if (currentRoom && currentRoom.users.size === 0) {
          this.rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Get user from a room
   * @param {string} roomId - Room identifier
   * @param {string} socketId - Socket ID
   * @returns {Object|null} - User object or null
   */
  getUser(roomId, socketId) {
    const room = this.rooms.get(roomId);
    return room ? room.users.get(socketId) : null;
  }

  /**
   * Get all users in a room
   * @param {string} roomId - Room identifier
   * @returns {Array} - Array of user objects
   */
  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  /**
   * Update user cursor position
   * @param {string} roomId - Room identifier
   * @param {string} socketId - Socket ID
   * @param {Object} cursor - Cursor position {x, y}
   */
  updateUserCursor(roomId, socketId, cursor) {
    const user = this.getUser(roomId, socketId);
    if (user) {
      user.cursor = cursor;
    }
  }

  /**
   * Get drawing state for a room
   * @param {string} roomId - Room identifier
   * @returns {DrawingState} - Drawing state object
   */
  getDrawingState(roomId) {
    const room = this.getRoom(roomId);
    return room.drawingState;
  }
}

module.exports = RoomManager;
