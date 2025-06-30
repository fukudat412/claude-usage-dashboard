const socketIO = require('socket.io');

class SocketService {
  constructor() {
    this.io = null;
    this.sessions = new Map();
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      socket.on('register-session', (data) => {
        const { sessionId, type, metadata } = data;
        this.sessions.set(sessionId, {
          socketId: socket.id,
          type,
          metadata,
          status: 'active',
          createdAt: new Date(),
          lastActivity: new Date()
        });
        
        socket.join(`session-${sessionId}`);
        socket.emit('session-registered', { sessionId, status: 'active' });
        
        this.broadcastSessionUpdate();
      });

      socket.on('subsession-request', (data) => {
        const { parentSessionId, task, parameters } = data;
        const subsessionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.sessions.set(subsessionId, {
          socketId: socket.id,
          type: 'subsession',
          parentSessionId,
          task,
          parameters,
          status: 'pending',
          createdAt: new Date(),
          lastActivity: new Date()
        });

        this.io.emit('new-subsession', {
          subsessionId,
          parentSessionId,
          task,
          parameters
        });

        socket.emit('subsession-created', { subsessionId });
        this.broadcastSessionUpdate();
      });

      socket.on('subsession-response', (data) => {
        const { subsessionId, response, status } = data;
        const session = this.sessions.get(subsessionId);
        
        if (session) {
          session.status = status;
          session.response = response;
          session.lastActivity = new Date();
          
          this.io.to(`session-${session.parentSessionId}`).emit('subsession-update', {
            subsessionId,
            response,
            status
          });
          
          this.broadcastSessionUpdate();
        }
      });

      socket.on('update-session-status', (data) => {
        const { sessionId, status, metadata } = data;
        const session = this.sessions.get(sessionId);
        
        if (session) {
          session.status = status;
          if (metadata) {
            session.metadata = { ...session.metadata, ...metadata };
          }
          session.lastActivity = new Date();
          
          this.broadcastSessionUpdate();
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        for (const [sessionId, session] of this.sessions.entries()) {
          if (session.socketId === socket.id) {
            session.status = 'disconnected';
          }
        }
        
        this.broadcastSessionUpdate();
      });
    });
  }

  broadcastSessionUpdate() {
    const sessionData = Array.from(this.sessions.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
    
    this.io.emit('sessions-update', sessionData);
  }

  getActiveSessions() {
    return Array.from(this.sessions.entries())
      .filter(([_, session]) => session.status === 'active')
      .map(([id, data]) => ({ id, ...data }));
  }
}

module.exports = new SocketService();