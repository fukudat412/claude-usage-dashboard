import React, { useState } from 'react';
import { McpLogEntry } from '../types';

interface LogViewerProps {
  selectedLog: McpLogEntry | null;
  onClose: () => void;
  formatDate: (date: string | Date) => string;
}

interface LogContent {
  content: any[];
  parsed: boolean;
  error?: string;
}

const LogViewer: React.FC<LogViewerProps> = ({ selectedLog, onClose, formatDate }) => {
  const [logContent, setLogContent] = useState<LogContent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogContent = async (filePath: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/logs/content?file=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        throw new Error('ログファイルの読み込みに失敗しました');
      }
      
      const data = await response.json();
      setLogContent(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = (): void => {
    if (selectedLog?.filePath) {
      fetchLogContent(selectedLog.filePath);
    }
  };

  const formatLogEntry = (entry: any, index: number): React.ReactElement => {
    if (typeof entry === 'string') {
      return (
        <div key={index} className="log-entry text">
          <pre>{entry}</pre>
        </div>
      );
    }

    if (typeof entry === 'object' && entry !== null) {
      return (
        <div key={index} className="log-entry json">
          <div className="entry-header">
            {entry.timestamp && (
              <span className="timestamp">{formatDate(entry.timestamp)}</span>
            )}
            {entry.level && (
              <span className={`level level-${entry.level.toLowerCase()}`}>
                {entry.level}
              </span>
            )}
            {entry.sessionId && (
              <span className="session-id">Session: {entry.sessionId}</span>
            )}
          </div>
          <div className="entry-content">
            <pre>{JSON.stringify(entry, null, 2)}</pre>
          </div>
        </div>
      );
    }

    return (
      <div key={index} className="log-entry unknown">
        <pre>{String(entry)}</pre>
      </div>
    );
  };

  if (!selectedLog) {
    return null;
  }

  return (
    <div className="log-viewer-overlay" onClick={onClose}>
      <div className="log-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="log-viewer-header">
          <h3>ログ詳細: {selectedLog.file}</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="log-viewer-meta">
          <div className="meta-item">
            <span className="label">ファイル:</span>
            <span className="value">{selectedLog.file}</span>
          </div>
          <div className="meta-item">
            <span className="label">サイズ:</span>
            <span className="value">{(selectedLog.size / 1024).toFixed(2)} KB</span>
          </div>
          <div className="meta-item">
            <span className="label">エントリ数:</span>
            <span className="value">{selectedLog.entries}</span>
          </div>
          <div className="meta-item">
            <span className="label">更新日時:</span>
            <span className="value">{formatDate(selectedLog.timestamp)}</span>
          </div>
          {selectedLog.sessionId && (
            <div className="meta-item">
              <span className="label">セッションID:</span>
              <span className="value">{selectedLog.sessionId}</span>
            </div>
          )}
          {selectedLog.error && (
            <div className="meta-item error">
              <span className="label">エラー:</span>
              <span className="value">{selectedLog.error}</span>
            </div>
          )}
        </div>

        <div className="log-viewer-actions">
          {!logContent && !loading && (
            <button 
              className="view-content-btn"
              onClick={handleViewContent}
              disabled={!selectedLog.filePath}
            >
              ログ内容を表示
            </button>
          )}
        </div>

        <div className="log-viewer-content">
          {loading && (
            <div className="loading">
              <p>ログを読み込んでいます...</p>
            </div>
          )}

          {error && (
            <div className="error">
              <p>エラー: {error}</p>
              <button onClick={() => setError(null)}>閉じる</button>
            </div>
          )}

          {logContent && (
            <div className="log-content">
              <div className="content-header">
                <h4>ログ内容 ({logContent.content?.length || 0} エントリ)</h4>
                {!logContent.parsed && (
                  <span className="parse-warning">
                    ⚠️ パース不能な内容が含まれています
                  </span>
                )}
              </div>
              <div className="entries">
                {logContent.content?.map((entry, index) => 
                  formatLogEntry(entry, index)
                ) || (
                  <div className="no-content">
                    <p>表示できる内容がありません</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogViewer;