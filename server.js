const express = require('express');
const path = require('path');
const { APP_CONFIG } = require('./src/config/paths');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { configureSecurityMiddleware } = require('./src/middleware/security');

// v1ルートを削除済み（v2に移行）

// API v2ルート
const apiSummaryRoutes = require('./src/routes/api/summary');
const apiDailyRoutes = require('./src/routes/api/daily');
const apiMonthlyRoutes = require('./src/routes/api/monthly');
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

// API v2ルート
app.use('/api/v2/summary', apiSummaryRoutes);
app.use('/api/v2/daily', apiDailyRoutes);
app.use('/api/v2/monthly', apiMonthlyRoutes);
app.use('/api/v2/mcp', apiMcpRoutes);
app.use('/api/v2/projects', apiProjectsRoutes);
app.use('/api/v2/logs', apiLogsRoutes);
app.use('/api/v2/models', apiModelsRoutes);

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