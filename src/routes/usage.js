const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { getMcpLogsData, getMcpToolUsageStats } = require('../services/mcpService');
const { getTodosData } = require('../services/todoService');
const { getVsCodeLogsData } = require('../services/vscodeService');
const { processProjectData } = require('../services/projectService');
const cacheService = require('../services/cacheService');

/**
 * サマリーデータを生成
 */
function generateSummary(data) {
  const totalMcpSessions = data.mcpLogs.length;
  const totalTodoFiles = data.todos.length;
  const totalVsCodeTasks = data.vsCodeLogs.length;
  
  const totalSize = [
    ...data.mcpLogs.map(log => log.size || 0),
    ...data.todos.map(todo => todo.size || 0)
  ].reduce((sum, size) => sum + size, 0);

  const totalMessages = data.vsCodeLogs.reduce((sum, log) => sum + (log.messageCount || 0), 0);
  const totalConversations = data.vsCodeLogs.reduce((sum, log) => sum + (log.conversationCount || 0), 0);

  // 日毎の使用量データから総計を計算
  const totalTokens = data.dailyUsage.reduce((sum, day) => sum + day.totalTokens, 0);
  const totalCost = data.dailyUsage.reduce((sum, day) => sum + parseFloat(day.cost), 0).toFixed(2);

  return {
    totalMcpSessions,
    totalTodoFiles,
    totalVsCodeTasks,
    totalSize,
    totalMessages,
    totalConversations,
    totalTokens,
    totalCost,
    lastActivity: data.mcpLogs[0]?.timestamp || data.todos[0]?.timestamp || null
  };
}

/**
 * 使用量データを取得するAPI
 */
router.get('/', asyncHandler(async (req, res) => {
  console.log('Fetching usage data...');
  
  // キャッシュチェック
  const cachedData = cacheService.getCache('usageData');
  if (cachedData) {
    console.log('Returning cached data');
    return res.json(cachedData);
  }
  
  console.log('Cache miss, fetching fresh data...');
  const startTime = Date.now();
  
  console.log('Step 1/2: Loading lightweight data...');
  
  // 高速な順序で実行（軽いものから重いものへ）
  const [mcpLogs, todos, vsCodeLogs, mcpToolUsage] = await Promise.all([
    getMcpLogsData(),
    getTodosData(), 
    getVsCodeLogsData(),
    getMcpToolUsageStats()
  ]);
  
  console.log(`Step 1/2 completed in ${Date.now() - startTime}ms`);
  
  console.log('Step 2/2: Processing project data (this may take a moment)...');
  // 統合されたプロジェクトデータ処理
  const projectData = await processProjectData();
  const dailyUsage = projectData.dailyUsage;
  const monthlyUsage = projectData.monthlyUsage;
  const modelUsage = projectData.modelUsage;
  const projects = projectData.projects;
  
  console.log(`All data fetched in ${Date.now() - startTime}ms`);
  
  const data = {
    mcpLogs,
    todos,
    vsCodeLogs,
    mcpToolUsage,
    dailyUsage,
    monthlyUsage,
    modelUsage,
    projects,
    summary: {}
  };

  data.summary = generateSummary(data);
  
  // キャッシュに保存
  cacheService.setCache('usageData', data);
  
  console.log(`Total processing time: ${Date.now() - startTime}ms`);
  res.json(data);
}));

module.exports = router;