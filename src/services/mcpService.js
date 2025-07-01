const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const { APP_CONFIG } = require('../config/paths');
const cacheService = require('./cacheService');

const CACHE_KEY = 'mcp-logs';
const LOG_PATTERN = '**/mcp-logs-ide/*.jsonl';

async function parseMCPLogs() {
  const cached = await cacheService.get(CACHE_KEY);
  if (cached) return cached;

  const logs = [];
  const toolUsageStats = {
    totalCalls: 0,
    uniqueTools: new Set(),
    tools: new Map(),
    sessions: []
  };

  try {
    const files = await glob(LOG_PATTERN, { 
      cwd: APP_CONFIG.directories.claudeCache,
      absolute: true 
    });
    
    for (const file of files) {
      try {
        const stat = await fs.stat(file);
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.trim().split('\n');
        
        const sessionTools = {};
        let sessionStartTime = null;
        let sessionEndTime = null;
        let cwd = null;
        
        lines.forEach(line => {
          try {
            const entry = JSON.parse(line);
            
            if (entry.timestamp) {
              if (!sessionStartTime) sessionStartTime = entry.timestamp;
              sessionEndTime = entry.timestamp;
            }
            
            if (entry.method === 'tools/call' && entry.params?.name) {
              const toolName = entry.params.name;
              toolUsageStats.totalCalls++;
              toolUsageStats.uniqueTools.add(toolName);
              
              sessionTools[toolName] = (sessionTools[toolName] || 0) + 1;
              
              if (!toolUsageStats.tools.has(toolName)) {
                toolUsageStats.tools.set(toolName, {
                  name: toolName,
                  count: 0,
                  sessionCount: 0,
                  firstUsed: entry.timestamp,
                  lastUsed: entry.timestamp
                });
              }
              
              const toolStat = toolUsageStats.tools.get(toolName);
              toolStat.count++;
              toolStat.lastUsed = entry.timestamp;
            }
            
            if (entry.params?.cwd) {
              cwd = entry.params.cwd;
            }
          } catch (e) {
            // 無効な行をスキップ
          }
        });
        
        const sessionId = path.basename(path.dirname(file));
        
        logs.push({
          file: path.basename(file),
          filePath: file,
          timestamp: stat.mtime,
          size: stat.size,
          entries: lines.length,
          sessionId
        });
        
        if (Object.keys(sessionTools).length > 0) {
          toolUsageStats.sessions.push({
            sessionId,
            tools: sessionTools,
            startTime: sessionStartTime,
            endTime: sessionEndTime,
            cwd: cwd || 'Unknown',
            file: path.basename(file)
          });
          
          Object.keys(sessionTools).forEach(toolName => {
            const toolStat = toolUsageStats.tools.get(toolName);
            if (toolStat) {
              toolStat.sessionCount++;
            }
          });
        }
      } catch (error) {
        console.error(`Error processing MCP log ${file}:`, error);
        logs.push({
          file: path.basename(file),
          filePath: file,
          timestamp: new Date(),
          size: 0,
          entries: 0,
          error: error.message
        });
      }
    }
    
    const toolsArray = Array.from(toolUsageStats.tools.values())
      .sort((a, b) => b.count - a.count);
    
    const result = {
      logs: logs.sort((a, b) => b.timestamp - a.timestamp),
      toolUsage: {
        totalCalls: toolUsageStats.totalCalls,
        uniqueTools: toolUsageStats.uniqueTools.size,
        tools: toolsArray,
        sessions: toolUsageStats.sessions.sort((a, b) => 
          new Date(b.startTime) - new Date(a.startTime)
        )
      }
    };

    await cacheService.set(CACHE_KEY, result);
    return result;
  } catch (error) {
    console.error('Error reading MCP logs:', error);
    return { logs: [], toolUsage: null };
  }
}

async function readMCPLogContent(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return line;
      }
    });
  } catch (error) {
    console.error('Error reading MCP log content:', error);
    throw error;
  }
}

module.exports = {
  parseMCPLogs,
  readMCPLogContent
};