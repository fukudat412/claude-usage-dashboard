const express = require('express');
const router = express.Router();
const socketService = require('../services/socketService');

router.get('/active', async (req, res, next) => {
  try {
    const activeSessions = socketService.getActiveSessions();
    res.json({ sessions: activeSessions });
  } catch (error) {
    next(error);
  }
});

router.post('/subsession', async (req, res, next) => {
  try {
    const { parentSessionId, task, parameters } = req.body;
    
    if (!parentSessionId || !task) {
      return res.status(400).json({ 
        error: 'parentSessionId and task are required' 
      });
    }

    const subsessionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    socketService.sessions.set(subsessionId, {
      type: 'subsession',
      parentSessionId,
      task,
      parameters,
      status: 'pending',
      createdAt: new Date(),
      lastActivity: new Date()
    });

    socketService.io.emit('new-subsession', {
      subsessionId,
      parentSessionId,
      task,
      parameters
    });

    res.json({ subsessionId, status: 'created' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;