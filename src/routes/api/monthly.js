const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { processProjectData } = require('../../services/projectService');
const cacheService = require('../../services/cacheService');

/**
 * ページネーション用のヘルパー関数
 */
function paginateArray(array, page = 1, limit = 12) {
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
 * 月別使用量データを取得
 */
router.get('/', asyncHandler(async (req, res) => {
  console.log('Fetching monthly usage data...');
  
  // クエリパラメータ
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12; // デフォルト12ヶ月
  const year = req.query.year;
  
  // バリデーション
  if (page < 1 || limit < 1 || limit > 120) { // 最大10年分
    return res.status(400).json({
      error: 'Invalid pagination parameters',
      message: 'Page must be >= 1, limit must be between 1 and 120'
    });
  }
  
  if (year && (isNaN(year) || year < 2020 || year > 2030)) {
    return res.status(400).json({
      error: 'Invalid year parameter',
      message: 'Year must be between 2020 and 2030'
    });
  }
  
  // キャッシュチェック
  const cacheKey = `monthlyUsage_${page}_${limit}_${year || 'all'}`;
  const cachedData = cacheService.getCache(cacheKey);
  if (cachedData && await cacheService.isCacheValid()) {
    console.log('Returning cached monthly usage data');
    return res.json(cachedData);
  }
  
  console.log('Generating fresh monthly usage data...');
  const startTime = Date.now();
  
  const projectData = await processProjectData();
  let monthlyUsage = projectData.monthlyUsage || [];
  
  // 年フィルタリング
  if (year) {
    monthlyUsage = monthlyUsage.filter(month => {
      return month.month.startsWith(year.toString());
    });
  }
  
  // ページネーション適用
  const result = paginateArray(monthlyUsage, page, limit);
  
  // キャッシュに保存
  await cacheService.setCache(cacheKey, result, 10 * 60 * 1000); // 10分キャッシュ
  
  console.log(`Monthly usage data generated in ${Date.now() - startTime}ms`);
  res.json(result);
}));

/**
 * 特定月の詳細データを取得
 */
router.get('/:month', asyncHandler(async (req, res) => {
  const { month } = req.params;
  
  // 月フォーマットバリデーション (YYYY-MM)
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    return res.status(400).json({
      error: 'Invalid month format',
      message: 'Month must be in YYYY-MM format'
    });
  }
  
  console.log(`Fetching detailed data for ${month}...`);
  
  const projectData = await processProjectData();
  const monthData = projectData.monthlyUsage.find(m => m.month === month);
  
  if (!monthData) {
    return res.status(404).json({
      error: 'Data not found',
      message: `No usage data found for ${month}`
    });
  }
  
  res.json(monthData);
}));

module.exports = router;