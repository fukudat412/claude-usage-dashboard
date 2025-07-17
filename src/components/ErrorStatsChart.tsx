import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { ErrorStats } from '../types';
import './ErrorStatsChart.css';

interface ErrorStatsChartProps {
  stats: ErrorStats;
  loading?: boolean;
}

const ErrorStatsChart: React.FC<ErrorStatsChartProps> = ({ stats, loading }) => {
  const [activeChart, setActiveChart] = useState<'timeline' | 'level' | 'source' | 'top'>('timeline');

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const COLORS = {
    CRITICAL: '#f44336',
    ERROR: '#ff9800',
    WARNING: '#ffc107',
    INFO: '#2196f3'
  };

  const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00c0ef'];

  const timelineData = stats.errorsByTime.map(item => ({
    timestamp: item.timestamp,
    count: item.count,
    time: formatDate(item.timestamp)
  }));

  const levelData = Object.entries(stats.errorsByLevel).map(([level, count]) => ({
    level,
    count,
    color: COLORS[level as keyof typeof COLORS] || '#999'
  }));

  const sourceData = Object.entries(stats.errorsBySource).map(([source, count]) => ({
    source,
    count
  }));

  const topErrorsData = stats.topErrors.map(error => ({
    code: error.code,
    count: error.count,
    message: error.message.length > 30 ? `${error.message.substring(0, 30)}...` : error.message
  }));

  const renderTimelineChart = () => (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={timelineData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#2196f3" 
            strokeWidth={2}
            dot={{ fill: '#2196f3' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderLevelChart = () => (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={levelData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            label={({ level, count }) => `${level}: ${count}`}
          >
            {levelData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const renderSourceChart = () => (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sourceData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="source" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderTopErrorsChart = () => (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topErrorsData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="code" />
          <YAxis />
          <Tooltip 
            formatter={(value, name, props) => [
              value,
              '件数'
            ]}
            labelFormatter={(label) => `コード: ${label}`}
          />
          <Bar dataKey="count" fill="#ff7300" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderSummaryCards = () => (
    <div className="summary-cards">
      <div className="summary-card">
        <h4>総エラー数</h4>
        <span className="value">{stats.totalErrors}</span>
      </div>
      <div className="summary-card">
        <h4>重要度別</h4>
        <div className="level-breakdown">
          {Object.entries(stats.errorsByLevel).map(([level, count]) => (
            <div key={level} className="level-item">
              <span 
                className="level-indicator"
                style={{ backgroundColor: COLORS[level as keyof typeof COLORS] }}
              />
              <span className="level-name">{level}</span>
              <span className="level-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="error-stats-chart-loading">
        <div className="loading-spinner">統計情報を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="error-stats-chart">
      {renderSummaryCards()}
      
      <div className="chart-tabs">
        <button
          className={`tab ${activeChart === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveChart('timeline')}
        >
          時系列
        </button>
        <button
          className={`tab ${activeChart === 'level' ? 'active' : ''}`}
          onClick={() => setActiveChart('level')}
        >
          重要度別
        </button>
        <button
          className={`tab ${activeChart === 'source' ? 'active' : ''}`}
          onClick={() => setActiveChart('source')}
        >
          発生源別
        </button>
        <button
          className={`tab ${activeChart === 'top' ? 'active' : ''}`}
          onClick={() => setActiveChart('top')}
        >
          TOP エラー
        </button>
      </div>

      <div className="chart-content">
        {activeChart === 'timeline' && renderTimelineChart()}
        {activeChart === 'level' && renderLevelChart()}
        {activeChart === 'source' && renderSourceChart()}
        {activeChart === 'top' && renderTopErrorsChart()}
      </div>
    </div>
  );
};

export default ErrorStatsChart;