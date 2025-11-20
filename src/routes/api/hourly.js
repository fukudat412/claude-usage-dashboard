const express = require('express');
const router = express.Router();
const projectService = require('../../services/projectService');
const cacheService = require('../../services/cacheService');

/**
 * GET /api/v2/hourly
 * 時間帯別の使用量データを返す
 *
 * Query parameters:
 * - date: 特定の日付 (YYYY-MM-DD) - オプション
 * - startDate: 開始日 (YYYY-MM-DD) - オプション
 * - endDate: 終了日 (YYYY-MM-DD) - オプション
 */
router.get('/', async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;

    // キャッシュキーを生成
    const cacheKey = `hourly-${date || 'all'}-${startDate || ''}-${endDate || ''}`;

    // キャッシュをチェック
    const cachedData = cacheService.getCache(cacheKey);
    if (cachedData) {
      console.log('Returning cached hourly usage data');
      return res.json(cachedData);
    }

    console.log('Generating fresh hourly usage data...');

    // プロジェクトデータを取得
    const projectData = await projectService.processProjectData();

    if (!projectData.detailedUsage || projectData.detailedUsage.length === 0) {
      return res.json({
        hourlyData: [],
        heatmapData: [],
        statistics: null
      });
    }

    // 時間帯別データを集計
    const hourlyMap = new Map(); // hour -> usage data
    const heatmapMap = new Map(); // date -> hour -> usage data

    projectData.detailedUsage.forEach(entry => {
      const timestamp = new Date(entry.timestamp);
      const dateStr = timestamp.toISOString().split('T')[0];
      const hour = timestamp.getHours();

      // 日付フィルター
      if (date && dateStr !== date) return;
      if (startDate && dateStr < startDate) return;
      if (endDate && dateStr > endDate) return;

      // 時間帯別集計
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, {
          hour,
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          totalTokens: 0,
          cost: 0,
          sessions: new Set(),
          requests: 0
        });
      }

      const hourData = hourlyMap.get(hour);
      hourData.inputTokens += entry.inputTokens || 0;
      hourData.outputTokens += entry.outputTokens || 0;
      hourData.cachedTokens += entry.cachedTokens || 0;
      hourData.totalTokens += entry.totalTokens || 0;
      hourData.cost += entry.cost || 0;
      hourData.sessions.add(entry.sessionId);
      hourData.requests += 1;

      // ヒートマップ用データ
      if (!heatmapMap.has(dateStr)) {
        heatmapMap.set(dateStr, new Map());
      }
      const dateMap = heatmapMap.get(dateStr);

      if (!dateMap.has(hour)) {
        dateMap.set(hour, {
          date: dateStr,
          hour,
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          totalTokens: 0,
          cost: 0,
          requests: 0
        });
      }

      const cellData = dateMap.get(hour);
      cellData.inputTokens += entry.inputTokens || 0;
      cellData.outputTokens += entry.outputTokens || 0;
      cellData.cachedTokens += entry.cachedTokens || 0;
      cellData.totalTokens += entry.totalTokens || 0;
      cellData.cost += entry.cost || 0;
      cellData.requests += 1;
    });

    // 時間帯別データを配列に変換
    const hourlyData = Array.from(hourlyMap.values())
      .map(data => ({
        ...data,
        sessions: data.sessions.size,
        avgCostPerRequest: data.requests > 0 ? data.cost / data.requests : 0,
        avgTokensPerRequest: data.requests > 0 ? data.totalTokens / data.requests : 0
      }))
      .sort((a, b) => a.hour - b.hour);

    // ヒートマップデータを配列に変換
    const heatmapData = [];
    heatmapMap.forEach((hourMap, date) => {
      hourMap.forEach((data) => {
        heatmapData.push(data);
      });
    });
    heatmapData.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.hour - b.hour;
    });

    // 統計情報を計算
    let statistics = null;
    if (hourlyData.length > 0) {
      const totalCost = hourlyData.reduce((sum, h) => sum + h.cost, 0);
      const totalTokens = hourlyData.reduce((sum, h) => sum + h.totalTokens, 0);
      const totalRequests = hourlyData.reduce((sum, h) => sum + h.requests, 0);

      // ピーク時間帯（コスト基準）
      const peakCostHour = hourlyData.reduce((max, h) =>
        h.cost > max.cost ? h : max
      );

      // ピーク時間帯（トークン基準）
      const peakTokenHour = hourlyData.reduce((max, h) =>
        h.totalTokens > max.totalTokens ? h : max
      );

      // 最も使用されている時間帯（リクエスト数基準）
      const peakRequestHour = hourlyData.reduce((max, h) =>
        h.requests > max.requests ? h : max
      );

      statistics = {
        totalCost,
        totalTokens,
        totalRequests,
        avgCostPerHour: totalCost / hourlyData.length,
        avgTokensPerHour: totalTokens / hourlyData.length,
        avgRequestsPerHour: totalRequests / hourlyData.length,
        peakCostHour: {
          hour: peakCostHour.hour,
          cost: peakCostHour.cost,
          percentage: (peakCostHour.cost / totalCost) * 100
        },
        peakTokenHour: {
          hour: peakTokenHour.hour,
          tokens: peakTokenHour.totalTokens,
          percentage: (peakTokenHour.totalTokens / totalTokens) * 100
        },
        peakRequestHour: {
          hour: peakRequestHour.hour,
          requests: peakRequestHour.requests,
          percentage: (peakRequestHour.requests / totalRequests) * 100
        },
        // 時間帯の分類
        morningUsage: hourlyData.filter(h => h.hour >= 6 && h.hour < 12).reduce((sum, h) => sum + h.cost, 0),
        afternoonUsage: hourlyData.filter(h => h.hour >= 12 && h.hour < 18).reduce((sum, h) => sum + h.cost, 0),
        eveningUsage: hourlyData.filter(h => h.hour >= 18 && h.hour < 24).reduce((sum, h) => sum + h.cost, 0),
        nightUsage: hourlyData.filter(h => h.hour >= 0 && h.hour < 6).reduce((sum, h) => sum + h.cost, 0)
      };
    }

    const result = {
      hourlyData,
      heatmapData,
      statistics
    };

    // キャッシュに保存
    cacheService.setCache(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error('Error fetching hourly usage:', error);
    res.status(500).json({ error: 'Failed to fetch hourly usage data' });
  }
});

module.exports = router;
