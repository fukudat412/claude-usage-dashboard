const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { APP_CONFIG } = require('./src/config/paths');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { configureSecurityMiddleware } = require('./src/middleware/security');

// v1ルートを削除済み（v2に移行）

// API v2ルート
const apiSummaryRoutes = require('./src/routes/api/summary');
const apiDailyRoutes = require('./src/routes/api/daily');
const apiMonthlyRoutes = require('./src/routes/api/monthly');
const apiHourlyRoutes = require('./src/routes/api/hourly');
const apiMcpRoutes = require('./src/routes/api/mcp');
const apiProjectsRoutes = require('./src/routes/api/projects');
const apiLogsRoutes = require('./src/routes/api/logs');
const apiModelsRoutes = require('./src/routes/api/models');

const app = express();
const PORT = process.env.PORT || 3001;

// セキュリティミドルウェアの設定
configureSecurityMiddleware(app);

// JSON パース
app.use(express.json());

// 静的ファイルの提供（Reactビルド）
app.use(express.static(path.join(__dirname, 'build')));

// v1 APIルートは削除済み（v2に移行）

// Rustバックエンドへのプロキシ（環境変数USE_RUST_BACKENDで制御）
const USE_RUST_BACKEND = process.env.USE_RUST_BACKEND === 'true';
const RUST_BACKEND_URL = process.env.RUST_BACKEND_URL || 'http://localhost:8080';

// プロキシ設定を作成するヘルパー関数
function createRustProxy(pathRewrite) {
  return createProxyMiddleware({
    target: RUST_BACKEND_URL,
    changeOrigin: true,
    pathRewrite,
    onError: (err, req, res) => {
      console.error('[Proxy] Error:', err.message);
      res.status(500).json({ error: 'Proxy error', message: err.message });
    },
  });
}

if (USE_RUST_BACKEND) {
  console.log(`[Proxy] Routing API endpoints to Rust backend at ${RUST_BACKEND_URL}`);

  // Rustバックエンドで実装済みのエンドポイント
  app.use('/api/v2/daily', createRustProxy({ '^/': '/api/v2/daily' }));
  app.use('/api/v2/monthly', createRustProxy({ '^/': '/api/v2/monthly' }));
  app.use('/api/v2/models', createRustProxy({ '^/': '/api/v2/models' }));
  app.use('/api/v2/projects', createRustProxy({ '^/': '/api/v2/projects' }));

  // まだNode.js実装のエンドポイント
  app.use('/api/v2/summary', apiSummaryRoutes);
  app.use('/api/v2/hourly', apiHourlyRoutes);
  app.use('/api/v2/mcp', apiMcpRoutes);
  app.use('/api/v2/logs', apiLogsRoutes);
} else {
  console.log('[Proxy] Using Node.js implementation for all endpoints');

  // API v2ルート（Node.js実装）
  app.use('/api/v2/summary', apiSummaryRoutes);
  app.use('/api/v2/daily', apiDailyRoutes);
  app.use('/api/v2/monthly', apiMonthlyRoutes);
  app.use('/api/v2/hourly', apiHourlyRoutes);
  app.use('/api/v2/mcp', apiMcpRoutes);
  app.use('/api/v2/projects', apiProjectsRoutes);
  app.use('/api/v2/logs', apiLogsRoutes);
  app.use('/api/v2/models', apiModelsRoutes);
}

// SPAのためのフォールバック
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 404ハンドラー
app.use(notFound);

// エラーハンドリング
app.use(errorHandler);

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Log level: ${process.env.LOG_LEVEL || 'info'}`);
  console.log(`Access dashboard at http://localhost:${PORT}`);
});