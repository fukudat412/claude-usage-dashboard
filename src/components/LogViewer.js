import React, { useState } from 'react';

const LogViewer = ({ selectedLog, onClose, formatDate }) => {
  const [logContent, setLogContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogContent = async (filePath) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/logs/content?file=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        throw new Error('ログファイルの読み込みに失敗しました');
      }
      
      const data = await response.json();
      setLogContent(data.content);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = () => {
    if (selectedLog && selectedLog.filePath) {
      fetchLogContent(selectedLog.filePath);
    }
  };

  if (!selectedLog) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>ログ詳細</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="log-info">
            <p><strong>ファイル:</strong> {selectedLog.file}</p>
            <p><strong>パス:</strong> {selectedLog.filePath}</p>
            <p><strong>サイズ:</strong> {Math.round(selectedLog.size / 1024)} KB</p>
            <p><strong>更新日時:</strong> {formatDate(selectedLog.timestamp)}</p>
            {selectedLog.entries !== undefined && (
              <p><strong>エントリ数:</strong> {selectedLog.entries}</p>
            )}
            {selectedLog.sessionId && (
              <p><strong>セッションID:</strong> {selectedLog.sessionId}</p>
            )}
          </div>

          <div className="log-actions">
            <button onClick={handleViewContent} disabled={loading}>
              {loading ? '読み込み中...' : 'ファイル内容を表示'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              <p>エラー: {error}</p>
            </div>
          )}

          {logContent && (
            <div className="log-content">
              <h4>ファイル内容:</h4>
              <pre className="log-text">{logContent}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogViewer;