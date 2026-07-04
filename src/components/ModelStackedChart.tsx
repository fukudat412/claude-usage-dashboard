import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './ModelStackedChart.css';

// dataviz手法で検証済みのカテゴリカルパレット（固定順で割り当て、循環させない）
const MODEL_COLORS = ['#667eea', '#f59e0b', '#14b8a6', '#f43f5e', '#a855f7', '#a16207'];

interface ModelsDailyResponse {
  models: string[];
  data: Array<Record<string, string | number>>;
}

// "claude-opus-4-8" -> "opus-4-8" 表示を短く
const shortModelName = (model: string): string => model.replace(/^claude-/, '');

const ModelStackedChart: React.FC = () => {
  const [payload, setPayload] = useState<ModelsDailyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v2/models/daily');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setPayload(data);
      } catch (e) {
        if (!cancelled) setError(`データの取得に失敗しました: ${e instanceof Error ? e.message : e}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="model-chart-error">{error}</div>;
  if (!payload) return <div className="model-chart-loading">チャートを読み込んでいます...</div>;
  if (payload.data.length === 0) return null;

  const tooltipFormatter = (value: number | string, name: string): [string, string] => [
    `$${Number(value).toFixed(2)}`,
    shortModelName(String(name)),
  ];

  return (
    <div className="model-stacked-chart">
      <h3>モデル別コストの推移（日別・積み上げ）</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={payload.data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(value: number) => `$${value}`}
            width={56}
          />
          <Tooltip formatter={tooltipFormatter} />
          <Legend
            formatter={(value: string) => (
              <span style={{ color: '#555' }}>{shortModelName(value)}</span>
            )}
          />
          {payload.models.map((model, index) => (
            <Bar
              key={model}
              dataKey={model}
              stackId="cost"
              fill={MODEL_COLORS[index % MODEL_COLORS.length]}
              stroke="#ffffff"
              strokeWidth={1}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ModelStackedChart;
