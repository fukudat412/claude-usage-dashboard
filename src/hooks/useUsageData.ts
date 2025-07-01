import { useState, useEffect } from 'react';
import { UseUsageDataReturn, UsageData } from '../types';

const useUsageData = (): UseUsageDataReturn => {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // v2 APIを使用して必要なデータを並列取得
      const [summaryResponse, dailyResponse, monthlyResponse, mcpLogsResponse, mcpToolsResponse, projectsResponse] = await Promise.all([
        fetch('/api/v2/summary'),
        fetch('/api/v2/daily?limit=30'), // 最新30日分
        fetch('/api/v2/monthly?limit=12'), // 最新12ヶ月分
        fetch('/api/v2/mcp/logs?limit=100'), // 最新100ログ
        fetch('/api/v2/mcp/tools'),
        fetch('/api/v2/projects?limit=50') // 最新50プロジェクト
      ]);

      // レスポンスチェック
      if (!summaryResponse.ok || !dailyResponse.ok || !monthlyResponse.ok || 
          !mcpLogsResponse.ok || !mcpToolsResponse.ok || !projectsResponse.ok) {
        throw new Error('Failed to fetch usage data from v2 API');
      }

      // データを解析
      const [summary, dailyData, monthlyData, mcpLogsData, mcpToolsData, projectsData] = await Promise.all([
        summaryResponse.json(),
        dailyResponse.json(),
        monthlyResponse.json(),
        mcpLogsResponse.json(),
        mcpToolsResponse.json(),
        projectsResponse.json()
      ]);

      // v1互換のデータ構造に変換
      const aggregatedData: UsageData = {
        // 基本使用量データ
        daily: dailyData.data || [],
        monthly: monthlyData.data || [],
        total: summary.summary || {
          tokens: 0,
          cost: 0,
          sessions: 0
        },
        
        // 詳細データ
        summary: summary,
        mcpLogs: mcpLogsData.data || [],
        todos: [], // TODO: 必要に応じて別途取得
        vsCodeLogs: [], // TODO: 必要に応じて別途取得
        dailyUsage: dailyData.data || [],
        monthlyUsage: monthlyData.data || [],
        
        // 追加データ（v2の拡張機能）
        mcpToolUsage: mcpToolsData,
        projects: projectsData.data || [],
        modelUsage: summary.modelUsage || []
      };

      setUsageData(aggregatedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching usage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, []);

  const refetch = (): void => {
    fetchUsageData();
  };

  return {
    usageData,
    loading,
    error,
    refetch
  };
};

export default useUsageData;