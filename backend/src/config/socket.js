import { Server } from 'socket.io';
import fetch from 'node-fetch';

const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

async function executeCode(language, code) {
  try {
    const response = await fetch(PISTON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: language,
        version: '*',
        files: [{
          content: code
        }]
      }),
    });

    const result = await response.json();
    
    if (result.run) {
      return {
        output: result.run.output || result.run.stderr || 'No output',
        error: result.run.stderr ? true : false,
      };
    } else {
      return {
        output: 'Error: Invalid response from execution service',
        error: true,
      };
    }
  } catch (error) {
    console.error('Code execution error:', error);
    return {
      output: 'Error executing code: ' + error.message,
      error: true,
    };
  }
}

const configureSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  const rooms = new Map();

  io.on('connection', (socket) => {
    // Join room
    socket.on('join_room', ({ roomId, username, isHost }) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: [],
          code: '# Your code here',
          language: 'python',
          globalPermissions: {
            canEdit: true,
            canChat: true,
            canRun: true
          },
          userPermissions: {}
        });
      }

      const room = rooms.get(roomId);
      room.users.push({ username, isHost, socketId: socket.id });

      // Send current room state to the joining user
      socket.emit('room_state', {
        code: room.code,
        language: room.language,
        users: room.users,
        globalPermissions: room.globalPermissions,
        userPermissions: room.userPermissions
      });

      // Notify others about new user
      io.to(roomId).emit('user_joined', { users: room.users });
    });

    // Code change
    socket.on('code_change', ({ roomId, code, language }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.code = code;
        room.language = language;
        socket.to(roomId).emit('code_update', { code, language });
      }
    });

    // Chat message
    socket.on('chat_message', ({ roomId, message, username }) => {
      io.to(roomId).emit('new_message', { message, username });
    });

    // End session
    socket.on('end_session', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        // Check if the user is the host
        const user = room.users.find(u => u.socketId === socket.id);
        if (user && user.isHost) {
          // Notify all users in the room that the session has ended
          io.to(roomId).emit('session_ended');
          // Delete the room
          rooms.delete(roomId);
        }
      }
    });

    // Permission updates
    socket.on('permission_update', ({ roomId, permissions, type, username }) => {
      const room = rooms.get(roomId);
      if (room) {
        if (type === 'global') {
          room.globalPermissions = permissions;
        } else {
          room.userPermissions = {
            ...room.userPermissions,
            [username]: permissions
          };
        }
        // Broadcast permission update to all users in the room
        io.to(roomId).emit('permissions_updated', { permissions, type, username });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      for (const [roomId, room] of rooms.entries()) {
        const userIndex = room.users.findIndex(u => u.socketId === socket.id);
        if (userIndex !== -1) {
          room.users.splice(userIndex, 1);
          io.to(roomId).emit('user_left', { users: room.users });
          
          // Clean up empty rooms
          if (room.users.length === 0) {
            rooms.delete(roomId);
          }
          break;
        }
      }
    });

    // Add this new socket event handler
    socket.on('execute_code', async ({ roomId, code, language }) => {
      try {
        // Map editor language to Piston API language
        const languageMap = {
          javascript: 'nodejs',
          python: 'python3',
          java: 'java',
          cpp: 'cpp',
        };

        const pistonLanguage = languageMap[language] || language;
        console.log('Executing code:', { language: pistonLanguage, code });
        
        const result = await executeCode(pistonLanguage, code);
        console.log('Execution result:', result);
        
        // Ensure we're sending a valid result
        io.to(roomId).emit('code_execution_result', {
          output: result.output || 'No output',
          error: !!result.error
        });
      } catch (error) {
        console.error('Socket execution error:', error);
        socket.emit('code_execution_result', {
          output: 'Error executing code: ' + error.message,
          error: true,
        });
      }
    });
  });

  return io;
};

export default configureSocket; 