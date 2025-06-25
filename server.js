const express = require('express');
const cors = require('cors');
const path = require('path');
const { APP_CONFIG } = require('./src/config/paths');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

// ルートインポート
const usageRoutes = require('./src/routes/usage');
const logsRoutes = require('./src/routes/logs');
const healthRoutes = require('./src/routes/health');

const app = express();
const PORT = APP_CONFIG.port;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.static('build'));

// ヘルスチェックエンドポイント（Docker用）
app.use('/api/health', healthRoutes);

// APIルート
app.use('/api/usage', usageRoutes);
app.use('/api/logs', logsRoutes);

// React アプリをサーブ
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// エラーハンドリングミドルウェア
app.use(notFound);
app.use(errorHandler);

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Log level: ${APP_CONFIG.logLevel}`);
  console.log(`Access dashboard at http://localhost:${PORT}`);
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