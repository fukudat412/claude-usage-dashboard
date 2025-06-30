const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { getMcpLogsData, getMcpToolUsageStats } = require('../../services/mcpService');
const { getTodosData } = require('../../services/todoService');
const { getVsCodeLogsData } = require('../../services/vscodeService');
const { processProjectData } = require('../../services/projectService');
const cacheService = require('../../services/cacheService');

/**
 * サマリーデータを生成
 */
function generateSummary(data) {
  const totalMcpSessions = data.mcpLogs?.length || 0;
  const totalTodoFiles = data.todos?.length || 0;
  const totalVsCodeTasks = data.vsCodeLogs?.length || 0;
  
  const totalSize = [
    ...(data.mcpLogs?.map(log => log.size || 0) || []),
    ...(data.todos?.map(todo => todo.size || 0) || [])
  ].reduce((sum, size) => sum + size, 0);

  const totalMessages = (data.vsCodeLogs || []).reduce((sum, log) => sum + (log.messageCount || 0), 0);
  const totalConversations = (data.vsCodeLogs || []).reduce((sum, log) => sum + (log.conversationCount || 0), 0);

  // 日毎の使用量データから総計を計算
  const totalTokens = (data.dailyUsage || []).reduce((sum, day) => sum + day.totalTokens, 0);
  const totalCost = (data.dailyUsage || []).reduce((sum, day) => sum + parseFloat(day.cost || 0), 0).toFixed(2);

  return {
    totalMcpSessions,
    totalTodoFiles,
    totalVsCodeTasks,
    totalSize,
    totalMessages,
    totalConversations,
    totalTokens,
    totalCost,
    lastActivity: data.mcpLogs?.[0]?.timestamp || data.todos?.[0]?.timestamp || null
  };
}

/**
 * サマリーデータのみを取得
 */
router.get('/', asyncHandler(async (req, res) => {
  console.log('Fetching summary data...');
  
  // キャッシュからサマリーデータを取得
  const cachedData = cacheService.getCache('usageData');
  if (cachedData && await cacheService.isCacheValid()) {
    console.log('Returning cached summary');
    return res.json(cachedData.summary);
  }
  
  console.log('Generating fresh summary data...');
  const startTime = Date.now();
  
  // 軽量なデータのみ取得
  const [mcpLogs, todos, vsCodeLogs] = await Promise.all([
    getMcpLogsData(),
    getTodosData(),
    getVsCodeLogsData()
  ]);
  
  // 簡易的なプロジェクトデータ（サマリー用）
  const projectData = await processProjectData();
  
  const data = {
    mcpLogs,
    todos,
    vsCodeLogs,
    dailyUsage: projectData.dailyUsage
  };

  const summary = generateSummary(data);
  
  console.log(`Summary generated in ${Date.now() - startTime}ms`);
  res.json(summary);
}));

module.exports = router;