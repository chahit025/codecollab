import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    this.socket = io('http://localhost:3000', {
      withCredentials: true
    });
    return this.socket;
  }

  joinRoom(roomId, username, isHost) {
    if (this.socket) {
      this.socket.emit('join_room', { roomId, username, isHost });
    }
  }

  onRoomState(callback) {
    if (this.socket) {
      this.socket.on('room_state', callback);
    }
  }

  onUserJoined(callback) {
    if (this.socket) {
      this.socket.on('user_joined', callback);
    }
  }

  onUserLeft(callback) {
    if (this.socket) {
      this.socket.on('user_left', callback);
    }
  }

  onCodeUpdate(callback) {
    if (this.socket) {
      this.socket.on('code_update', callback);
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onPermissionsUpdated(callback) {
    if (this.socket) {
      this.socket.on('permissions_updated', callback);
    }
  }

  emitCodeChange(roomId, code, language) {
    if (this.socket) {
      this.socket.emit('code_change', { roomId, code, language });
    }
  }

  emitChatMessage(roomId, message, username) {
    if (this.socket) {
      this.socket.emit('chat_message', { roomId, message, username });
    }
  }

  emitPermissionUpdate(roomId, permissions, type, username) {
    if (this.socket) {
      this.socket.emit('permission_update', { roomId, permissions, type, username });
    }
  }

  emitExecuteCode(roomId, code, language) {
    if (this.socket) {
      this.socket.emit('execute_code', { roomId, code, language });
    }
  }

  emitEndSession(roomId) {
    if (this.socket) {
      this.socket.emit('end_session', { roomId });
    }
  }

  onSessionEnded(callback) {
    if (this.socket) {
      this.socket.on('session_ended', callback);
    }
  }

  onCodeExecutionResult(callback) {
    if (this.socket) {
      this.socket.on('code_execution_result', callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new SocketService(); 