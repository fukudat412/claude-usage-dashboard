const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { processProjectData } = require('../../services/projectService');
const cacheService = require('../../services/cacheService');

/**
 * モデル別使用量統計を取得
 */
router.get('/', asyncHandler(async (req, res) => {
  console.log('Fetching model usage data...');
  
  // クエリパラメータ
  const sortBy = req.query.sortBy || 'totalTokens'; // totalTokens, cost, messages, sessions
  const sortOrder = req.query.sortOrder || 'desc';
  
  // バリデーション
  const validSortFields = ['totalTokens', 'cost', 'messages', 'sessions', 'model'];
  if (!validSortFields.includes(sortBy)) {
    return res.status(400).json({
      error: 'Invalid sort field',
      message: `sortBy must be one of: ${validSortFields.join(', ')}`
    });
  }
  
  if (!['asc', 'desc'].includes(sortOrder)) {
    return res.status(400).json({
      error: 'Invalid sort order',
      message: 'sortOrder must be "asc" or "desc"'
    });
  }
  
  // キャッシュチェック
  const cacheKey = `models_${sortBy}_${sortOrder}`;
  const cachedData = cacheService.getCache(cacheKey);
  if (cachedData) {
    console.log('Returning cached model usage data');
    return res.json(cachedData);
  }
  
  console.log('Generating fresh model usage data...');
  const startTime = Date.now();
  
  const projectData = await processProjectData();
  let modelUsage = projectData.modelUsage || [];
  
  // ソート
  modelUsage.sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'cost':
        aVal = parseFloat(a.cost);
        bVal = parseFloat(b.cost);
        break;
      case 'totalTokens':
        aVal = a.totalTokens;
        bVal = b.totalTokens;
        break;
      case 'messages':
        aVal = a.messages;
        bVal = b.messages;
        break;
      case 'sessions':
        aVal = a.sessions;
        bVal = b.sessions;
        break;
      case 'model':
        aVal = a.model.toLowerCase();
        bVal = b.model.toLowerCase();
        break;
      default:
        aVal = a[sortBy];
        bVal = b[sortBy];
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  // 統計情報を計算
  const stats = {
    totalModels: modelUsage.length,
    totalTokens: modelUsage.reduce((sum, m) => sum + m.totalTokens, 0),
    totalCost: modelUsage.reduce((sum, m) => sum + parseFloat(m.cost), 0).toFixed(2),
    totalMessages: modelUsage.reduce((sum, m) => sum + m.messages, 0),
    totalSessions: modelUsage.reduce((sum, m) => sum + m.sessions, 0),
    mostUsedModel: modelUsage.length > 0 ? modelUsage[0].model : null
  };
  
  const result = {
    data: modelUsage,
    stats
  };
  
  // キャッシュに保存
  cacheService.setCache(cacheKey, result);
  
  console.log(`Model usage data generated in ${Date.now() - startTime}ms`);
  res.json(result);
}));

module.exports = router;