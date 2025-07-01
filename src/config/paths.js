const path = require('path');
const os = require('os');

const homeDir = os.homedir();

const APP_CONFIG = {
  directories: {
    claude: path.join(homeDir, '.claude'),
    claudeCache: path.join(homeDir, 'Library', 'Caches', 'claude-cli-nodejs'),
    vscode: path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev')
  },
  cache: {
    duration: 5 * 60 * 1000, // 5分
    maxSize: 100
  }
};

module.exports = { APP_CONFIG };