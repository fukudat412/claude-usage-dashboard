import React, { useState, useEffect } from 'react';
import './HourlyAnalysis.css';

interface HourlyData {
  hour: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  cost: number;
  sessions: number;
  requests: number;
  avgCostPerRequest: number;
  avgTokensPerRequest: number;
}

interface HeatmapData {
  date: string;
  hour: number;
  totalTokens: number;
  cost: number;
  requests: number;
}

interface Statistics {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  avgCostPerHour: number;
  avgTokensPerHour: number;
  avgRequestsPerHour: number;
  peakCostHour: {
    hour: number;
    cost: number;
    percentage: number;
  };
  peakTokenHour: {
    hour: number;
    tokens: number;
    percentage: number;
  };
  peakRequestHour: {
    hour: number;
    requests: number;
    percentage: number;
  };
  morningUsage: number;
  afternoonUsage: number;
  eveningUsage: number;
  nightUsage: number;
}

interface HourlyAnalysisProps {
  startDate?: string;
  endDate?: string;
  formatNumber: (value: number) => string;
}

const HourlyAnalysis: React.FC<HourlyAnalysisProps> = ({ startDate, endDate, formatNumber }) => {
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'table' | 'heatmap' | 'chart'>('table');

  useEffect(() => {
    fetchHourlyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchHourlyData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/v2/hourly?${params}`);
      if (!response.ok) throw new Error('Failed to fetch hourly data');

      const data = await response.json();
      setHourlyData(data.hourlyData || []);
      setHeatmapData(data.heatmapData || []);
      setStatistics(data.statistics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getTimeOfDay = (hour: number): string => {
    if (hour >= 6 && hour < 12) return '朝';
    if (hour >= 12 && hour < 18) return '昼';
    if (hour >= 18 && hour < 24) return '夜';
    return '深夜';
  };

  const renderStatistics = () => {
    if (!statistics) return null;

    const timeDistribution = [
      { label: '朝 (6-12時)', value: statistics.morningUsage, color: '#fbbf24' },
      { label: '昼 (12-18時)', value: statistics.afternoonUsage, color: '#f59e0b' },
      { label: '夜 (18-24時)', value: statistics.eveningUsage, color: '#d97706' },
      { label: '深夜 (0-6時)', value: statistics.nightUsage, color: '#92400e' }
    ];

    return (
      <div className="hourly-statistics">
        <h3>統計サマリー</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">総コスト</div>
            <div className="stat-value">${statistics.totalCost.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">総トークン数</div>
            <div className="stat-value">{formatNumber(statistics.totalTokens)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">総リクエスト数</div>
            <div className="stat-value">{formatNumber(statistics.totalRequests)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">平均コスト/時</div>
            <div className="stat-value">${statistics.avgCostPerHour.toFixed(2)}</div>
          </div>
        </div>

        <div className="peak-hours">
          <h4>ピーク時間帯</h4>
          <div className="peak-grid">
            <div className="peak-card">
              <div className="peak-icon">💰</div>
              <div className="peak-info">
                <div className="peak-label">コストピーク</div>
                <div className="peak-time">{formatHour(statistics.peakCostHour.hour)}</div>
                <div className="peak-detail">
                  ${statistics.peakCostHour.cost.toFixed(2)} ({statistics.peakCostHour.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
            <div className="peak-card">
              <div className="peak-icon">🔢</div>
              <div className="peak-info">
                <div className="peak-label">トークンピーク</div>
                <div className="peak-time">{formatHour(statistics.peakTokenHour.hour)}</div>
                <div className="peak-detail">
                  {formatNumber(statistics.peakTokenHour.tokens)} ({statistics.peakTokenHour.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
            <div className="peak-card">
              <div className="peak-icon">📊</div>
              <div className="peak-info">
                <div className="peak-label">リクエストピーク</div>
                <div className="peak-time">{formatHour(statistics.peakRequestHour.hour)}</div>
                <div className="peak-detail">
                  {statistics.peakRequestHour.requests}件 ({statistics.peakRequestHour.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="time-distribution">
          <h4>時間帯別分布</h4>
          <div className="distribution-chart">
            {timeDistribution.map((item, index) => {
              const percentage = statistics.totalCost > 0 ? (item.value / statistics.totalCost) * 100 : 0;
              return (
                <div key={index} className="distribution-item">
                  <div className="distribution-label">{item.label}</div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{ width: `${percentage}%`, backgroundColor: item.color }}
                    ></div>
                  </div>
                  <div className="distribution-value">
                    ${item.value.toFixed(2)} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (hourlyData.length === 0) {
      return <div className="no-data">時間帯別データがありません</div>;
    }

    return (
      <div className="hourly-table-container">
        <table className="hourly-table">
          <thead>
            <tr>
              <th>時間帯</th>
              <th>時間区分</th>
              <th>総トークン</th>
              <th>入力</th>
              <th>出力</th>
              <th>キャッシュ</th>
              <th>コスト</th>
              <th>リクエスト数</th>
              <th>平均コスト/リクエスト</th>
              <th>セッション数</th>
            </tr>
          </thead>
          <tbody>
            {hourlyData.map((data) => (
              <tr key={data.hour}>
                <td className="hour-cell">{formatHour(data.hour)}</td>
                <td className="time-badge">{getTimeOfDay(data.hour)}</td>
                <td>{formatNumber(data.totalTokens)}</td>
                <td>{formatNumber(data.inputTokens)}</td>
                <td>{formatNumber(data.outputTokens)}</td>
                <td>{formatNumber(data.cachedTokens)}</td>
                <td className="cost-cell">${data.cost.toFixed(4)}</td>
                <td>{data.requests}</td>
                <td>${data.avgCostPerRequest.toFixed(4)}</td>
                <td>{data.sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderHeatmap = () => {
    if (heatmapData.length === 0) {
      return <div className="no-data">ヒートマップデータがありません</div>;
    }

    // 日付のリストを取得
    const dates = Array.from(new Set(heatmapData.map(d => d.date))).sort();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // 最大値を取得（色の正規化用）
    const maxCost = Math.max(...heatmapData.map(d => d.cost));

    // データをマップに変換
    const dataMap = new Map<string, HeatmapData>();
    heatmapData.forEach(d => {
      dataMap.set(`${d.date}-${d.hour}`, d);
    });

    const getHeatmapColor = (cost: number): string => {
      if (cost === 0) return '#f3f4f6';
      const intensity = Math.min(cost / maxCost, 1);
      // 青から赤へのグラデーション
      if (intensity < 0.25) return '#dbeafe';
      if (intensity < 0.5) return '#93c5fd';
      if (intensity < 0.75) return '#fb923c';
      return '#ef4444';
    };

    return (
      <div className="heatmap-container">
        <div className="heatmap-legend">
          <span>低</span>
          <div className="legend-gradient"></div>
          <span>高</span>
        </div>
        <div className="heatmap">
          <div className="heatmap-header">
            <div className="heatmap-corner"></div>
            {hours.map(hour => (
              <div key={hour} className="heatmap-hour-label">
                {hour}
              </div>
            ))}
          </div>
          {dates.map(date => (
            <div key={date} className="heatmap-row">
              <div className="heatmap-date-label">{date}</div>
              {hours.map(hour => {
                const key = `${date}-${hour}`;
                const data = dataMap.get(key);
                const cost = data?.cost || 0;
                const color = getHeatmapColor(cost);

                return (
                  <div
                    key={hour}
                    className="heatmap-cell"
                    style={{ backgroundColor: color }}
                    title={`${date} ${formatHour(hour)}\nコスト: $${cost.toFixed(4)}\nリクエスト: ${data?.requests || 0}`}
                  >
                    {cost > 0 && <span className="heatmap-value">${cost.toFixed(2)}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    if (hourlyData.length === 0) {
      return <div className="no-data">チャートデータがありません</div>;
    }

    const maxCost = Math.max(...hourlyData.map(d => d.cost));
    const maxTokens = Math.max(...hourlyData.map(d => d.totalTokens));

    return (
      <div className="hourly-chart">
        <div className="chart-grid">
          {hourlyData.map((data) => {
            const costHeight = maxCost > 0 ? (data.cost / maxCost) * 100 : 0;
            const tokenHeight = maxTokens > 0 ? (data.totalTokens / maxTokens) * 100 : 0;

            return (
              <div key={data.hour} className="chart-bar-group">
                <div className="chart-bars">
                  <div
                    className="chart-bar cost-bar"
                    style={{ height: `${costHeight}%` }}
                    title={`コスト: $${data.cost.toFixed(4)}`}
                  ></div>
                  <div
                    className="chart-bar token-bar"
                    style={{ height: `${tokenHeight}%` }}
                    title={`トークン: ${formatNumber(data.totalTokens)}`}
                  ></div>
                </div>
                <div className="chart-label">{data.hour}</div>
              </div>
            );
          })}
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color cost-color"></div>
            <span>コスト</span>
          </div>
          <div className="legend-item">
            <div className="legend-color token-color"></div>
            <span>トークン数</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">時間帯別データを読み込んでいます...</div>;
  }

  if (error) {
    return <div className="error">エラー: {error}</div>;
  }

  return (
    <div className="hourly-analysis">
      {renderStatistics()}

      <div className="view-selector">
        <button
          className={activeView === 'table' ? 'active' : ''}
          onClick={() => setActiveView('table')}
        >
          📋 テーブル
        </button>
        <button
          className={activeView === 'heatmap' ? 'active' : ''}
          onClick={() => setActiveView('heatmap')}
        >
          🔥 ヒートマップ
        </button>
        <button
          className={activeView === 'chart' ? 'active' : ''}
          onClick={() => setActiveView('chart')}
        >
          📊 チャート
        </button>
      </div>

      <div className="view-content">
        {activeView === 'table' && renderTable()}
        {activeView === 'heatmap' && renderHeatmap()}
        {activeView === 'chart' && renderChart()}
      </div>
    </div>
  );
};

export default HourlyAnalysis;
