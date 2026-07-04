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

interface SearchSnippet {
  role: string;
  snippet: string;
  timestamp: string | null;
}

interface SearchResult {
  project: string;
  sessionId: string;
  title: string | null;
  endTime: string | null;
  matchCount: number;
  snippets: SearchSnippet[];
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

// 検索スニペット内のクエリ一致部分を <mark> で強調する
const highlightQuery = (text: string, query: string): React.ReactNode => {
  if (!query) return text;
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let index = lower.indexOf(needle);
  let key = 0;
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(<mark key={key++}>{text.slice(index, index + needle.length)}</mark>);
    cursor = index + needle.length;
    index = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
};

const SessionBrowser: React.FC<SessionBrowserProps> = ({ projects }) => {
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.fullName || '');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<{ title: string; sessionId: string; startTime: string | null } | null>(null);
  const [messages, setMessages] = useState<SessionMessage[] | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  // 全文検索
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');

  const shortName = (fullName: string): string =>
    projects.find((p) => p.fullName === fullName)?.name ||
    fullName.replace(/^-Users-[^-]+-/, '');

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

  const runSearch = async (): Promise<void> => {
    const query = searchQuery.trim();
    if (query.length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/sessions/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setSearchTruncated(Boolean(data.truncated));
      setActiveQuery(query);
    } catch (e) {
      setError(`検索に失敗しました: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = (): void => {
    setSearchResults(null);
    setSearchQuery('');
    setActiveQuery('');
  };

  const openConversation = async (
    project: string,
    sessionId: string,
    title: string,
    startTime: string | null = null
  ): Promise<void> => {
    setActiveSession({ title, sessionId, startTime });
    setMessages(null);
    setContentLoading(true);
    try {
      const res = await fetch(
        `/api/v2/sessions/content?project=${encodeURIComponent(project)}&session=${encodeURIComponent(sessionId)}`
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

  const openSessionRow = (row: Record<string, any>): void => {
    const session = row as unknown as SessionSummary & { displayTitle: string };
    openConversation(selectedProject, session.sessionId, session.displayTitle, session.startTime);
  };

  const tableRows = sessions.map((session) => ({
    ...session,
    id: session.sessionId,
    displayTitle: session.title || session.firstUserText || session.sessionId,
  }));

  return (
    <div className="session-browser">
      <div className="session-search-row">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="全プロジェクトの会話を全文検索（2文字以上）"
          className="session-search-input"
        />
        <button className="session-search-button" onClick={runSearch} disabled={searching || searchQuery.trim().length < 2}>
          {searching ? '検索中...' : '検索'}
        </button>
        {searchResults !== null && (
          <button className="session-search-clear" onClick={clearSearch}>クリア</button>
        )}
      </div>

      {error && <div className="session-error">{error}</div>}

      {searchResults !== null ? (
        <div className="search-results">
          <p className="search-results-count">
            「{activeQuery}」の検索結果: {searchResults.length}セッション
            {searchTruncated && '（上限に達したため一部のみ表示）'}
          </p>
          {searchResults.map((result) => (
            <div
              key={`${result.project}/${result.sessionId}`}
              className="search-result-card"
              onClick={() => openConversation(result.project, result.sessionId, result.title || result.sessionId, null)}
            >
              <div className="search-result-header">
                <span className="search-result-title">{result.title || result.sessionId}</span>
                <span className="search-result-meta">
                  {shortName(result.project)}
                  {result.endTime && ` ・ ${formatDate(result.endTime)}`}
                  {` ・ ${result.matchCount}件一致`}
                </span>
              </div>
              {result.snippets.map((snippet, index) => (
                <p key={index} className={`search-snippet ${snippet.role}`}>
                  <span className="snippet-role">{snippet.role === 'user' ? 'あなた' : 'Claude'}</span>
                  {highlightQuery(snippet.snippet, activeQuery)}
                </p>
              ))}
            </div>
          ))}
          {searchResults.length === 0 && (
            <p className="session-loading">一致する会話が見つかりませんでした</p>
          )}
        </div>
      ) : (
        <>
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

          {!loading && (
            <DataTable
              data={tableRows}
              columns={sessionColumns}
              onRowClick={openSessionRow}
              formatDate={formatDate}
              formatBytes={() => ''}
              formatNumber={formatNumber}
            />
          )}
        </>
      )}

      {activeSession && (
        <div className="session-modal-overlay" onClick={() => setActiveSession(null)}>
          <div className="session-modal" onClick={(e) => e.stopPropagation()}>
            <div className="session-modal-header">
              <div>
                <h3>{activeSession.title}</h3>
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
