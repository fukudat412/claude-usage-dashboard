const express = require('express');
const path = require('path');
const http = require('http');
const { APP_CONFIG } = require('./src/config/paths');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { configureSecurityMiddleware } = require('./src/middleware/security');
const socketService = require('./src/services/socketService');

// ルートインポート
const usageRoutes = require('./src/routes/usage');
const logsRoutes = require('./src/routes/logs');
const healthRoutes = require('./src/routes/health');
const sessionsRoutes = require('./src/routes/sessions');

// 新しい分割されたAPIルート
const summaryRoutes = require('./src/routes/api/summary');
const dailyRoutes = require('./src/routes/api/daily');
const monthlyRoutes = require('./src/routes/api/monthly');
const mcpRoutes = require('./src/routes/api/mcp');
const projectsRoutes = require('./src/routes/api/projects');

const app = express();
const server = http.createServer(app);
const PORT = APP_CONFIG.port;

// WebSocketサービスの初期化
socketService.initialize(server);

// セキュリティミドルウェア設定
configureSecurityMiddleware(app);

// 基本ミドルウェア設定
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('build'));

// ヘルスチェックエンドポイント（Docker用）
app.use('/api/health', healthRoutes);

// APIルート（レガシー）
app.use('/api/usage', usageRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/sessions', sessionsRoutes);

// 新しい分割されたAPIルート（v2）
app.use('/api/v2/summary', summaryRoutes);
app.use('/api/v2/daily', dailyRoutes);
app.use('/api/v2/monthly', monthlyRoutes);
app.use('/api/v2/mcp', mcpRoutes);
app.use('/api/v2/projects', projectsRoutes);

// React アプリをサーブ
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// エラーハンドリングミドルウェア
app.use(notFound);
app.use(errorHandler);

// サーバー起動
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Log level: ${APP_CONFIG.logLevel}`);
  console.log(`Access dashboard at http://localhost:${PORT}`);
  console.log(`WebSocket server is running`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});