import React from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const UsageChart = ({ data, viewMode, formatNumber }) => {
  if (!data || data.length === 0) {
    return <div className="no-data">表示するデータがありません</div>;
  }

  const chartData = data.map(item => ({
    ...item,
    date: viewMode === 'daily' ? item.date : item.month,
    displayDate: viewMode === 'daily' 
      ? new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      : item.month
  }));

  return (
    <div className="chart-container">
      <h3>{viewMode === 'daily' ? '日別使用量' : '月別使用量'}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="displayDate"
            tick={{ fontSize: 12 }}
            interval={viewMode === 'daily' ? 'preserveStartEnd' : 0}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={formatNumber}
          />
          <Tooltip 
            formatter={(value, name) => [formatNumber(value), name]}
            labelFormatter={(label) => `日付: ${label}`}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="totalTokens" 
            stackId="1"
            stroke="#8884d8" 
            fill="#8884d8" 
            name="総トークン数"
          />
          <Line 
            type="monotone" 
            dataKey="cost" 
            stroke="#82ca9d" 
            name="コスト ($)"
            dot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UsageChart;