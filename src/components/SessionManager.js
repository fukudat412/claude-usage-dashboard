import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import '../styles/SessionManager.css';

function SessionManager() {
  const {
    connected,
    sessions,
    registerSession,
    requestSubsession,
    updateSessionStatus,
    respondToSubsession
  } = useSocket();

  const [mainSessionId, setMainSessionId] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (connected && !mainSessionId) {
      const sessionId = `main-${Date.now()}`;
      setMainSessionId(sessionId);
      registerSession(sessionId, 'main', {
        source: 'dashboard',
        userAgent: navigator.userAgent
      });
    }
  }, [connected, mainSessionId, registerSession]);

  const handleCreateSubsession = () => {
    if (newTask.trim() && mainSessionId) {
      requestSubsession(mainSessionId, newTask, {
        priority: 'normal',
        createdFrom: 'dashboard'
      });
      setNewTask('');
    }
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
  };

  const getSessionStatus = (status) => {
    const statusMap = {
      active: { label: 'アクティブ', className: 'status-active' },
      pending: { label: '保留中', className: 'status-pending' },
      completed: { label: '完了', className: 'status-completed' },
      failed: { label: '失敗', className: 'status-failed' },
      disconnected: { label: '切断', className: 'status-disconnected' }
    };
    return statusMap[status] || { label: status, className: 'status-unknown' };
  };

  const mainSessions = sessions.filter(s => s.type === 'main');
  const subSessions = sessions.filter(s => s.type === 'subsession');

  return (
    <div className="session-manager">
      <div className="connection-status">
        <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
        {connected ? 'WebSocket接続中' : 'WebSocket切断中'}
      </div>

      <div className="session-panels">
        <div className="main-session-panel">
          <h3>メインセッション</h3>
          {mainSessionId && (
            <div className="current-session">
              <p>現在のセッションID: <code>{mainSessionId}</code></p>
            </div>
          )}
          
          <div className="subsession-creator">
            <h4>新しいサブセッションを作成</h4>
            <div className="input-group">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="タスクを入力してください..."
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSubsession()}
              />
              <button onClick={handleCreateSubsession} disabled={!newTask.trim()}>
                作成
              </button>
            </div>
          </div>

          <div className="session-list">
            <h4>アクティブなメインセッション</h4>
            {mainSessions.length === 0 ? (
              <p className="no-sessions">アクティブなセッションはありません</p>
            ) : (
              <ul>
                {mainSessions.map(session => (
                  <li key={session.id} onClick={() => handleSessionClick(session)}>
                    <div className="session-item">
                      <span className="session-id">{session.id}</span>
                      <span className={`session-status ${getSessionStatus(session.status).className}`}>
                        {getSessionStatus(session.status).label}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="subsession-panel">
          <h3>サブセッション</h3>
          <div className="session-list">
            {subSessions.length === 0 ? (
              <p className="no-sessions">サブセッションはありません</p>
            ) : (
              <ul>
                {subSessions.map(session => (
                  <li key={session.id} onClick={() => handleSessionClick(session)}>
                    <div className="session-item">
                      <div className="session-header">
                        <span className="session-task">{session.task}</span>
                        <span className={`session-status ${getSessionStatus(session.status).className}`}>
                          {getSessionStatus(session.status).label}
                        </span>
                      </div>
                      <div className="session-meta">
                        <span className="session-id">{session.id}</span>
                        <span className="session-parent">親: {session.parentSessionId}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {selectedSession && (
        <div className="session-details">
          <h3>セッション詳細</h3>
          <button className="close-button" onClick={() => setSelectedSession(null)}>×</button>
          <div className="details-content">
            <p><strong>ID:</strong> {selectedSession.id}</p>
            <p><strong>タイプ:</strong> {selectedSession.type}</p>
            <p><strong>ステータス:</strong> {getSessionStatus(selectedSession.status).label}</p>
            {selectedSession.task && (
              <p><strong>タスク:</strong> {selectedSession.task}</p>
            )}
            {selectedSession.parentSessionId && (
              <p><strong>親セッション:</strong> {selectedSession.parentSessionId}</p>
            )}
            <p><strong>作成時刻:</strong> {new Date(selectedSession.createdAt).toLocaleString()}</p>
            <p><strong>最終更新:</strong> {new Date(selectedSession.lastActivity).toLocaleString()}</p>
            {selectedSession.response && (
              <div className="session-response">
                <h4>レスポンス</h4>
                <pre>{JSON.stringify(selectedSession.response, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionManager;