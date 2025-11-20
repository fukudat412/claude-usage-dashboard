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
  const startHour = req.query.startHour ? parseInt(req.query.startHour) : null;
  const endHour = req.query.endHour ? parseInt(req.query.endHour) : null;

  // バリデーション
  if (page < 1 || limit < 1 || limit > 1000) {
    return res.status(400).json({
      error: 'Invalid pagination parameters',
      message: 'Page must be >= 1, limit must be between 1 and 1000'
    });
  }

  // 時間帯バリデーション
  if ((startHour !== null && (startHour < 0 || startHour > 23)) ||
      (endHour !== null && (endHour < 0 || endHour > 23))) {
    return res.status(400).json({
      error: 'Invalid time range',
      message: 'Hours must be between 0 and 23'
    });
  }

  // キャッシュチェック
  const cacheKey = `dailyUsage_${page}_${limit}_${startDate || 'all'}_${endDate || 'all'}_${startHour || 'all'}_${endHour || 'all'}`;
  const cachedData = cacheService.getCache(cacheKey);
  if (cachedData) {
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

  // 時間帯フィルタリング（詳細データがある場合）
  if ((startHour !== null || endHour !== null) && projectData.detailedUsage) {
    dailyUsage = dailyUsage.map(day => {
      // Get detailed entries for this day
      const dayEntries = projectData.detailedUsage.filter(entry => {
        const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
        return entryDate === day.date;
      });

      // Filter by hour
      const filteredEntries = dayEntries.filter(entry => {
        const hour = new Date(entry.timestamp).getHours();
        if (startHour !== null && hour < startHour) return false;
        if (endHour !== null && hour > endHour) return false;
        return true;
      });

      // Recalculate metrics for filtered entries
      if (filteredEntries.length === 0) return null;

      const filtered = {
        date: day.date,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
        cost: 0,
        sessions: new Set(),
        newInputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0
      };

      filteredEntries.forEach(entry => {
        filtered.inputTokens += entry.inputTokens || 0;
        filtered.outputTokens += entry.outputTokens || 0;
        filtered.cachedTokens += entry.cachedTokens || 0;
        filtered.totalTokens += entry.totalTokens || 0;
        filtered.cost += entry.cost || 0;
        filtered.newInputTokens += entry.newInputTokens || 0;
        filtered.cacheCreationTokens += entry.cacheCreationTokens || 0;
        filtered.cacheReadTokens += entry.cacheReadTokens || 0;
        if (entry.sessionId) filtered.sessions.add(entry.sessionId);
      });

      filtered.sessionCount = filtered.sessions.size;
      delete filtered.sessions;

      return filtered;
    }).filter(Boolean);
  }

  // ページネーション適用
  const result = paginateArray(dailyUsage, page, limit);

  // キャッシュに保存
  cacheService.setCache(cacheKey, result);

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