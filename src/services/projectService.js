const fs = require('fs-extra');
const path = require('path');
const { CLAUDE_PATHS } = require('../config/paths');
const { AppError } = require('../middleware/errorHandler');
const { calculateUsageMetrics } = require('./pricingService');

/**
 * 統合されたプロジェクトデータ処理
 */
async function processProjectData() {
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
                    sessions: new Set()
                  });
                }
                
                const dayData = usageByDate.get(date);
                dayData.inputTokens += metrics.inputTokens;
                dayData.outputTokens += metrics.outputTokens;
                dayData.cachedTokens += metrics.cachedTokens;
                dayData.totalTokens += metrics.totalTokens;
                dayData.cost += metrics.cost;
                
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
                    messages: 0
                  });
                }
                
                const monthData = usageByMonth.get(monthKey);
                monthData.inputTokens += metrics.inputTokens;
                monthData.outputTokens += metrics.outputTokens;
                monthData.cachedTokens += metrics.cachedTokens;
                monthData.totalTokens += metrics.totalTokens;
                monthData.messages++;
                monthData.cost += metrics.cost;
                
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
                    sessions: new Set()
                  });
                }
                
                const modelData = usageByModel.get(model);
                modelData.inputTokens += metrics.inputTokens;
                modelData.outputTokens += metrics.outputTokens;
                modelData.cachedTokens += metrics.cachedTokens;
                modelData.totalTokens += metrics.totalTokens;
                modelData.messages++;
                modelData.cost += metrics.cost;
                
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
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const monthlyData = Array.from(usageByMonth.values()).map(month => ({
      ...month,
      cost: month.cost.toFixed(4),
      sessions: month.sessions.size
    })).sort((a, b) => b.month.localeCompare(a.month));
    
    const modelData = Array.from(usageByModel.values()).map(model => ({
      ...model,
      cost: model.cost.toFixed(4),
      sessions: model.sessions.size
    })).sort((a, b) => b.totalTokens - a.totalTokens);
    
    projects.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    
    return {
      dailyUsage: dailyData,
      monthlyUsage: monthlyData,
      modelUsage: modelData,
      projects
    };
  } catch (error) {
    console.error('Error processing project data:', error);
    throw new AppError('Failed to process project data', 500, 'PROJECT_PROCESSING_ERROR');
  }
}

module.exports = {
  processProjectData
};