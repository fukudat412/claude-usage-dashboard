const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const { APP_CONFIG } = require('../config/paths');
const cacheService = require('./cacheService');

const CACHE_KEY = 'mcp-logs';
const LOG_PATTERN = '**/mcp-logs-ide/*.txt';

async function parseMCPLogs() {
  const cached = cacheService.getCache(CACHE_KEY);
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
        
        // Parse the JSON array format
        let entries;
        try {
          entries = JSON.parse(content);
          if (!Array.isArray(entries)) {
            // Fallback to line-by-line parsing if not an array
            const lines = content.trim().split('\n');
            entries = lines.map(line => {
              try {
                return JSON.parse(line);
              } catch (e) {
                return null;
              }
            }).filter(Boolean);
          }
        } catch (e) {
          // If parsing as JSON fails, try line-by-line
          const lines = content.trim().split('\n');
          entries = lines.map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              return null;
            }
          }).filter(Boolean);
        }
        
        const sessionTools = {};
        let sessionStartTime = null;
        let sessionEndTime = null;
        let cwd = null;
        
        entries.forEach(entry => {
          try {
            
            if (entry.timestamp) {
              if (!sessionStartTime) sessionStartTime = entry.timestamp;
              sessionEndTime = entry.timestamp;
            }
            
            // Check for tool calls in different formats
            let toolName = null;
            
            // Format 1: method === 'tools/call' with params.name
            if (entry.method === 'tools/call' && entry.params?.name) {
              toolName = entry.params.name;
            }
            // Format 2: debug field contains "Calling MCP tool: <name>"
            else if (entry.debug && entry.debug.startsWith('Calling MCP tool:')) {
              const match = entry.debug.match(/Calling MCP tool:\s*(.+)/);
              if (match) {
                toolName = match[1].trim();
              }
            }
            
            if (toolName) {
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
        
        // Extract project name from the file path
        // Path format: .../claude-cli-nodejs/{project}/mcp-logs-ide/{timestamp}.txt
        const pathParts = file.split(path.sep);
        const mcpLogsIndex = pathParts.indexOf('mcp-logs-ide');
        const projectName = mcpLogsIndex > 0 ? pathParts[mcpLogsIndex - 1] : 'Unknown';
        const sessionId = path.basename(file, '.txt');
        
        logs.push({
          file: path.basename(file),
          filePath: file,
          timestamp: stat.mtime,
          size: stat.size,
          entries: entries.length,
          sessionId
        });
        
        if (Object.keys(sessionTools).length > 0) {
          toolUsageStats.sessions.push({
            sessionId,
            projectName,
            tools: sessionTools,
            startTime: sessionStartTime,
            endTime: sessionEndTime,
            cwd: cwd || projectName || 'Unknown',
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

    cacheService.setCache(CACHE_KEY, result);
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

// Legacy compatibility functions
async function getMcpLogsData() {
  const result = await parseMCPLogs();
  return result.logs || [];
}

async function getMcpToolUsageStats() {
  const result = await parseMCPLogs();
  return result.toolUsage || {
    totalCalls: 0,
    uniqueTools: 0,
    tools: [],
    sessions: []
  };
}

module.exports = {
  parseMCPLogs,
  readMCPLogContent,
  getMcpLogsData,
  getMcpToolUsageStats
};