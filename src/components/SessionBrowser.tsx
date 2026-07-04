import React, { useState, useEffect, useCallback } from 'react';
import DataTable, { TableColumn } from './DataTable';
import { formatNumber, formatDate } from '../utils/formatters';
import './SessionBrowser.css';

interface ProjectOption {
  name: string;
  fullName: string;
}

interface SessionSummary {
  sessionId: string;
  title: string | null;
  firstUserText: string | null;
  startTime: string | null;
  endTime: string | null;
  userMessages: number;
  assistantMessages: number;
  totalTokens: number;
  models: string[];
}

interface SessionMessage {
  role: 'user' | 'assistant';
  text: string;
  tools?: string[];
  timestamp: string | null;
}

interface SessionBrowserProps {
  projects: ProjectOption[];
}

const sessionColumns: TableColumn[] = [
  { key: 'displayTitle', title: 'タイトル', type: 'text' },
  { key: 'endTime', title: '最終更新', type: 'date' },
  { key: 'userMessages', title: 'ユーザー発言', type: 'number' },
  { key: 'assistantMessages', title: '応答数', type: 'number' },
  { key: 'totalTokens', title: 'トークン', type: 'number' },
];

const SessionBrowser: React.FC<SessionBrowserProps> = ({ projects }) => {
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.fullName || '');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<SessionSummary | null>(null);
  const [messages, setMessages] = useState<SessionMessage[] | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  const loadSessions = useCallback(async (project: string) => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/sessions?project=${encodeURIComponent(project)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e) {
      setError(`セッション一覧の取得に失敗しました: ${e instanceof Error ? e.message : e}`);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions(selectedProject);
  }, [selectedProject, loadSessions]);

  const openSession = async (row: Record<string, any>): Promise<void> => {
    const session = row as unknown as SessionSummary;
    setActiveSession(session);
    setMessages(null);
    setContentLoading(true);
    try {
      const res = await fetch(
        `/api/v2/sessions/content?project=${encodeURIComponent(selectedProject)}&session=${encodeURIComponent(session.sessionId)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setContentLoading(false);
    }
  };

  const tableRows = sessions.map((session) => ({
    ...session,
    id: session.sessionId,
    displayTitle: session.title || session.firstUserText || session.sessionId,
  }));

  return (
    <div className="session-browser">
      <div className="session-controls">
        <label htmlFor="session-project">プロジェクト:</label>
        <select
          id="session-project"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          {projects.map((project) => (
            <option key={project.fullName} value={project.fullName}>
              {project.name}
            </option>
          ))}
        </select>
        {loading && <span className="session-loading">読み込み中...</span>}
      </div>

      {error && <div className="session-error">{error}</div>}

      {!loading && !error && (
        <DataTable
          data={tableRows}
          columns={sessionColumns}
          onRowClick={openSession}
          formatDate={formatDate}
          formatBytes={() => ''}
          formatNumber={formatNumber}
        />
      )}

      {activeSession && (
        <div className="session-modal-overlay" onClick={() => setActiveSession(null)}>
          <div className="session-modal" onClick={(e) => e.stopPropagation()}>
            <div className="session-modal-header">
              <div>
                <h3>{activeSession.title || activeSession.firstUserText || 'セッション'}</h3>
                <span className="session-meta">
                  {activeSession.sessionId}
                  {activeSession.startTime && ` ・ ${formatDate(activeSession.startTime)} 開始`}
                </span>
              </div>
              <button className="close-button" onClick={() => setActiveSession(null)}>×</button>
            </div>
            <div className="session-modal-body">
              {contentLoading && <p className="session-loading">会話を読み込んでいます...</p>}
              {!contentLoading && messages && messages.length === 0 && (
                <p className="session-loading">表示できる会話がありません</p>
              )}
              {!contentLoading && messages && messages.map((message, index) => (
                <div key={index} className={`chat-message ${message.role}`}>
                  <div className="chat-bubble">
                    {message.text && <div className="chat-text">{message.text}</div>}
                    {message.tools && message.tools.length > 0 && (
                      <div className="chat-tools">
                        {[...new Set(message.tools)].map((tool) => (
                          <span key={tool} className="tool-chip">{tool}</span>
                        ))}
                      </div>
                    )}
                    {message.timestamp && (
                      <div className="chat-time">{formatDate(message.timestamp)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionBrowser;
