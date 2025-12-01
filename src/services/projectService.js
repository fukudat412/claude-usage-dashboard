const fs = require('fs-extra');
const path = require('path');
const { CLAUDE_PATHS } = require('../config/paths');
const { AppError } = require('../middleware/errorHandler');
const { calculateUsageMetrics } = require('./pricingService');
const { processProjectDataWithRust, isRustProcessorAvailable } = require('./rustProcessor');

/**
 * Node.js実装のプロジェクトデータ処理
 */
async function processProjectDataNodeJS() {
  try {
    if (!(await fs.pathExists(CLAUDE_PATHS.projects))) {
      console.log('Projects directory not found');
      return { dailyUsage: [], monthlyUsage: [], modelUsage: [], projects: [] };
    }

    const projectDirs = await fs.readdir(CLAUDE_PATHS.projects);
    console.log(`Found ${projectDirs.length} project directories`);
    
    const usageByDate = new Map();
    const usageByMonth = new Map();
    const usageByModel = new Map();
    const projects = [];
    const detailedUsage = []; // Store detailed entries with timestamps
    
    // 並列でプロジェクトディレクトリを処理
    await Promise.all(projectDirs.map(async (projectDir) => {
      const projectPath = path.join(CLAUDE_PATHS.projects, projectDir);
      const stats = await fs.stat(projectPath);
      
      if (!stats.isDirectory()) return;
      
      const files = await fs.readdir(projectPath);
      let totalTokens = 0;
      let totalCost = 0;
      let messageCount = 0;
      let lastActivity = null;
      
      // 並列でJSONLファイルを処理
      await Promise.all(files.map(async (file) => {
        if (!file.endsWith('.jsonl')) return;
        
        const filePath = path.join(projectPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            messageCount++;
            
            if (data.timestamp) {
              const timestamp = new Date(data.timestamp);
              if (!lastActivity || timestamp > lastActivity) {
                lastActivity = timestamp;
              }
            }
            
            if (data.message && data.message.usage) {
              const usage = data.message.usage;
              const timestamp = data.timestamp;
              const model = data.message.model;

              const metrics = calculateUsageMetrics(usage, model);

              // Store detailed entry with timestamp for time-based filtering
              if (timestamp) {
                detailedUsage.push({
                  timestamp,
                  sessionId: data.sessionId,
                  model,
                  inputTokens: metrics.inputTokens,
                  outputTokens: metrics.outputTokens,
                  cachedTokens: metrics.cachedTokens,
                  totalTokens: metrics.totalTokens,
                  cost: metrics.cost,
                  newInputTokens: metrics.newInputTokens || 0,
                  cacheCreationTokens: metrics.cacheCreationTokens || 0,
                  cacheReadTokens: metrics.cacheReadTokens || 0
                });
              }

              // 日毎データ
              if (timestamp) {
                const date = new Date(timestamp).toISOString().split('T')[0];
                if (!usageByDate.has(date)) {
                  usageByDate.set(date, {
                    date,
                    inputTokens: 0,
                    outputTokens: 0,
                    cachedTokens: 0,
                    totalTokens: 0,
                    cost: 0,
                    sessions: new Set(),
                    // Detailed breakdown
                    newInputTokens: 0,
                    cacheCreationTokens: 0,
                    cacheReadTokens: 0
                  });
                }
                
                const dayData = usageByDate.get(date);
                dayData.inputTokens += metrics.inputTokens;
                dayData.outputTokens += metrics.outputTokens;
                dayData.cachedTokens += metrics.cachedTokens;
                dayData.totalTokens += metrics.totalTokens;
                dayData.cost += metrics.cost;
                
                // Add detailed breakdown
                dayData.newInputTokens += metrics.newInputTokens || 0;
                dayData.cacheCreationTokens += metrics.cacheCreationTokens || 0;
                dayData.cacheReadTokens += metrics.cacheReadTokens || 0;
                
                if (data.sessionId) {
                  dayData.sessions.add(data.sessionId);
                }
                
                // 月毎データ
                const monthKey = `${new Date(timestamp).getFullYear()}-${String(new Date(timestamp).getMonth() + 1).padStart(2, '0')}`;
                if (!usageByMonth.has(monthKey)) {
                  usageByMonth.set(monthKey, {
                    month: monthKey,
                    inputTokens: 0,
                    outputTokens: 0,
                    cachedTokens: 0,
                    totalTokens: 0,
                    cost: 0,
                    sessions: new Set(),
                    messages: 0,
                    // Detailed breakdown
                    newInputTokens: 0,
                    cacheCreationTokens: 0,
                    cacheReadTokens: 0
                  });
                }
                
                const monthData = usageByMonth.get(monthKey);
                monthData.inputTokens += metrics.inputTokens;
                monthData.outputTokens += metrics.outputTokens;
                monthData.cachedTokens += metrics.cachedTokens;
                monthData.totalTokens += metrics.totalTokens;
                monthData.messages++;
                monthData.cost += metrics.cost;
                
                // Add detailed breakdown
                monthData.newInputTokens += metrics.newInputTokens || 0;
                monthData.cacheCreationTokens += metrics.cacheCreationTokens || 0;
                monthData.cacheReadTokens += metrics.cacheReadTokens || 0;
                
                if (data.sessionId) {
                  monthData.sessions.add(data.sessionId);
                }
              }
              
              // モデル別データ
              if (model) {
                if (!usageByModel.has(model)) {
                  usageByModel.set(model, {
                    model,
                    inputTokens: 0,
                    outputTokens: 0,
                    cachedTokens: 0,
                    totalTokens: 0,
                    cost: 0,
                    messages: 0,
                    sessions: new Set(),
                    // Detailed breakdown for analysis
                    newInputTokens: 0,
                    cacheCreationTokens: 0,
                    cacheReadTokens: 0
                  });
                }
                
                const modelData = usageByModel.get(model);
                modelData.inputTokens += metrics.inputTokens;
                modelData.outputTokens += metrics.outputTokens;
                modelData.cachedTokens += metrics.cachedTokens;
                modelData.totalTokens += metrics.totalTokens;
                modelData.messages++;
                modelData.cost += metrics.cost;
                
                // Add detailed breakdown
                modelData.newInputTokens += metrics.newInputTokens || 0;
                modelData.cacheCreationTokens += metrics.cacheCreationTokens || 0;
                modelData.cacheReadTokens += metrics.cacheReadTokens || 0;
                
                if (data.sessionId) {
                  modelData.sessions.add(data.sessionId);
                }
              }
              
              // プロジェクト統計
              totalTokens += metrics.totalTokens;
              totalCost += metrics.cost;
            }
          } catch (e) {
            // JSONパースエラーは無視
          }
        }
      }));
      
      projects.push({
        name: projectDir,
        path: projectPath,
        totalTokens,
        totalCost: totalCost.toFixed(4),
        messageCount,
        lastActivity
      });
    }));
    
    // 結果を配列に変換
    const dailyData = Array.from(usageByDate.values()).map(day => ({
      ...day,
      cost: day.cost.toFixed(4),
      sessions: day.sessions.size
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const monthlyData = Array.from(usageByMonth.values()).map(month => ({
      ...month,
      cost: month.cost.toFixed(4),
      sessions: month.sessions.size
    })).sort((a, b) => a.month.localeCompare(b.month));
    
    const modelData = Array.from(usageByModel.values()).map(model => ({
      ...model,
      cost: model.cost.toFixed(4),
      sessions: model.sessions.size
    })).sort((a, b) => b.totalTokens - a.totalTokens);
    
    projects.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    // Sort detailed usage by timestamp
    detailedUsage.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // 全期間のユニークセッション数を計算
    const allSessions = new Set();
    usageByDate.forEach(day => {
      day.sessions.forEach(sessionId => allSessions.add(sessionId));
    });

    return {
      dailyUsage: dailyData,
      monthlyUsage: monthlyData,
      modelUsage: modelData,
      projects,
      detailedUsage,
      totalSessions: allSessions.size
    };
  } catch (error) {
    console.error('Error processing project data:', error);
    throw new AppError('Failed to process project data', 500, 'PROJECT_PROCESSING_ERROR');
  }
}

/**
 * プロジェクトデータ処理のエントリーポイント
 * Rustプロセッサを優先的に使用し、失敗時はNode.js実装にフォールバック
 */
async function processProjectData() {
  const startTime = Date.now();

  // Rustプロセッサが利用可能かチェック
  if (isRustProcessorAvailable()) {
    console.log('[Hybrid] Attempting to use Rust processor...');
    const rustResult = processProjectDataWithRust();

    if (rustResult) {
      console.log(`[Hybrid] Successfully processed with Rust in ${Date.now() - startTime}ms`);
      return rustResult;
    }

    console.log('[Hybrid] Rust processor failed, falling back to Node.js implementation');
  } else {
    console.log('[Hybrid] Rust processor not available, using Node.js implementation');
  }

  // Node.js実装にフォールバック
  console.log('[Hybrid] Processing with Node.js...');
  const nodeResult = await processProjectDataNodeJS();
  console.log(`[Hybrid] Successfully processed with Node.js in ${Date.now() - startTime}ms`);
  return nodeResult;
}

module.exports = {
  processProjectData,
  processProjectDataNodeJS // テスト用にexport
};