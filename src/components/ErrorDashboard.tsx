import React, { useState } from 'react';
import { useErrorLogs } from '../hooks/useErrorLogs';
import ErrorStatsChart from './ErrorStatsChart';
import ErrorFilterPanel from './ErrorFilterPanel';
import ErrorLogTable from './ErrorLogTable';
import ErrorLogViewer from './ErrorLogViewer';
import './ErrorDashboard.css';

const ErrorDashboard: React.FC = () => {
  const {
    errors,
    stats,
    loading,
    error,
    filter,
    setFilter,
    refetch,
    selectedError,
    setSelectedError,
    similarErrors
  } = useErrorLogs();

  const [showViewer, setShowViewer] = useState(false);

  const handleErrorSelect = (error: any) => {
    setSelectedError(error);
    setShowViewer(true);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedError(null);
  };

  const handleSimilarErrorClick = (error: any) => {
    setSelectedError(error);
    // Keep viewer open when clicking similar errors
  };

  const handleRefresh = () => {
    refetch();
  };

  // Extract unique sources and error codes for filter panel
  const uniqueSources = Array.from(new Set(errors.map(e => e.source).filter(Boolean))) as string[];
  const uniqueErrorCodes = Array.from(new Set(errors.map(e => e.code).filter(Boolean))) as string[];

  return (
    <div className="error-dashboard">
      <div className="dashboard-header">
        <h2>エラーログダッシュボード</h2>
        <div className="dashboard-actions">
          <button
            className="refresh-button"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? '更新中...' : '更新'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {stats && (
        <div className="stats-section">
          <ErrorStatsChart stats={stats} loading={loading} />
        </div>
      )}

      <div className="filter-section">
        <ErrorFilterPanel
          filter={filter}
          onFilterChange={setFilter}
          sources={uniqueSources}
          errorCodes={uniqueErrorCodes}
        />
      </div>

      <div className="table-section">
        <div className="table-header">
          <h3>エラーログ一覧</h3>
          <div className="table-info">
            {!loading && (
              <span className="result-count">
                {errors.length} 件のエラーログ
              </span>
            )}
          </div>
        </div>

        <ErrorLogTable
          errors={errors}
          onErrorSelect={handleErrorSelect}
          loading={loading}
        />
      </div>

      {showViewer && selectedError && (
        <ErrorLogViewer
          error={selectedError}
          onClose={handleCloseViewer}
          similarErrors={similarErrors}
          onSimilarErrorClick={handleSimilarErrorClick}
        />
      )}
    </div>
  );
};

export default ErrorDashboard;