const express = require('express');
const router = express.Router();

// Mock error log service for demonstration
const mockErrorLogService = {
  async getErrorLogs(filter = {}) {
    const mockErrors = [
      {
        id: '1',
        timestamp: new Date('2025-07-17T10:30:00Z'),
        level: 'ERROR',
        message: 'Database connection failed',
        code: 'E1001',
        source: 'api-server',
        stackTrace: `Error: Database connection failed
  at connectToDatabase (/app/src/services/db.js:45:7)
  at processRequest (/app/src/controllers/api.js:23:12)
  at handleRequest (/app/src/routes/api.js:67:10)`,
        context: {
          userId: 'user-123',
          sessionId: 'sess-456',
          database: 'main-db',
          operation: 'query'
        },
        requestInfo: {
          method: 'GET',
          url: '/api/v2/users/profile',
          headers: {
            'authorization': 'Bearer [redacted]',
            'content-type': 'application/json'
          }
        }
      },
      {
        id: '2',
        timestamp: new Date('2025-07-17T11:15:00Z'),
        level: 'WARNING',
        message: 'Memory usage high',
        code: 'W2001',
        source: 'app-server',
        context: {
          memoryUsed: '1.2GB',
          memoryLimit: '1.5GB',
          percentage: 80
        }
      },
      {
        id: '3',
        timestamp: new Date('2025-07-17T12:00:00Z'),
        level: 'CRITICAL',
        message: 'Authentication service unreachable',
        code: 'C3001',
        source: 'auth-service',
        stackTrace: `Error: ECONNREFUSED - Connection refused
  at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1137:16)`,
        context: {
          service: 'auth-service',
          attempts: 3,
          lastAttempt: '2025-07-17T12:00:00Z'
        }
      },
      {
        id: '4',
        timestamp: new Date('2025-07-17T13:30:00Z'),
        level: 'INFO',
        message: 'Cache cleared successfully',
        source: 'cache-manager',
        context: {
          cacheSize: '500MB',
          itemsCleared: 1234
        }
      },
      {
        id: '5',
        timestamp: new Date('2025-07-17T14:00:00Z'),
        level: 'ERROR',
        message: 'Invalid API key',
        code: 'E4001',
        source: 'api-gateway',
        context: {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0...'
        },
        requestInfo: {
          method: 'POST',
          url: '/api/v2/data',
          headers: {
            'x-api-key': '[invalid]'
          }
        }
      }
    ];

    let filtered = [...mockErrors];

    // Apply filters
    if (filter.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filter.startDate);
    }
    if (filter.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filter.endDate);
    }
    if (filter.levels && filter.levels.length > 0) {
      filtered = filtered.filter(e => filter.levels.includes(e.level));
    }
    if (filter.sources && filter.sources.length > 0) {
      filtered = filtered.filter(e => e.source && filter.sources.includes(e.source));
    }
    if (filter.errorCodes && filter.errorCodes.length > 0) {
      filtered = filtered.filter(e => e.code && filter.errorCodes.includes(e.code));
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.message.toLowerCase().includes(searchLower) ||
        (e.code && e.code.toLowerCase().includes(searchLower)) ||
        (e.source && e.source.toLowerCase().includes(searchLower))
      );
    }

    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    filtered = filtered.slice(offset, offset + limit);

    return filtered;
  },

  async getErrorById(id) {
    const errors = await this.getErrorLogs({});
    return errors.find(e => e.id === id) || null;
  },

  async getErrorStats(filter = {}) {
    const errors = await this.getErrorLogs(filter);
    
    const errorsByLevel = {};
    const errorsBySource = {};
    const errorsByCode = {};
    const errorCountByCode = {};

    errors.forEach(error => {
      // Count by level
      errorsByLevel[error.level] = (errorsByLevel[error.level] || 0) + 1;

      // Count by source
      if (error.source) {
        errorsBySource[error.source] = (errorsBySource[error.source] || 0) + 1;
      }

      // Count by code
      if (error.code) {
        errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
        if (!errorCountByCode[error.code]) {
          errorCountByCode[error.code] = { message: error.message, count: 0 };
        }
        errorCountByCode[error.code].count++;
      }
    });

    // Generate time series data
    const errorsByTime = errors.map(error => ({
      timestamp: error.timestamp,
      count: 1
    }));

    const topErrors = Object.entries(errorCountByCode)
      .map(([code, data]) => ({
        code,
        message: data.message,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors: errors.length,
      errorsByLevel,
      errorsBySource,
      errorsByCode,
      errorsByTime,
      topErrors
    };
  },

  async getSimilarErrors(errorId) {
    const targetError = await this.getErrorById(errorId);
    if (!targetError) return [];

    const allErrors = await this.getErrorLogs({});
    return allErrors.filter(error => 
      error.id !== errorId && 
      (
        (error.code && error.code === targetError.code) ||
        (error.message && error.message.includes(targetError.message.split(' ')[0]))
      )
    ).slice(0, 5);
  }
};

// Use the mock service
const errorLogService = mockErrorLogService;

// GET /api/v2/errors - Get error logs with optional filtering
router.get('/', async (req, res) => {
  try {
    const filter = {};
    
    // Parse query parameters
    if (req.query.startDate) {
      filter.startDate = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.endDate = new Date(req.query.endDate);
    }
    if (req.query.levels) {
      filter.levels = req.query.levels.split(',');
    }
    if (req.query.sources) {
      filter.sources = req.query.sources.split(',');
    }
    if (req.query.errorCodes) {
      filter.errorCodes = req.query.errorCodes.split(',');
    }
    if (req.query.search) {
      filter.search = req.query.search;
    }
    if (req.query.resolved !== undefined) {
      filter.resolved = req.query.resolved === 'true';
    }
    if (req.query.limit) {
      filter.limit = parseInt(req.query.limit, 10);
    }
    if (req.query.offset) {
      filter.offset = parseInt(req.query.offset, 10);
    }

    const errors = await errorLogService.getErrorLogs(filter);
    
    res.json({
      success: true,
      data: errors,
      total: errors.length
    });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error logs',
      message: error.message
    });
  }
});

// GET /api/v2/errors/stats - Get error statistics
router.get('/stats', async (req, res) => {
  try {
    const filter = {};
    
    // Parse query parameters (same as above)
    if (req.query.startDate) {
      filter.startDate = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.endDate = new Date(req.query.endDate);
    }
    if (req.query.levels) {
      filter.levels = req.query.levels.split(',');
    }
    if (req.query.sources) {
      filter.sources = req.query.sources.split(',');
    }
    if (req.query.errorCodes) {
      filter.errorCodes = req.query.errorCodes.split(',');
    }

    const stats = await errorLogService.getErrorStats(filter);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching error stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error statistics',
      message: error.message
    });
  }
});

// GET /api/v2/errors/:id - Get a specific error log
router.get('/:id', async (req, res) => {
  try {
    const error = await errorLogService.getErrorById(req.params.id);
    
    if (!error) {
      return res.status(404).json({
        success: false,
        error: 'Error log not found'
      });
    }
    
    res.json({
      success: true,
      data: error
    });
  } catch (error) {
    console.error('Error fetching error by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error log',
      message: error.message
    });
  }
});

// GET /api/v2/errors/:id/similar - Get similar errors
router.get('/:id/similar', async (req, res) => {
  try {
    const similarErrors = await errorLogService.getSimilarErrors(req.params.id);
    
    res.json({
      success: true,
      data: similarErrors
    });
  } catch (error) {
    console.error('Error fetching similar errors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch similar errors',
      message: error.message
    });
  }
});

// POST /api/v2/errors/:id/resolve - Mark an error as resolved
router.post('/:id/resolve', async (req, res) => {
  try {
    // In a real implementation, this would update the error in the database
    const { notes, resolvedBy } = req.body;
    
    res.json({
      success: true,
      message: 'Error marked as resolved'
    });
  } catch (error) {
    console.error('Error resolving error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve error',
      message: error.message
    });
  }
});

// Notification settings endpoints (placeholder for now)
router.get('/notifications', async (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

router.post('/notifications', async (req, res) => {
  res.json({
    success: true,
    message: 'Notification rule created'
  });
});

router.put('/notifications/:id', async (req, res) => {
  res.json({
    success: true,
    message: 'Notification rule updated'
  });
});

router.delete('/notifications/:id', async (req, res) => {
  res.json({
    success: true,
    message: 'Notification rule deleted'
  });
});

module.exports = router;