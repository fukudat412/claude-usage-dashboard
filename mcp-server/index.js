const { Server } = require('@anthropic/mcp');
const io = require('socket.io-client');

class SessionMCPServer {
  constructor() {
    this.server = new Server({
      name: 'claude-session',
      version: '1.0.0',
      description: 'MCP server for managing Claude sessions'
    });

    this.socket = null;
    this.sessionId = null;
    this.setupTools();
  }

  connectToWebSocket(url = 'http://localhost:3001') {
    this.socket = io(url, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      if (this.sessionId) {
        this.socket.emit('register-session', {
          sessionId: this.sessionId,
          type: 'mcp-client',
          metadata: { source: 'mcp-server' }
        });
      }
    });

    this.socket.on('new-subsession', (data) => {
      console.log('New subsession request:', data);
    });

    this.socket.on('subsession-update', (data) => {
      console.log('Subsession update:', data);
    });
  }

  setupTools() {
    this.server.addTool({
      name: 'create_subsession',
      description: 'Create a new subsession for a specific task',
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'The task description for the subsession'
          },
          parameters: {
            type: 'object',
            description: 'Additional parameters for the subsession'
          }
        },
        required: ['task']
      },
      handler: async (input) => {
        if (!this.socket || !this.socket.connected) {
          throw new Error('Not connected to WebSocket server');
        }

        return new Promise((resolve, reject) => {
          this.socket.emit('subsession-request', {
            parentSessionId: this.sessionId,
            task: input.task,
            parameters: input.parameters || {}
          });

          this.socket.once('subsession-created', (data) => {
            resolve({
              subsessionId: data.subsessionId,
              status: 'created',
              message: `Subsession created for task: ${input.task}`
            });
          });

          setTimeout(() => {
            reject(new Error('Subsession creation timeout'));
          }, 5000);
        });
      }
    });

    this.server.addTool({
      name: 'update_session_status',
      description: 'Update the status of the current session',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'paused', 'completed', 'failed'],
            description: 'The new status for the session'
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata to update'
          }
        },
        required: ['status']
      },
      handler: async (input) => {
        if (!this.socket || !this.socket.connected) {
          throw new Error('Not connected to WebSocket server');
        }

        this.socket.emit('update-session-status', {
          sessionId: this.sessionId,
          status: input.status,
          metadata: input.metadata
        });

        return {
          success: true,
          message: `Session status updated to: ${input.status}`
        };
      }
    });

    this.server.addTool({
      name: 'respond_to_subsession',
      description: 'Respond to a subsession request',
      inputSchema: {
        type: 'object',
        properties: {
          subsessionId: {
            type: 'string',
            description: 'The ID of the subsession to respond to'
          },
          response: {
            type: 'object',
            description: 'The response data'
          },
          status: {
            type: 'string',
            enum: ['completed', 'failed', 'in_progress'],
            description: 'The status of the subsession'
          }
        },
        required: ['subsessionId', 'response', 'status']
      },
      handler: async (input) => {
        if (!this.socket || !this.socket.connected) {
          throw new Error('Not connected to WebSocket server');
        }

        this.socket.emit('subsession-response', {
          subsessionId: input.subsessionId,
          response: input.response,
          status: input.status
        });

        return {
          success: true,
          message: `Response sent for subsession: ${input.subsessionId}`
        };
      }
    });

    this.server.addTool({
      name: 'initialize_session',
      description: 'Initialize a new session with the dashboard',
      inputSchema: {
        type: 'object',
        properties: {
          dashboardUrl: {
            type: 'string',
            description: 'The URL of the dashboard (default: http://localhost:3001)'
          }
        }
      },
      handler: async (input) => {
        const url = input.dashboardUrl || 'http://localhost:3001';
        this.sessionId = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.connectToWebSocket(url);

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              sessionId: this.sessionId,
              connected: this.socket && this.socket.connected,
              message: 'Session initialized'
            });
          }, 1000);
        });
      }
    });
  }

  async start() {
    await this.server.start();
    console.log('MCP Server started');
  }
}

const mcpServer = new SessionMCPServer();
mcpServer.start().catch(console.error);