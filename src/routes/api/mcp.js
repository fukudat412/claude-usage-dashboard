const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { getMcpLogsData, getMcpToolUsageStats } = require('../../services/mcpService');
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
 * MCPログデータを取得
 */
router.get('/logs', asyncHandler(async (req, res) => {
  console.log('Fetching MCP logs data...');
  
  // クエリパラメータ
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const sessionId = req.query.sessionId;
  
  // バリデーション
  if (page < 1 || limit < 1 || limit > 500) {
    return res.status(400).json({
      error: 'Invalid pagination parameters',
      message: 'Page must be >= 1, limit must be between 1 and 500'
    });
  }
  
  // キャッシュチェック
  const cacheKey = `mcpLogs_${page}_${limit}_${sessionId || 'all'}`;
  const cachedData = cacheService.getCache(cacheKey);
  if (cachedData && await cacheService.isCacheValid()) {
    console.log('Returning cached MCP logs data');
    return res.json(cachedData);
  }
  
  console.log('Generating fresh MCP logs data...');
  const startTime = Date.now();
  
  let mcpLogs = await getMcpLogsData();
  
  // セッションIDフィルタリング
  if (sessionId) {
    mcpLogs = mcpLogs.filter(log => log.sessionId === sessionId);
  }
  
  // ページネーション適用
  const result = paginateArray(mcpLogs, page, limit);
  
  // キャッシュに保存
  await cacheService.setCache(cacheKey, result, 3 * 60 * 1000); // 3分キャッシュ
  
  console.log(`MCP logs data generated in ${Date.now() - startTime}ms`);
  res.json(result);
}));

/**
 * MCPツール使用統計を取得
 */
router.get('/tools', asyncHandler(async (req, res) => {
  console.log('Fetching MCP tool usage stats...');
  
  // キャッシュチェック
  const cachedData = cacheService.getCache('mcpToolUsage');
  if (cachedData && await cacheService.isCacheValid()) {
    console.log('Returning cached MCP tool usage data');
    return res.json(cachedData);
  }
  
  console.log('Generating fresh MCP tool usage data...');
  const startTime = Date.now();
  
  const mcpToolUsage = await getMcpToolUsageStats();
  
  // キャッシュに保存
  await cacheService.setCache('mcpToolUsage', mcpToolUsage, 5 * 60 * 1000); // 5分キャッシュ
  
  console.log(`MCP tool usage data generated in ${Date.now() - startTime}ms`);
  res.json(mcpToolUsage);
}));

/**
 * 特定ツールの詳細統計を取得
 */
router.get('/tools/:toolName', asyncHandler(async (req, res) => {
  const { toolName } = req.params;
  
  console.log(`Fetching detailed stats for tool: ${toolName}`);
  
  const mcpToolUsage = await getMcpToolUsageStats();
  const toolData = mcpToolUsage.tools.find(tool => tool.name === toolName);
  
  if (!toolData) {
    return res.status(404).json({
      error: 'Tool not found',
      message: `No usage data found for tool: ${toolName}`
    });
  }
  
  // 関連セッション情報も含める
  const relatedSessions = mcpToolUsage.sessions.filter(session => 
    session.tools && session.tools[toolName]
  );
  
  res.json({
    tool: toolData,
    relatedSessions: relatedSessions.slice(0, 20) // 最新20セッション
  });
}));

module.exports = router;