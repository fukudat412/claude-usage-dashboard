import React, { useState } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import DataTable, { TableColumn } from './components/DataTable';
import LogViewer from './components/LogViewer';
import McpToolUsage from './components/McpToolUsage';
import useUsageData from './hooks/useUsageData';
import { formatBytes, formatDate, formatNumber } from './utils/formatters';
import { McpLogEntry } from './types';

type TabType = 'summary' | 'usage' | 'projects' | 'logs';
type ViewMode = 'daily' | 'monthly';
type UsageSubTab = 'daily' | 'monthly' | 'models';
type ProjectsSubTab = 'projects' | 'vscode' | 'todos';
type LogsSubTab = 'mcp' | 'mcpTools';

const App: React.FC = () => {
  const { usageData, loading, error, refetch } = useUsageData();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [selectedLog, setSelectedLog] = useState<McpLogEntry | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [usageSubTab, setUsageSubTab] = useState<UsageSubTab>('daily');
  const [projectsSubTab, setProjectsSubTab] = useState<ProjectsSubTab>('projects');
  const [logsSubTab, setLogsSubTab] = useState<LogsSubTab>('mcp');

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <h2>Claude Code 使用量ダッシュボード</h2>
          <p>データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div className="error">
          <h2>Claude Code 使用量ダッシュボード</h2>
          <p>エラーが発生しました: {error}</p>
          <button onClick={refetch}>再試行</button>
        </div>
      </div>
    );
  }

  // テーブル列定義
  const mcpColumns: TableColumn[] = [
    { key: 'file', title: 'ファイル名', type: 'text' },
    { key: 'size', title: 'サイズ', type: 'bytes' },
    { key: 'entries', title: 'エントリ数', type: 'number' },
    { key: 'timestamp', title: '更新日時', type: 'date' },
    { key: 'sessionId', title: 'セッションID', type: 'text' }
  ];

  const todoColumns: TableColumn[] = [
    { key: 'file', title: 'ファイル名', type: 'text' },
    { key: 'size', title: 'サイズ', type: 'bytes' },
    { key: 'taskCount', title: 'タスク数', type: 'number' },
    { key: 'timestamp', title: '更新日時', type: 'date' }
  ];

  const vscodeColumns: TableColumn[] = [
    { key: 'taskId', title: 'タスクID', type: 'text' },
    { key: 'messageCount', title: 'メッセージ数', type: 'number' },
    { key: 'conversationCount', title: '会話数', type: 'number' },
    { key: 'timestamp', title: '更新日時', type: 'date' }
  ];

  const dailyColumns: TableColumn[] = [
    { key: 'date', title: '日付', type: 'text' },
    { key: 'totalTokens', title: '総トークン数', type: 'number' },
    { key: 'inputTokens', title: '入力トークン', type: 'number' },
    { key: 'outputTokens', title: '出力トークン', type: 'number' },
    { key: 'cachedTokens', title: 'キャッシュトークン', type: 'number' },
    { key: 'cost', title: 'コスト', type: 'currency' },
    { key: 'sessions', title: 'セッション数', type: 'number' }
  ];

  const monthlyColumns: TableColumn[] = [
    { key: 'month', title: '月', type: 'text' },
    { key: 'totalTokens', title: '総トークン数', type: 'number' },
    { key: 'inputTokens', title: '入力トークン', type: 'number' },
    { key: 'outputTokens', title: '出力トークン', type: 'number' },
    { key: 'cachedTokens', title: 'キャッシュトークン', type: 'number' },
    { key: 'cost', title: 'コスト', type: 'currency' },
    { key: 'sessions', title: 'セッション数', type: 'number' },
    { key: 'messages', title: 'メッセージ数', type: 'number' }
  ];

  const modelColumns: TableColumn[] = [
    { key: 'model', title: 'モデル', type: 'text' },
    { key: 'totalTokens', title: '総トークン数', type: 'number' },
    { key: 'inputTokens', title: '入力トークン', type: 'number' },
    { key: 'outputTokens', title: '出力トークン', type: 'number' },
    { key: 'cachedTokens', title: 'キャッシュトークン', type: 'number' },
    { key: 'cost', title: 'コスト', type: 'currency' },
    { key: 'sessions', title: 'セッション数', type: 'number' },
    { key: 'messages', title: 'メッセージ数', type: 'number' }
  ];

  const projectColumns: TableColumn[] = [
    { key: 'name', title: 'プロジェクト名', type: 'text' },
    { key: 'totalTokens', title: '総トークン数', type: 'number' },
    { key: 'totalCost', title: '総コスト', type: 'currency' },
    { key: 'messageCount', title: 'メッセージ数', type: 'number' },
    { key: 'lastActivity', title: '最終アクティビティ', type: 'date' }
  ];

  const handleLogClick = (row: Record<string, any>): void => {
    setSelectedLog(row as McpLogEntry);
  };

  const closeLogViewer = (): void => {
    setSelectedLog(null);
  };

  const renderUsageSubTabs = (): React.ReactNode => {
    return (
      <div className="sub-tabs">
        <button 
          className={usageSubTab === 'daily' ? 'active' : ''}
          onClick={() => setUsageSubTab('daily')}
        >
          日別使用量
        </button>
        <button 
          className={usageSubTab === 'monthly' ? 'active' : ''}
          onClick={() => setUsageSubTab('monthly')}
        >
          月別使用量
        </button>
        <button 
          className={usageSubTab === 'models' ? 'active' : ''}
          onClick={() => setUsageSubTab('models')}
        >
          モデル別使用量
        </button>
      </div>
    );
  };

  const renderProjectsSubTabs = (): React.ReactNode => {
    return (
      <div className="sub-tabs">
        <button 
          className={projectsSubTab === 'projects' ? 'active' : ''}
          onClick={() => setProjectsSubTab('projects')}
        >
          プロジェクト別
        </button>
        <button 
          className={projectsSubTab === 'vscode' ? 'active' : ''}
          onClick={() => setProjectsSubTab('vscode')}
        >
          VS Code拡張
        </button>
        <button 
          className={projectsSubTab === 'todos' ? 'active' : ''}
          onClick={() => setProjectsSubTab('todos')}
        >
          Todo履歴
        </button>
      </div>
    );
  };

  const renderLogsSubTabs = (): React.ReactNode => {
    return (
      <div className="sub-tabs">
        <button 
          className={logsSubTab === 'mcp' ? 'active' : ''}
          onClick={() => setLogsSubTab('mcp')}
        >
          MCPログ
        </button>
        <button 
          className={logsSubTab === 'mcpTools' ? 'active' : ''}
          onClick={() => setLogsSubTab('mcpTools')}
        >
          MCPツール使用状況
        </button>
      </div>
    );
  };

  const renderTabContent = (): React.ReactNode => {
    if (!usageData) return null;

    switch (activeTab) {
      case 'summary':
        return (
          <div className="tab-content has-sub-tabs" style={{ padding: '2rem' }}>
            <Dashboard
              usageData={usageData}
              viewMode={viewMode}
              setViewMode={setViewMode}
              formatNumber={formatNumber}
              formatBytes={formatBytes}
              formatDate={formatDate}
            />
          </div>
        );

      case 'usage':
        return (
          <div className="tab-content">
            {renderUsageSubTabs()}
            {usageSubTab === 'daily' && (
              <div className="sub-content">
                <h2>日別使用量</h2>
                <DataTable
                  data={usageData.daily || []}
                  columns={dailyColumns}
                  onRowClick={() => {}}
                  formatDate={formatDate}
                  formatBytes={formatBytes}
                  formatNumber={formatNumber}
                />
              </div>
            )}
            {usageSubTab === 'monthly' && (
              <div className="sub-content">
                <h2>月別使用量</h2>
                <DataTable
                  data={usageData.monthly || []}
                  columns={monthlyColumns}
                  onRowClick={() => {}}
                  formatDate={formatDate}
                  formatBytes={formatBytes}
                  formatNumber={formatNumber}
                />
              </div>
            )}
            {usageSubTab === 'models' && (
              <div className="sub-content">
                <h2>モデル別使用量</h2>
                <DataTable
                  data={(usageData as any).modelUsage || []}
                  columns={modelColumns}
                  onRowClick={() => {}}
                  formatDate={formatDate}
                  formatBytes={formatBytes}
                  formatNumber={formatNumber}
                />
              </div>
            )}
          </div>
        );

      case 'projects':
        return (
          <div className="tab-content">
            {renderProjectsSubTabs()}
            {projectsSubTab === 'projects' && (
              <div className="sub-content">
                <h2>プロジェクト別使用量</h2>
                <DataTable
                  data={(usageData as any).projects || []}
                  columns={projectColumns}
                  onRowClick={() => {}}
                  formatDate={formatDate}
                  formatBytes={formatBytes}
                  formatNumber={formatNumber}
                />
              </div>
            )}
            {projectsSubTab === 'vscode' && (
              <div className="sub-content">
                <h2>VS Code拡張</h2>
                <DataTable
                  data={usageData.vsCodeLogs || []}
                  columns={vscodeColumns}
                  onRowClick={() => {}}
                  formatDate={formatDate}
                  formatBytes={formatBytes}
                  formatNumber={formatNumber}
                />
              </div>
            )}
            {projectsSubTab === 'todos' && (
              <div className="sub-content">
                <h2>Todo履歴</h2>
                <DataTable
                  data={usageData.todos || []}
                  columns={todoColumns}
                  onRowClick={handleLogClick}
                  formatDate={formatDate}
                  formatBytes={formatBytes}
                  formatNumber={formatNumber}
                />
              </div>
            )}
          </div>
        );

      case 'logs':
        return (
          <div className="tab-content">
            {renderLogsSubTabs()}
            {logsSubTab === 'mcp' && (
              <div className="sub-content">
                <h2>MCPログ</h2>
                <DataTable
                  data={usageData.mcpLogs || []}
                  columns={mcpColumns}
                  onRowClick={handleLogClick}
                  formatDate={formatDate}
                  formatBytes={formatBytes}
                  formatNumber={formatNumber}
                />
              </div>
            )}
            {logsSubTab === 'mcpTools' && (
              <div className="sub-content">
                <McpToolUsage mcpToolUsage={(usageData as any).mcpToolUsage} />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Claude Code 使用量ダッシュボード</h1>
        <button onClick={refetch} className="refresh-button">
          データを更新
        </button>
      </header>

      <nav className="tab-nav">
        <button 
          className={activeTab === 'summary' ? 'active' : ''}
          onClick={() => setActiveTab('summary')}
        >
          サマリー
        </button>
        <button 
          className={activeTab === 'usage' ? 'active' : ''}
          onClick={() => setActiveTab('usage')}
        >
          使用量分析
        </button>
        <button 
          className={activeTab === 'projects' ? 'active' : ''}
          onClick={() => setActiveTab('projects')}
        >
          プロジェクト管理
        </button>
        <button 
          className={activeTab === 'logs' ? 'active' : ''}
          onClick={() => setActiveTab('logs')}
        >
          ログ・ツール
        </button>
      </nav>

      <main className="main-content">
        {renderTabContent()}
      </main>

      {selectedLog && (
        <LogViewer
          selectedLog={selectedLog}
          onClose={closeLogViewer}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

export default App;