import React, { useState, useEffect } from 'react';
import { ErrorLog } from '../types';
import './ErrorLogViewer.css';

interface ErrorLogViewerProps {
  error: ErrorLog | null;
  onClose: () => void;
  similarErrors?: ErrorLog[];
  onSimilarErrorClick?: (error: ErrorLog) => void;
}

const ErrorLogViewer: React.FC<ErrorLogViewerProps> = ({
  error,
  onClose,
  similarErrors = [],
  onSimilarErrorClick
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'context' | 'similar'>('details');

  useEffect(() => {
    // Reset to details tab when error changes
    setActiveTab('details');
  }, [error]);

  if (!error) {
    return null;
  }

  const formatTimestamp = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getLevelClass = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'error-level-critical';
      case 'ERROR':
        return 'error-level-error';
      case 'WARNING':
        return 'error-level-warning';
      case 'INFO':
        return 'error-level-info';
      default:
        return '';
    }
  };

  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const renderDetailsTab = () => (
    <div className="tab-content">
      <div className="detail-section">
        <h4>基本情報</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <label>ID:</label>
            <span>{error.id}</span>
          </div>
          <div className="detail-item">
            <label>時間:</label>
            <span>{formatTimestamp(error.timestamp)}</span>
          </div>
          <div className="detail-item">
            <label>重要度:</label>
            <span className={`error-level ${getLevelClass(error.level)}`}>
              {error.level}
            </span>
          </div>
          <div className="detail-item">
            <label>コード:</label>
            <span className="error-code">{error.code || '-'}</span>
          </div>
          <div className="detail-item">
            <label>発生源:</label>
            <span>{error.source || '-'}</span>
          </div>
          <div className="detail-item">
            <label>状態:</label>
            <span className={`error-status ${error.resolved ? 'resolved' : 'unresolved'}`}>
              {error.resolved ? '解決済み' : '未解決'}
            </span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4>メッセージ</h4>
        <div className="message-box">
          {error.message}
        </div>
      </div>

      {error.stackTrace && (
        <div className="detail-section">
          <h4>スタックトレース</h4>
          <pre className="stack-trace">
            {error.stackTrace}
          </pre>
        </div>
      )}

      {error.requestInfo && (
        <div className="detail-section">
          <h4>リクエスト情報</h4>
          <div className="request-info">
            {error.requestInfo.method && (
              <div className="request-item">
                <label>Method:</label>
                <span className="method">{error.requestInfo.method}</span>
              </div>
            )}
            {error.requestInfo.url && (
              <div className="request-item">
                <label>URL:</label>
                <span className="url">{error.requestInfo.url}</span>
              </div>
            )}
            {error.requestInfo.headers && (
              <div className="request-item">
                <label>Headers:</label>
                <pre className="headers">
                  {formatJson(error.requestInfo.headers)}
                </pre>
              </div>
            )}
            {error.requestInfo.body && (
              <div className="request-item">
                <label>Body:</label>
                <pre className="body">
                  {formatJson(error.requestInfo.body)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {error.resolved && error.resolvedAt && (
        <div className="detail-section">
          <h4>解決情報</h4>
          <div className="detail-grid">
            <div className="detail-item">
              <label>解決日時:</label>
              <span>{formatTimestamp(error.resolvedAt)}</span>
            </div>
            {error.resolvedBy && (
              <div className="detail-item">
                <label>解決者:</label>
                <span>{error.resolvedBy}</span>
              </div>
            )}
          </div>
          {error.notes && (
            <div className="notes">
              <label>メモ:</label>
              <p>{error.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderContextTab = () => (
    <div className="tab-content">
      {error.context ? (
        <pre className="context-data">
          {formatJson(error.context)}
        </pre>
      ) : (
        <p className="no-data">コンテキスト情報がありません</p>
      )}
    </div>
  );

  const renderSimilarTab = () => (
    <div className="tab-content">
      {similarErrors.length > 0 ? (
        <div className="similar-errors">
          {similarErrors.map((similarError) => (
            <div
              key={similarError.id}
              className="similar-error-item"
              onClick={() => onSimilarErrorClick?.(similarError)}
            >
              <div className="similar-error-header">
                <span className="timestamp">
                  {formatTimestamp(similarError.timestamp)}
                </span>
                <span className={`error-level ${getLevelClass(similarError.level)}`}>
                  {similarError.level}
                </span>
                {similarError.code && (
                  <span className="error-code">{similarError.code}</span>
                )}
              </div>
              <div className="similar-error-message">
                {similarError.message}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-data">類似のエラーが見つかりません</p>
      )}
    </div>
  );

  return (
    <div className="error-log-viewer-overlay" onClick={onClose}>
      <div className="error-log-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <h3>エラー詳細</h3>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="viewer-tabs">
          <button
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            詳細
          </button>
          <button
            className={`tab ${activeTab === 'context' ? 'active' : ''}`}
            onClick={() => setActiveTab('context')}
          >
            コンテキスト
          </button>
          <button
            className={`tab ${activeTab === 'similar' ? 'active' : ''}`}
            onClick={() => setActiveTab('similar')}
          >
            類似エラー ({similarErrors.length})
          </button>
        </div>

        <div className="viewer-content">
          {activeTab === 'details' && renderDetailsTab()}
          {activeTab === 'context' && renderContextTab()}
          {activeTab === 'similar' && renderSimilarTab()}
        </div>

        <div className="viewer-actions">
          {!error.resolved && (
            <button className="resolve-button">
              解決済みとしてマーク
            </button>
          )}
          <button className="add-note-button">
            メモを追加
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorLogViewer;