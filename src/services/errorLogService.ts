import { ErrorLog, ErrorStats, ErrorFilter } from '../types';

export interface ErrorLogService {
  getErrorLogs(filter?: ErrorFilter): Promise<ErrorLog[]>;
  getErrorById(id: string): Promise<ErrorLog | null>;
  getErrorStats(filter?: ErrorFilter): Promise<ErrorStats>;
  getSimilarErrors(errorId: string): Promise<ErrorLog[]>;
}

// Mock implementation for development
export class MockErrorLogService implements ErrorLogService {
  private mockErrors: ErrorLog[] = [
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

  async getErrorLogs(filter?: ErrorFilter): Promise<ErrorLog[]> {
    let filtered = [...this.mockErrors];

    if (filter) {
      // Filter by date range
      if (filter.startDate) {
        filtered = filtered.filter(e => e.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filtered = filtered.filter(e => e.timestamp <= filter.endDate!);
      }

      // Filter by levels
      if (filter.levels && filter.levels.length > 0) {
        filtered = filtered.filter(e => filter.levels!.includes(e.level));
      }

      // Filter by sources
      if (filter.sources && filter.sources.length > 0) {
        filtered = filtered.filter(e => e.source && filter.sources!.includes(e.source));
      }

      // Filter by error codes
      if (filter.errorCodes && filter.errorCodes.length > 0) {
        filtered = filtered.filter(e => e.code && filter.errorCodes!.includes(e.code));
      }

      // Filter by search text
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filtered = filtered.filter(e => 
          e.message.toLowerCase().includes(searchLower) ||
          (e.code && e.code.toLowerCase().includes(searchLower)) ||
          (e.source && e.source.toLowerCase().includes(searchLower))
        );
      }

      // Filter by resolved status
      if (filter.resolved !== undefined) {
        filtered = filtered.filter(e => e.resolved === filter.resolved);
      }

      // Apply pagination
      const offset = filter.offset || 0;
      const limit = filter.limit || 50;
      filtered = filtered.slice(offset, offset + limit);
    }

    return filtered;
  }

  async getErrorById(id: string): Promise<ErrorLog | null> {
    return this.mockErrors.find(e => e.id === id) || null;
  }

  async getErrorStats(filter?: ErrorFilter): Promise<ErrorStats> {
    const errors = await this.getErrorLogs(filter);

    // Calculate stats
    const errorsByLevel: Record<string, number> = {};
    const errorsBySource: Record<string, number> = {};
    const errorsByCode: Record<string, number> = {};
    const errorCountByCode: Record<string, { message: string; count: number }> = {};

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

    // Calculate errors by time (hourly for mock data)
    const errorsByTime = this.generateTimeSeriesData(errors);

    // Get top errors
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
  }

  async getSimilarErrors(errorId: string): Promise<ErrorLog[]> {
    const targetError = await this.getErrorById(errorId);
    if (!targetError) return [];

    // Find errors with same code or similar message
    return this.mockErrors.filter(error => 
      error.id !== errorId && 
      (
        (error.code && error.code === targetError.code) ||
        (error.message && this.isSimilarMessage(error.message, targetError.message))
      )
    ).slice(0, 5);
  }

  private generateTimeSeriesData(errors: ErrorLog[]) {
    const hourlyData: Record<string, number> = {};
    
    errors.forEach(error => {
      const hour = new Date(error.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      hourlyData[key] = (hourlyData[key] || 0) + 1;
    });

    return Object.entries(hourlyData)
      .map(([timestamp, count]) => ({
        timestamp: new Date(timestamp),
        count
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private isSimilarMessage(msg1: string, msg2: string): boolean {
    // Simple similarity check - in real implementation, use better algorithm
    const words1 = msg1.toLowerCase().split(/\s+/);
    const words2 = msg2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    return commonWords.length >= Math.min(words1.length, words2.length) * 0.5;
  }
}

// Export singleton instance
export const errorLogService = new MockErrorLogService();