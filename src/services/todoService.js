const fs = require('fs-extra');
const path = require('path');
const { CLAUDE_PATHS } = require('../config/paths');
const { AppError } = require('../middleware/errorHandler');

/**
 * Todoデータを取得
 */
async function getTodosData() {
  try {
    if (!(await fs.pathExists(CLAUDE_PATHS.todos))) {
      return [];
    }

    const files = await fs.readdir(CLAUDE_PATHS.todos);
    const todos = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(CLAUDE_PATHS.todos, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf8');
        
        try {
          const todoData = JSON.parse(content);
          todos.push({
            file,
            filePath,
            timestamp: stats.mtime,
            size: stats.size,
            taskCount: Array.isArray(todoData) ? todoData.length : 0
          });
        } catch (e) {
          todos.push({
            file,
            filePath,
            timestamp: stats.mtime,
            size: stats.size,
            taskCount: 0,
            error: 'Parse error'
          });
        }
      }
    }

    return todos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Error reading todos:', error);
    throw new AppError('Failed to read todos', 500, 'TODO_READ_ERROR');
  }
}

module.exports = {
  getTodosData
};