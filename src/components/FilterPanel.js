import React, { useState } from 'react';
import { format } from 'date-fns';
import './FilterPanel.css';

const FilterPanel = ({
  dateRange,
  onDateRangeChange,
  filters,
  onFiltersChange,
  searchText,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
  statistics,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [localDateRange, setLocalDateRange] = useState({
    start: dateRange?.start || '',
    end: dateRange?.end || ''
  });

  const handleDateChange = (field, value) => {
    const newRange = { ...localDateRange, [field]: value };
    setLocalDateRange(newRange);
    
    if (newRange.start && newRange.end) {
      onDateRangeChange(newRange.start, newRange.end);
    }
  };

  const handleFilterChange = (key, value) => {
    const numericValue = value === '' ? (key.includes('max') ? Infinity : 0) : Number(value);
    onFiltersChange({ [key]: numericValue });
  };

  const getFilterSummary = () => {
    const activeFilters = [];
    
    if (dateRange) {
      activeFilters.push(`期間: ${format(new Date(dateRange.start), 'M/d')} - ${format(new Date(dateRange.end), 'M/d')}`);
    }
    
    if (searchText) {
      activeFilters.push(`検索: "${searchText}"`);
    }
    
    if (filters.minCost > 0) {
      activeFilters.push(`最小コスト: $${filters.minCost}`);
    }
    
    if (filters.maxCost < Infinity) {
      activeFilters.push(`最大コスト: $${filters.maxCost}`);
    }
    
    if (filters.minTokens > 0) {
      activeFilters.push(`最小トークン: ${filters.minTokens.toLocaleString()}`);
    }
    
    if (filters.maxTokens < Infinity) {
      activeFilters.push(`最大トークン: ${filters.maxTokens.toLocaleString()}`);
    }
    
    return activeFilters;
  };

  return (
    <div className={`filter-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="filter-header">
        <div className="filter-title">
          <h3>フィルター</h3>
          {hasActiveFilters && (
            <span className="active-filters-count">
              {getFilterSummary().length}個のフィルター適用中
            </span>
          )}
        </div>
        <div className="filter-actions">
          {hasActiveFilters && (
            <button 
              className="clear-filters-btn"
              onClick={onClearFilters}
              title="全フィルターをクリア"
            >
              クリア
            </button>
          )}
          <button 
            className="toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? '展開' : '折りたたみ'}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="filter-content">
          {/* 検索フィルター */}
          <div className="filter-group">
            <label>検索</label>
            <input
              type="text"
              placeholder="日付、セッションID、プロジェクト名で検索..."
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              className="search-input"
            />
          </div>

          {/* 日付範囲フィルター */}
          <div className="filter-group">
            <label>期間</label>
            <div className="date-range">
              <input
                type="date"
                value={localDateRange.start}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="date-input"
              />
              <span className="date-separator">〜</span>
              <input
                type="date"
                value={localDateRange.end}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="date-input"
              />
            </div>
          </div>

          {/* コストフィルター */}
          <div className="filter-group">
            <label>コスト範囲 ($)</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="最小"
                min="0"
                step="0.01"
                value={filters.minCost || ''}
                onChange={(e) => handleFilterChange('minCost', e.target.value)}
                className="range-input"
              />
              <span className="range-separator">〜</span>
              <input
                type="number"
                placeholder="最大"
                min="0"
                step="0.01"
                value={filters.maxCost === Infinity ? '' : filters.maxCost}
                onChange={(e) => handleFilterChange('maxCost', e.target.value)}
                className="range-input"
              />
            </div>
          </div>

          {/* トークン数フィルター */}
          <div className="filter-group">
            <label>トークン数範囲</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="最小"
                min="0"
                value={filters.minTokens || ''}
                onChange={(e) => handleFilterChange('minTokens', e.target.value)}
                className="range-input"
              />
              <span className="range-separator">〜</span>
              <input
                type="number"
                placeholder="最大"
                min="0"
                value={filters.maxTokens === Infinity ? '' : filters.maxTokens}
                onChange={(e) => handleFilterChange('maxTokens', e.target.value)}
                className="range-input"
              />
            </div>
          </div>

          {/* 統計情報 */}
          {statistics && (
            <div className="filter-stats">
              <h4>フィルター結果</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">件数:</span>
                  <span className="stat-value">{statistics.totalItems}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">総コスト:</span>
                  <span className="stat-value">${statistics.totalCost.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">総トークン:</span>
                  <span className="stat-value">{statistics.totalTokens.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">平均コスト:</span>
                  <span className="stat-value">${statistics.avgCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 折りたたみ時のサマリー */}
      {isCollapsed && hasActiveFilters && (
        <div className="collapsed-summary">
          {getFilterSummary().slice(0, 2).map((filter, index) => (
            <span key={index} className="filter-tag">
              {filter}
            </span>
          ))}
          {getFilterSummary().length > 2 && (
            <span className="more-filters">
              +{getFilterSummary().length - 2}個
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;