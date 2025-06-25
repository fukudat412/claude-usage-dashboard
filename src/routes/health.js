const express = require('express');
const router = express.Router();

/**
 * ヘルスチェックエンドポイント
 */
router.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../../package.json').version,
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;