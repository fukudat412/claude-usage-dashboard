import React, { useState } from 'react';
import { ErrorLog } from '../types';
import './ErrorLogTable.css';

interface ErrorLogTableProps {
  errors: ErrorLog[];
  onErrorSelect: (error: ErrorLog) => void;
  loading?: boolean;
}

const ErrorLogTable: React.FC<ErrorLogTableProps> = ({ errors, onErrorSelect, loading }) => {
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedErrors = [...errors].sort((a, b) => {
    let aValue = a[sortBy as keyof ErrorLog];
    let bValue = b[sortBy as keyof ErrorLog];

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (aValue instanceof Date && bValue instanceof Date) {
      return sortOrder === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    return sortOrder === 'asc'
      ? (aValue > bValue ? 1 : -1)
      : (aValue < bValue ? 1 : -1);
  });

  if (loading) {
    return (
      <div className="error-log-table-loading">
        <div className="loading-spinner">読み込み中...</div>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="error-log-table-empty">
        <p>エラーログがありません</p>
      </div>
    );
  }

  return (
    <div className="error-log-table">
      <table className="error-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('timestamp')}>
              時間 {sortBy === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('level')}>
              重要度 {sortBy === 'level' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('code')}>
              コード {sortBy === 'code' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th>メッセージ</th>
            <th onClick={() => handleSort('source')}>
              発生源 {sortBy === 'source' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('resolved')}>
              状態 {sortBy === 'resolved' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedErrors.map((error) => (
            <tr key={error.id} onClick={() => onErrorSelect(error)} className="error-row">
              <td>
                <span className="timestamp">{formatTimestamp(error.timestamp)}</span>
              </td>
              <td>
                <span className={`error-level ${getLevelClass(error.level)}`}>
                  {error.level}
                </span>
              </td>
              <td>
                <span className="error-code">{error.code || '-'}</span>
              </td>
              <td>
                <span className="error-message" title={error.message}>
                  {error.message.length > 100 ? `${error.message.substring(0, 100)}...` : error.message}
                </span>
              </td>
              <td>
                <span className="error-source">{error.source || '-'}</span>
              </td>
              <td>
                <span className={`error-status ${error.resolved ? 'resolved' : 'unresolved'}`}>
                  {error.resolved ? '解決済み' : '未解決'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ErrorLogTable;