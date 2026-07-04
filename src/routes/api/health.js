const express = require('express');
const router = express.Router();
const { version } = require('../../../package.json');

// ヘルスチェック（Docker HEALTHCHECK から利用）
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version,
  });
});

module.exports = router;
