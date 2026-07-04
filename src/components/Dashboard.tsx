import React from 'react';
import SummaryCard from './SummaryCard';
import { formatCompactNumber } from '../utils/formatters';
import BudgetBar from './BudgetBar';
import UsageChart from './UsageChart';
import { UsageData } from '../types';

interface DashboardProps {
  usageData: UsageData | null;
  viewMode: 'daily' | 'monthly';
  setViewMode: (mode: 'daily' | 'monthly') => void;
  formatNumber: (value: number) => string;
  formatBytes: (bytes: number) => string;
  formatDate: (date: string | Date) => string;
}

interface Summary {
  totalMcpSessions: number;
  totalTodoFiles: number;
  totalVsCodeTasks: number;
  totalTokens: number;
  totalCost: string | number;
  totalSize: number;
  totalMessages: number;
  totalConversations: number;
  lastActivity: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  usageData, 
  viewMode, 
  setViewMode, 
  formatNumber, 
  formatBytes, 
  formatDate 
}) => {
  if (!usageData) {
    return <div>データを読み込んでいます...</div>;
  }

  const { summary, dailyUsage, monthlyUsage } = usageData;
  const chartData = viewMode === 'daily' ? dailyUsage : monthlyUsage;
  const typedSummary = summary as Summary;

  // 今月のコスト（ローカルタイムの YYYY-MM でマッチ）
  const currentMonth = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const currentMonthEntry = (monthlyUsage as any[])?.find(
    (entry) => entry.month === currentMonth
  );
  const currentMonthCost = Number(currentMonthEntry?.cost || 0);

  return (
    <div className="dashboard">
      {/* 月次予算 */}
      <BudgetBar currentMonthCost={currentMonthCost} month={currentMonth} />

      {/* サマリーセクション */}
      <div className="summary-grid">
        <SummaryCard
          title="総コスト"
          value={`$${typedSummary.totalCost}`}
          subtitle="全期間の料金"
        />
        <SummaryCard
          title="総トークン数"
          value={formatCompactNumber(typedSummary.totalTokens)}
          subtitle="全期間の使用量"
          tooltip={`${formatNumber(typedSummary.totalTokens)} tokens`}
        />
        <SummaryCard
          title="メッセージ数"
          value={formatNumber(typedSummary.totalMessages)}
          subtitle="送受信メッセージ"
        />
        <SummaryCard
          title="会話数"
          value={formatNumber(typedSummary.totalConversations)}
          subtitle="対話セッション数"
        />
        <SummaryCard
          title="VS Codeタスク"
          value={formatNumber(typedSummary.totalVsCodeTasks)}
          subtitle="拡張機能タスク数"
        />
        <SummaryCard
          title="MCPセッション"
          value={formatNumber(typedSummary.totalMcpSessions)}
          subtitle="総セッション数"
        />
        <SummaryCard
          title="Todoファイル"
          value={formatNumber(typedSummary.totalTodoFiles)}
          subtitle="管理ファイル数"
        />
        <SummaryCard
          title="データサイズ"
          value={formatBytes(typedSummary.totalSize)}
          subtitle="ログファイル容量"
        />
      </div>

      {/* ビューモード切り替え */}
      <div className="view-mode-controls">
        <h3>使用量推移</h3>
        <div className="view-toggle">
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
      </div>

      {/* チャートセクション */}
      <div className="chart-section">
        <UsageChart 
          data={chartData || []}
          viewMode={viewMode}
          formatNumber={formatNumber}
          enableFilters={true}
        />
      </div>

      {/* 最終活動時刻 */}
      {typedSummary.lastActivity && (
        <div className="last-activity">
          <p>最終更新: {formatDate(typedSummary.lastActivity)}</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;