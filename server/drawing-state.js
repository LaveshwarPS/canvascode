/**
 * Drawing State Manager
 * Manages canvas operations history and state synchronization across clients
 */

class DrawingState {
  constructor(roomId) {
    this.roomId = roomId;
    this.operations = []; // Ordered list of all drawing operations
    this.currentIndex = -1; // Current position in operation history (for undo/redo)
  }

  /**
   * Add a new drawing operation to the history
   * @param {Object} operation - Drawing operation data
   * @returns {number} - Operation ID
   */
  addOperation(operation) {
    // If we're not at the end of history, remove operations after current index
    // This happens when user draws after undoing some operations
    if (this.currentIndex < this.operations.length - 1) {
      this.operations.splice(this.currentIndex + 1);
    }

    // Add timestamp and unique ID
    const opWithMetadata = {
      ...operation,
      id: this.operations.length,
      timestamp: Date.now()
    };

    this.operations.push(opWithMetadata);
    this.currentIndex++;

    return opWithMetadata.id;
  }

  /**
   * Undo the last operation
   * @returns {Object|null} - Undo result with operation to undo
   */
  undo() {
    if (this.currentIndex < 0) {
      return null;
    }

    const operation = this.operations[this.currentIndex];
    this.currentIndex--;

    return {
      type: 'undo',
      operation,
      newIndex: this.currentIndex
    };
  }

  /**
   * Redo the next operation
   * @returns {Object|null} - Redo result with operation to redo
   */
  redo() {
    if (this.currentIndex >= this.operations.length - 1) {
      return null;
    }

    this.currentIndex++;
    const operation = this.operations[this.currentIndex];

    return {
      type: 'redo',
      operation,
      newIndex: this.currentIndex
    };
  }

  /**
   * Get all active operations (up to current index)
   * @returns {Array} - Array of active operations
   */
  getActiveOperations() {
    return this.operations.slice(0, this.currentIndex + 1);
  }

  /**
   * Get full state for new clients joining
   * @returns {Object} - Complete drawing state
   */
  getFullState() {
    return {
      operations: this.getActiveOperations(),
      currentIndex: this.currentIndex
    };
  }

  /**
   * Clear all drawing operations
   */
  clear() {
    this.operations = [];
    this.currentIndex = -1;
  }
}

module.exports = DrawingState;
