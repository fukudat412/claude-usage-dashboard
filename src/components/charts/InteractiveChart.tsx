import React, { useState, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChartDataPoint } from '../../types';
import './InteractiveChart.css';

interface ProcessedDataPoint extends ChartDataPoint {
  displayDate: string;
  formattedDate: string;
}

interface Metric {
  key: string;
  name: string;
  color: string;
}

interface PieDataEntry {
  name: string;
  value: number;
  color: string;
}

interface InteractiveChartProps {
  data: ChartDataPoint[];
  chartType?: 'area' | 'line' | 'bar' | 'scatter' | 'pie';
  viewMode?: 'daily' | 'monthly';
  formatNumber: (value: number) => string;
  onDataPointClick?: (data: any) => void;
  title?: string;
  enableDrillDown?: boolean;
  showControls?: boolean;
}

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface SelectedDataPoint extends ProcessedDataPoint {
  index: number;
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  chartType = 'area',
  viewMode = 'daily',
  formatNumber,
  onDataPointClick,
  title,
  enableDrillDown = true,
  showControls = true
}) => {
  const [hoveredData, setHoveredData] = useState<ProcessedDataPoint | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('totalTokens');
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<SelectedDataPoint | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const metrics: Metric[] = [
    { key: 'totalTokens', name: '総トークン数', color: '#8884d8' },
    { key: 'inputTokens', name: '入力トークン', color: '#82ca9d' },
    { key: 'outputTokens', name: '出力トークン', color: '#ffc658' },
    { key: 'cost', name: 'コスト ($)', color: '#ff7300' },
    { key: 'sessions', name: 'セッション数', color: '#00c49f' }
  ];

  const chartData: ProcessedDataPoint[] = data?.map(item => ({
    ...item,
    date: viewMode === 'daily' ? item.date : item.month || item.date,
    displayDate: viewMode === 'daily' 
      ? format(parseISO(item.date), 'M/d', { locale: ja })
      : item.month || item.date,
    formattedDate: viewMode === 'daily'
      ? format(parseISO(item.date), 'yyyy年M月d日', { locale: ja })
      : `${(item.month || item.date).replace('-', '年')}月`
  })) || [];

  const handleDataPointClick = useCallback((data: ProcessedDataPoint, index?: number) => {
    if (enableDrillDown) {
      setSelectedDataPoint({ ...data, index: index || 0 });
      setShowDetailModal(true);
      onDataPointClick?.(data);
    }
  }, [enableDrillDown, onDataPointClick]);

  const handleMouseEnter = useCallback((data: ProcessedDataPoint) => {
    setHoveredData(data);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredData(null);
  }, []);


  const customTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="custom-tooltip">
        <h4>{label}</h4>
        {payload.map((entry, index) => (
          <div key={index} className="tooltip-item">
            <span 
              className="color-indicator" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="metric-name">{entry.name}:</span>
            <span className="metric-value">
              {entry.name.includes('コスト') 
                ? `$${Number(entry.value).toFixed(2)}`
                : formatNumber(entry.value)
              }
            </span>
          </div>
        ))}
        {enableDrillDown && (
          <div className="drill-down-hint">
            クリックで詳細を表示
          </div>
        )}
      </div>
    );
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={formatNumber}
            />
            <Tooltip 
              content={customTooltip}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Legend />
            {metrics.map(metric => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                stroke={metric.color}
                strokeWidth={selectedMetric === metric.key ? 3 : 2}
                dot={{ r: selectedMetric === metric.key ? 5 : 3 }}
                name={metric.name}
                connectNulls={false}
                onClick={(data: any) => handleDataPointClick(data.payload)}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={formatNumber}
            />
            <Tooltip 
              content={customTooltip}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Legend />
            {metrics.map(metric => (
              <Bar
                key={metric.key}
                dataKey={metric.key}
                fill={metric.color}
                name={metric.name}
                opacity={selectedMetric === metric.key ? 1 : 0.7}
                onClick={(data: any) => handleDataPointClick(data.payload)}
              />
            ))}
          </BarChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number"
              dataKey="inputTokens"
              name="入力トークン"
              tick={{ fontSize: 12 }}
              tickFormatter={formatNumber}
            />
            <YAxis 
              type="number"
              dataKey="outputTokens"
              name="出力トークン"
              tick={{ fontSize: 12 }}
              tickFormatter={formatNumber}
            />
            <Tooltip 
              content={customTooltip}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Legend />
            <Scatter 
              dataKey="totalTokens"
              fill="#8884d8"
              name="総トークン数"
              onClick={(data: any) => handleDataPointClick(data.payload)}
            />
          </ScatterChart>
        );

      case 'pie':
        const pieData: PieDataEntry[] = chartData.slice(-5).map((item, index) => ({
          name: item.displayDate,
          value: item[selectedMetric as keyof ProcessedDataPoint] as number,
          color: `hsl(${index * 72}, 70%, 50%)`
        }));

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={120}
              dataKey="value"
              onClick={(data: any) => handleDataPointClick(data.payload)}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              content={customTooltip}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Legend />
          </PieChart>
        );

      default: // area
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={formatNumber}
            />
            <Tooltip 
              content={customTooltip}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Legend />
            {metrics.map((metric, index) => (
              <Area
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                stackId={selectedMetric === metric.key ? "1" : "2"}
                stroke={metric.color}
                fill={metric.color}
                fillOpacity={selectedMetric === metric.key ? 0.8 : 0.3}
                name={metric.name}
                onClick={(data: any) => handleDataPointClick(data.payload)}
              />
            ))}
          </AreaChart>
        );
    }
  };

  if (!data || data.length === 0) {
    return <div className="no-data">表示するデータがありません</div>;
  }

  return (
    <div className="interactive-chart" ref={chartRef}>
      {showControls && (
        <div className="chart-controls">
          <div className="chart-header">
            <h3>{title || `${viewMode === 'daily' ? '日別' : '月別'}使用量`}</h3>
          </div>
          
          <div className="chart-options">
            <div className="metric-selector">
              <label>メトリック:</label>
              <select 
                value={selectedMetric} 
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                {metrics.map(metric => (
                  <option key={metric.key} value={metric.key}>
                    {metric.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={450}>
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {hoveredData && (
        <div className="hover-info">
          <h4>{hoveredData.formattedDate}</h4>
          <p>総トークン: {formatNumber(hoveredData.totalTokens)}</p>
          <p>コスト: ${Number(hoveredData.cost || 0).toFixed(2)}</p>
        </div>
      )}

      {showDetailModal && selectedDataPoint && (
        <div className="detail-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDataPoint.formattedDate} - 詳細データ</h3>
              <button 
                className="close-button"
                onClick={() => setShowDetailModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">総トークン数:</span>
                  <span className="value">{formatNumber(selectedDataPoint.totalTokens)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">入力トークン:</span>
                  <span className="value">{formatNumber(selectedDataPoint.inputTokens)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">出力トークン:</span>
                  <span className="value">{formatNumber(selectedDataPoint.outputTokens)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">キャッシュトークン:</span>
                  <span className="value">{formatNumber(selectedDataPoint.cachedTokens || 0)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">コスト:</span>
                  <span className="value">${Number(selectedDataPoint.cost || 0).toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">セッション数:</span>
                  <span className="value">{selectedDataPoint.sessions || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveChart;