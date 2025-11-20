import React, { useState, useEffect } from 'react';
import './DailyHourlyDetail.css';

interface HourlyData {
  hour: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  cost: number;
  requests: number;
}

interface DailyHourlyDetailProps {
  date: string;
  onClose: () => void;
  formatNumber: (value: number) => string;
}

const DailyHourlyDetail: React.FC<DailyHourlyDetailProps> = ({ date, onClose, formatNumber }) => {
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHourlyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const fetchHourlyData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/hourly?date=${date}`);
      if (!response.ok) throw new Error('Failed to fetch hourly data');

      const data = await response.json();
      setHourlyData(data.hourlyData || []);
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

  const renderChart = () => {
    if (hourlyData.length === 0) return null;

    const maxCost = Math.max(...hourlyData.map(d => d.cost));
    const maxTokens = Math.max(...hourlyData.map(d => d.totalTokens));

    return (
      <div className="daily-hourly-chart">
        <h4>時間帯別チャート</h4>
        <div className="chart-container-daily">
          <div className="chart-grid-daily">
            {hourlyData.map((data) => {
              const costHeight = maxCost > 0 ? (data.cost / maxCost) * 100 : 0;
              const tokenHeight = maxTokens > 0 ? (data.totalTokens / maxTokens) * 100 : 0;

              return (
                <div key={data.hour} className="chart-bar-group-daily">
                  <div className="chart-bars-daily">
                    <div
                      className="chart-bar-daily cost-bar-daily"
                      style={{ height: `${costHeight}%` }}
                      title={`コスト: $${data.cost.toFixed(4)}`}
                    ></div>
                    <div
                      className="chart-bar-daily token-bar-daily"
                      style={{ height: `${tokenHeight}%` }}
                      title={`トークン: ${formatNumber(data.totalTokens)}`}
                    ></div>
                  </div>
                  <div className="chart-label-daily">{data.hour}</div>
                </div>
              );
            })}
          </div>
          <div className="chart-legend-daily">
            <div className="legend-item-daily">
              <div className="legend-color-daily cost-color-daily"></div>
              <span>コスト</span>
            </div>
            <div className="legend-item-daily">
              <div className="legend-color-daily token-color-daily"></div>
              <span>トークン数</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (hourlyData.length === 0) {
      return <div className="no-data-daily">この日の時間帯別データがありません</div>;
    }

    const totalCost = hourlyData.reduce((sum, d) => sum + d.cost, 0);
    const totalTokens = hourlyData.reduce((sum, d) => sum + d.totalTokens, 0);
    const totalRequests = hourlyData.reduce((sum, d) => sum + d.requests, 0);

    return (
      <div className="daily-hourly-table-section">
        <div className="daily-summary-cards">
          <div className="daily-summary-card">
            <div className="daily-summary-label">総コスト</div>
            <div className="daily-summary-value">${totalCost.toFixed(4)}</div>
          </div>
          <div className="daily-summary-card">
            <div className="daily-summary-label">総トークン</div>
            <div className="daily-summary-value">{formatNumber(totalTokens)}</div>
          </div>
          <div className="daily-summary-card">
            <div className="daily-summary-label">総リクエスト</div>
            <div className="daily-summary-value">{totalRequests}</div>
          </div>
        </div>

        <table className="daily-hourly-table">
          <thead>
            <tr>
              <th>時刻</th>
              <th>時間帯</th>
              <th>総トークン</th>
              <th>入力</th>
              <th>出力</th>
              <th>キャッシュ</th>
              <th>コスト</th>
              <th>リクエスト</th>
            </tr>
          </thead>
          <tbody>
            {hourlyData.map((data) => (
              <tr key={data.hour}>
                <td className="hour-cell-daily">{formatHour(data.hour)}</td>
                <td>
                  <span className="time-badge-daily">{getTimeOfDay(data.hour)}</span>
                </td>
                <td>{formatNumber(data.totalTokens)}</td>
                <td>{formatNumber(data.inputTokens)}</td>
                <td>{formatNumber(data.outputTokens)}</td>
                <td>{formatNumber(data.cachedTokens)}</td>
                <td className="cost-cell-daily">${data.cost.toFixed(4)}</td>
                <td>{data.requests}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="daily-hourly-modal-overlay" onClick={onClose}>
      <div className="daily-hourly-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="daily-hourly-modal-header">
          <h3>📅 {date} の時間帯別使用量</h3>
          <button className="daily-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="daily-hourly-modal-body">
          {loading && <div className="loading-daily">データを読み込んでいます...</div>}
          {error && <div className="error-daily">エラー: {error}</div>}
          {!loading && !error && (
            <>
              {renderChart()}
              {renderTable()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyHourlyDetail;
