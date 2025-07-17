const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { getVsCodeLogsData, checkVsCodeExtensionAvailable } = require('../../services/vscodeService');

/**
 * VS Code拡張機能の利用可能性をチェック
 */
router.get('/available', asyncHandler(async (req, res) => {
  const isAvailable = await checkVsCodeExtensionAvailable();
  res.json({
    success: true,
    data: {
      available: isAvailable
    }
  });
}));

/**
 * VS Code拡張ログデータを取得
 */
router.get('/logs', asyncHandler(async (req, res) => {
  const isAvailable = await checkVsCodeExtensionAvailable();
  
  if (!isAvailable) {
    return res.json({
      success: true,
      data: [],
      message: 'VS Code extension is not available'
    });
  }
  
  const logs = await getVsCodeLogsData();
  res.json({
    success: true,
    data: logs
  });
}));

module.exports = router;