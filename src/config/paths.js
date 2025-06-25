const os = require('os');
const path = require('path');

/**
 * Claude Codeのデータパス設定
 */
const CLAUDE_PATHS = {
  mcpLogs: path.join(os.homedir(), 'Library/Caches/claude-cli-nodejs/*/mcp-logs-ide'),
  todos: path.join(os.homedir(), '.claude/todos'),
  vsCodeLogs: path.join(os.homedir(), 'Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks'),
  projects: path.join(os.homedir(), '.claude/projects')
};

/**
 * セキュリティのため許可されたディレクトリ
 */
const ALLOWED_PATHS = [
  path.join(os.homedir(), 'Library/Caches/claude-cli-nodejs'),
  path.join(os.homedir(), '.claude/todos')
];

/**
 * アプリケーション設定
 */
const APP_CONFIG = {
  port: process.env.PORT || 3001,
  cacheTimeout: 5 * 60 * 1000, // 5分間キャッシュ
  maxFileSize: 10 * 1024 * 1024, // 10MB
  logLevel: process.env.LOG_LEVEL || 'info'
};

module.exports = {
  CLAUDE_PATHS,
  ALLOWED_PATHS,
  APP_CONFIG
};