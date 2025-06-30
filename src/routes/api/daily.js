const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { processProjectData } = require('../../services/projectService');
const cacheService = require('../../services/cacheService');

/**
 * ページネーション用のヘルパー関数
 */
function paginateArray(array, page = 1, limit = 50) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = array.slice(startIndex, endIndex);
  
  return {
    data: paginatedItems,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(array.length / limit),
      totalItems: array.length,
      itemsPerPage: limit,
      hasNext: endIndex < array.length,
      hasPrev: page > 1
    }
  };
}

/**
 * 日別使用量データを取得
 */
router.get('/', asyncHandler(async (req, res) => {
  console.log('Fetching daily usage data...');
  
  // クエリパラメータ
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  
  // バリデーション
  if (page < 1 || limit < 1 || limit > 1000) {
    return res.status(400).json({
      error: 'Invalid pagination parameters',
      message: 'Page must be >= 1, limit must be between 1 and 1000'
    });
  }
  
  // キャッシュチェック
  const cacheKey = `dailyUsage_${page}_${limit}_${startDate || 'all'}_${endDate || 'all'}`;
  const cachedData = cacheService.getCache(cacheKey);
  if (cachedData && await cacheService.isCacheValid()) {
    console.log('Returning cached daily usage data');
    return res.json(cachedData);
  }
  
  console.log('Generating fresh daily usage data...');
  const startTime = Date.now();
  
  const projectData = await processProjectData();
  let dailyUsage = projectData.dailyUsage || [];
  
  // 日付フィルタリング
  if (startDate || endDate) {
    dailyUsage = dailyUsage.filter(day => {
      const dayDate = new Date(day.date);
      if (startDate && dayDate < new Date(startDate)) return false;
      if (endDate && dayDate > new Date(endDate)) return false;
      return true;
    });
  }
  
  // ページネーション適用
  const result = paginateArray(dailyUsage, page, limit);
  
  // キャッシュに保存
  await cacheService.setCache(cacheKey, result, 5 * 60 * 1000); // 5分キャッシュ
  
  console.log(`Daily usage data generated in ${Date.now() - startTime}ms`);
  res.json(result);
}));

/**
 * 特定日の詳細データを取得
 */
router.get('/:date', asyncHandler(async (req, res) => {
  const { date } = req.params;
  
  // 日付バリデーション
  const requestedDate = new Date(date);
  if (isNaN(requestedDate.getTime())) {
    return res.status(400).json({
      error: 'Invalid date format',
      message: 'Date must be in YYYY-MM-DD format'
    });
  }
  
  console.log(`Fetching detailed data for ${date}...`);
  
  const projectData = await processProjectData();
  const dayData = projectData.dailyUsage.find(day => day.date === date);
  
  if (!dayData) {
    return res.status(404).json({
      error: 'Data not found',
      message: `No usage data found for ${date}`
    });
  }
  
  res.json(dayData);
}));

module.exports = router;