import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1'];

interface Tool {
  name: string;
  count: number;
  sessionCount: number;
  firstUsed: string;
  lastUsed: string;
}

interface Session {
  startTime: string;
  tools: Record<string, number>;
  cwd: string;
}

interface McpToolUsageData {
  totalCalls: number;
  uniqueTools: number;
  tools: Tool[];
  sessions: Session[];
}

interface McpToolUsageProps {
  mcpToolUsage: McpToolUsageData | null;
}

interface TopToolData {
  name: string;
  使用回数: number;
  セッション数: number;
}

interface PieDataEntry {
  name: string;
  value: number;
}

const McpToolUsage: React.FC<McpToolUsageProps> = ({ mcpToolUsage }) => {
  if (!mcpToolUsage || !mcpToolUsage.tools) {
    return <div className="mcp-tool-usage">MCPツール使用データがありません</div>;
  }

  const { totalCalls, uniqueTools, tools, sessions } = mcpToolUsage;

  // 上位10ツールのデータ準備
  const topTools: TopToolData[] = tools.slice(0, 10).map(tool => ({
    name: tool.name,
    使用回数: tool.count,
    セッション数: tool.sessionCount
  }));

  // 円グラフ用データ（上位5ツール + その他）
  const pieData: PieDataEntry[] = tools.slice(0, 5).map(tool => ({
    name: tool.name,
    value: tool.count
  }));
  
  if (tools.length > 5) {
    const othersCount = tools.slice(5).reduce((sum, tool) => sum + tool.count, 0);
    pieData.push({ name: 'その他', value: othersCount });
  }

  return (
    <div className="mcp-tool-usage">
      <h2>MCPツール使用統計</h2>
      
      {/* サマリー統計 */}
      <div className="mcp-summary">
        <div className="stat-box">
          <div className="stat-value">{totalCalls.toLocaleString()}</div>
          <div className="stat-label">総呼び出し回数</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{uniqueTools}</div>
          <div className="stat-label">使用ツール種類</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">総セッション数</div>
        </div>
      </div>

      {/* ツール使用頻度チャート */}
      <div className="chart-section">
        <h3>ツール別使用頻度（上位10ツール）</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topTools} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="使用回数" fill="#8884d8" />
            <Bar dataKey="セッション数" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 使用比率円グラフ */}
      <div className="chart-section">
        <h3>ツール使用比率</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>


      {/* 詳細テーブル */}
      <div className="tool-details">
        <h3>ツール使用詳細</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>ツール名</th>
              <th>使用回数</th>
              <th>セッション数</th>
              <th>初回使用</th>
              <th>最終使用</th>
            </tr>
          </thead>
          <tbody>
            {tools.slice(0, 20).map((tool, index) => (
              <tr key={index}>
                <td>{tool.name}</td>
                <td>{tool.count.toLocaleString()}</td>
                <td>{tool.sessionCount}</td>
                <td>{new Date(tool.firstUsed).toLocaleDateString('ja-JP')}</td>
                <td>{new Date(tool.lastUsed).toLocaleDateString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default McpToolUsage;