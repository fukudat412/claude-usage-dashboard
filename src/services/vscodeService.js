const fs = require('fs-extra');
const path = require('path');
const { CLAUDE_PATHS } = require('../config/paths');
const { AppError } = require('../middleware/errorHandler');

/**
 * VS Code拡張ログデータを取得
 */
async function getVsCodeLogsData() {
  try {
    if (!(await fs.pathExists(CLAUDE_PATHS.vsCodeLogs))) {
      return [];
    }

    const taskDirs = await fs.readdir(CLAUDE_PATHS.vsCodeLogs);
    const logs = [];

    for (const taskDir of taskDirs) {
      const taskPath = path.join(CLAUDE_PATHS.vsCodeLogs, taskDir);
      const stats = await fs.stat(taskPath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(taskPath);
        let messageCount = 0;
        let conversationCount = 0;

        for (const file of files) {
          if (file.includes('ui_messages.json')) {
            const content = await fs.readFile(path.join(taskPath, file), 'utf8');
            try {
              const messages = JSON.parse(content);
              messageCount = Array.isArray(messages) ? messages.length : 0;
            } catch (e) {
              console.warn(`Failed to parse ${file}:`, e.message);
            }
          }
          if (file.includes('api_conversation_history.json')) {
            const content = await fs.readFile(path.join(taskPath, file), 'utf8');
            try {
              const conversations = JSON.parse(content);
              conversationCount = Array.isArray(conversations) ? conversations.length : 0;
            } catch (e) {
              console.warn(`Failed to parse ${file}:`, e.message);
            }
          }
        }

        logs.push({
          taskId: taskDir,
          timestamp: stats.mtime,
          messageCount,
          conversationCount
        });
      }
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Error reading VS Code logs:', error);
    throw new AppError('Failed to read VS Code logs', 500, 'VSCODE_READ_ERROR');
  }
}

module.exports = {
  getVsCodeLogsData
};