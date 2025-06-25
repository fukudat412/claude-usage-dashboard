const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { CLAUDE_PATHS } = require('../config/paths');
const { AppError } = require('../middleware/errorHandler');

/**
 * MCPログデータを取得
 */
async function getMcpLogsData() {
  try {
    const logDirs = glob.sync(CLAUDE_PATHS.mcpLogs);
    const logs = [];

    for (const dir of logDirs) {
      if (await fs.pathExists(dir)) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf8');
          
          try {
            const logData = JSON.parse(`[${content}]`);
            logs.push({
              file,
              filePath,
              timestamp: stats.mtime,
              size: stats.size,
              entries: logData.length,
              sessionId: logData[0]?.sessionId
            });
          } catch (e) {
            logs.push({
              file,
              filePath,
              timestamp: stats.mtime,
              size: stats.size,
              entries: 0,
              error: 'Parse error'
            });
          }
        }
      }
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Error reading MCP logs:', error);
    throw new AppError('Failed to read MCP logs', 500, 'MCP_READ_ERROR');
  }
}

module.exports = {
  getMcpLogsData
};