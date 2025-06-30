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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import './InteractiveChart.css';

const InteractiveChart = ({
  data,
  chartType = 'area',
  viewMode = 'daily',
  formatNumber,
  onDataPointClick,
  title,
  enableExport = true,
  enableDrillDown = true,
  showControls = true
}) => {
  const [hoveredData, setHoveredData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('totalTokens');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  const chartRef = useRef(null);

  const metrics = [
    { key: 'totalTokens', name: '総トークン数', color: '#8884d8' },
    { key: 'inputTokens', name: '入力トークン', color: '#82ca9d' },
    { key: 'outputTokens', name: '出力トークン', color: '#ffc658' },
    { key: 'cost', name: 'コスト ($)', color: '#ff7300' },
    { key: 'sessions', name: 'セッション数', color: '#00c49f' }
  ];

  const chartData = data?.map(item => ({
    ...item,
    date: viewMode === 'daily' ? item.date : item.month,
    displayDate: viewMode === 'daily' 
      ? format(parseISO(item.date), 'M/d', { locale: ja })
      : item.month,
    formattedDate: viewMode === 'daily'
      ? format(parseISO(item.date), 'yyyy年M月d日', { locale: ja })
      : `${item.month.replace('-', '年')}月`
  })) || [];

  const handleDataPointClick = useCallback((data, index) => {
    if (enableDrillDown) {
      setSelectedDataPoint({ ...data, index });
      setShowDetailModal(true);
      onDataPointClick?.(data);
    }
  }, [enableDrillDown, onDataPointClick]);

  const handleMouseEnter = useCallback((data) => {
    setHoveredData(data);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredData(null);
  }, []);

  const exportChart = useCallback(async (format) => {
    if (!chartRef.current) return;

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `chart-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } else if (format === 'pdf') {
        const pdf = new jsPDF('landscape');
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 280;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`chart-${Date.now()}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    }
  }, []);

  const customTooltip = ({ active, payload, label }) => {
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
      data: chartData,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: handleDataPointClick
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
            <Tooltip content={customTooltip} />
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
            <Tooltip content={customTooltip} />
            <Legend />
            {metrics.map(metric => (
              <Bar
                key={metric.key}
                dataKey={metric.key}
                fill={metric.color}
                name={metric.name}
                opacity={selectedMetric === metric.key ? 1 : 0.7}
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
            <Tooltip content={customTooltip} />
            <Legend />
            <Scatter 
              dataKey="totalTokens"
              fill="#8884d8"
              name="総トークン数"
            />
          </ScatterChart>
        );

      case 'pie':
        const pieData = chartData.slice(-5).map((item, index) => ({
          name: item.displayDate,
          value: item[selectedMetric],
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
              onClick={handleDataPointClick}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
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
            <Tooltip content={customTooltip} />
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
            {enableExport && (
              <div className="export-buttons">
                <button onClick={() => exportChart('png')} className="export-btn">
                  PNG出力
                </button>
                <button onClick={() => exportChart('pdf')} className="export-btn">
                  PDF出力
                </button>
              </div>
            )}
          </div>
          
          <div className="chart-options">
            <div className="chart-type-selector">
              <label>チャート種類:</label>
              <select 
                value={chartType} 
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                <option value="area">エリアチャート</option>
                <option value="line">ラインチャート</option>
                <option value="bar">バーチャート</option>
                <option value="scatter">散布図</option>
                <option value="pie">円グラフ</option>
              </select>
            </div>
            
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