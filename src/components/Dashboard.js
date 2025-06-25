import React from 'react';
import SummaryCard from './SummaryCard';
import UsageChart from './UsageChart';

const Dashboard = ({ usageData, viewMode, setViewMode, formatNumber, formatBytes, formatDate }) => {
  if (!usageData) {
    return <div>データを読み込んでいます...</div>;
  }

  const { summary, dailyUsage, monthlyUsage } = usageData;
  const chartData = viewMode === 'daily' ? dailyUsage : monthlyUsage;

  return (
    <div className="dashboard">
      {/* サマリーセクション */}
      <div className="summary-grid">
        <SummaryCard
          title="MCPセッション"
          value={formatNumber(summary.totalMcpSessions)}
          subtitle="総セッション数"
        />
        <SummaryCard
          title="Todoファイル"
          value={formatNumber(summary.totalTodoFiles)}
          subtitle="管理ファイル数"
        />
        <SummaryCard
          title="VS Codeタスク"
          value={formatNumber(summary.totalVsCodeTasks)}
          subtitle="拡張機能タスク数"
        />
        <SummaryCard
          title="総トークン数"
          value={formatNumber(summary.totalTokens)}
          subtitle="全期間の使用量"
        />
        <SummaryCard
          title="総コスト"
          value={`$${summary.totalCost}`}
          subtitle="全期間の料金"
          className="cost-card"
        />
        <SummaryCard
          title="データサイズ"
          value={formatBytes(summary.totalSize)}
          subtitle="ローカルファイル合計"
        />
      </div>

      {/* ビューモード切り替え */}
      <div className="view-controls">
        <button 
          className={viewMode === 'daily' ? 'active' : ''}
          onClick={() => setViewMode('daily')}
        >
          日別表示
        </button>
        <button 
          className={viewMode === 'monthly' ? 'active' : ''}
          onClick={() => setViewMode('monthly')}
        >
          月別表示
        </button>
      </div>

      {/* 使用量チャート */}
      <UsageChart 
        data={chartData}
        viewMode={viewMode}
        formatNumber={formatNumber}
      />

      {/* 最後のアクティビティ */}
      {summary.lastActivity && (
        <div className="last-activity">
          <p>最後のアクティビティ: {formatDate(summary.lastActivity)}</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;