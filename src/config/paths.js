const path = require('path');
const os = require('os');

const homeDir = os.homedir();

const APP_CONFIG = {
  directories: {
    claude: path.join(homeDir, '.claude'),
    claudeCache: path.join(homeDir, 'Library', 'Caches', 'claude-cli-nodejs'),
    vscode: path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
    projects: path.join(homeDir, '.claude', 'projects'),
    todos: path.join(homeDir, '.claude', 'todos')
  },
  cache: {
    duration: 5 * 60 * 1000, // 5分
    maxSize: 100
  }
};

// Legacy compatibility - some services expect CLAUDE_PATHS
const CLAUDE_PATHS = {
  base: APP_CONFIG.directories.claude,
  projects: APP_CONFIG.directories.projects,
  todos: APP_CONFIG.directories.todos,
  cache: APP_CONFIG.directories.claudeCache,
  vscode: APP_CONFIG.directories.vscode,
  vsCodeLogs: APP_CONFIG.directories.vscode // vscodeService expects vsCodeLogs
};

module.exports = { APP_CONFIG, CLAUDE_PATHS };