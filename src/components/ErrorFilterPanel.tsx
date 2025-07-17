import React, { useState } from 'react';
import { ErrorFilter } from '../types';
import './ErrorFilterPanel.css';

interface ErrorFilterPanelProps {
  filter: ErrorFilter;
  onFilterChange: (filter: ErrorFilter) => void;
  sources?: string[];
  errorCodes?: string[];
}

const ErrorFilterPanel: React.FC<ErrorFilterPanelProps> = ({
  filter,
  onFilterChange,
  sources = [],
  errorCodes = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLevelChange = (level: string) => {
    const currentLevels = filter.levels || [];
    const newLevels = currentLevels.includes(level as any)
      ? currentLevels.filter(l => l !== level)
      : [...currentLevels, level as any];
    
    onFilterChange({
      ...filter,
      levels: newLevels.length > 0 ? newLevels : undefined
    });
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFilterChange({
      ...filter,
      [field]: value ? new Date(value) : undefined
    });
  };

  const handleSourceChange = (source: string) => {
    const currentSources = filter.sources || [];
    const newSources = currentSources.includes(source)
      ? currentSources.filter(s => s !== source)
      : [...currentSources, source];
    
    onFilterChange({
      ...filter,
      sources: newSources.length > 0 ? newSources : undefined
    });
  };

  const handleErrorCodeChange = (code: string) => {
    const currentCodes = filter.errorCodes || [];
    const newCodes = currentCodes.includes(code)
      ? currentCodes.filter(c => c !== code)
      : [...currentCodes, code];
    
    onFilterChange({
      ...filter,
      errorCodes: newCodes.length > 0 ? newCodes : undefined
    });
  };

  const handleSearchChange = (value: string) => {
    onFilterChange({
      ...filter,
      search: value || undefined
    });
  };

  const handleResolvedChange = (value: string) => {
    onFilterChange({
      ...filter,
      resolved: value === 'all' ? undefined : value === 'resolved'
    });
  };

  const resetFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = () => {
    return !!(
      filter.levels?.length ||
      filter.sources?.length ||
      filter.errorCodes?.length ||
      filter.startDate ||
      filter.endDate ||
      filter.search ||
      filter.resolved !== undefined
    );
  };

  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="error-filter-panel">
      <div className="filter-header">
        <h3>フィルター</h3>
        <div className="filter-actions">
          {hasActiveFilters() && (
            <button className="reset-button" onClick={resetFilters}>
              リセット
            </button>
          )}
          <button 
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '閉じる' : '展開'}
          </button>
        </div>
      </div>

      <div className={`filter-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="filter-section">
          <label>検索</label>
          <input
            type="text"
            placeholder="メッセージ、コード、発生源で検索..."
            value={filter.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <label>重要度</label>
          <div className="checkbox-group">
            {['CRITICAL', 'ERROR', 'WARNING', 'INFO'].map(level => (
              <label key={level} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filter.levels?.includes(level as any) || false}
                  onChange={() => handleLevelChange(level)}
                />
                <span className={`level-badge level-${level.toLowerCase()}`}>
                  {level}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label>期間</label>
          <div className="date-range">
            <input
              type="date"
              value={formatDateForInput(filter.startDate)}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="date-input"
            />
            <span className="date-separator">～</span>
            <input
              type="date"
              value={formatDateForInput(filter.endDate)}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="date-input"
            />
          </div>
        </div>

        <div className="filter-section">
          <label>状態</label>
          <select
            value={filter.resolved === true ? 'resolved' : filter.resolved === false ? 'unresolved' : 'all'}
            onChange={(e) => handleResolvedChange(e.target.value)}
            className="select-input"
          >
            <option value="all">すべて</option>
            <option value="unresolved">未解決</option>
            <option value="resolved">解決済み</option>
          </select>
        </div>

        {sources.length > 0 && (
          <div className="filter-section">
            <label>発生源</label>
            <div className="checkbox-group">
              {sources.map(source => (
                <label key={source} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filter.sources?.includes(source) || false}
                    onChange={() => handleSourceChange(source)}
                  />
                  <span>{source}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {errorCodes.length > 0 && (
          <div className="filter-section">
            <label>エラーコード</label>
            <div className="checkbox-group">
              {errorCodes.map(code => (
                <label key={code} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filter.errorCodes?.includes(code) || false}
                    onChange={() => handleErrorCodeChange(code)}
                  />
                  <span className="error-code">{code}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorFilterPanel;