import React, { useState } from 'react';
import { format } from 'date-fns';
import './FilterPanel.css';

interface DateRange {
  start: string;
  end: string;
}

interface TimeRange {
  startHour: number | null;
  endHour: number | null;
}

interface Filters {
  minCost: number;
  maxCost: number;
  minTokens: number;
  maxTokens: number;
}

interface Statistics {
  totalItems: number;
  totalCost: number;
  totalTokens: number;
  avgCost: number;
}

interface FilterPanelProps {
  dateRange: DateRange | null;
  onDateRangeChange: (start: string, end: string) => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (startHour: number | null, endHour: number | null) => void;
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  statistics: Statistics;
  isCollapsed?: boolean;
  onToggleCollapse: () => void;
}

interface LocalDateRange {
  start: string;
  end: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  dateRange,
  onDateRangeChange,
  timeRange,
  onTimeRangeChange,
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
  const [localDateRange, setLocalDateRange] = useState<LocalDateRange>({
    start: dateRange?.start || '',
    end: dateRange?.end || ''
  });

  const [localTimeRange, setLocalTimeRange] = useState<TimeRange>({
    startHour: timeRange?.startHour ?? null,
    endHour: timeRange?.endHour ?? null
  });

  const handleDateChange = (field: keyof LocalDateRange, value: string): void => {
    const newRange = { ...localDateRange, [field]: value };
    setLocalDateRange(newRange);
    
    if (newRange.start && newRange.end) {
      onDateRangeChange(newRange.start, newRange.end);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string): void => {
    const numericValue = value === '' ? (key.includes('max') ? Infinity : 0) : Number(value);
    onFiltersChange({ [key]: numericValue });
  };

  const handleTimeChange = (field: keyof TimeRange, value: string): void => {
    const numericValue = value === '' ? null : parseInt(value);
    const newRange = { ...localTimeRange, [field]: numericValue };
    setLocalTimeRange(newRange);

    if (onTimeRangeChange) {
      onTimeRangeChange(newRange.startHour, newRange.endHour);
    }
  };

  // Time presets
  const timePresets = [
    { label: '全日', start: null, end: null },
    { label: '朝 (6-12)', start: 6, end: 12 },
    { label: '昼 (12-18)', start: 12, end: 18 },
    { label: '夜 (18-24)', start: 18, end: 23 },
    { label: '深夜 (0-6)', start: 0, end: 6 },
    { label: '勤務時間 (9-17)', start: 9, end: 17 }
  ];

  const applyTimePreset = (start: number | null, end: number | null): void => {
    setLocalTimeRange({ startHour: start, endHour: end });
    if (onTimeRangeChange) {
      onTimeRangeChange(start, end);
    }
  };

  // Date presets
  const applyDatePreset = (days: number | 'thisMonth' | 'lastMonth' | 'all'): void => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (days === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (days === 'lastMonth') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (days === 'all') {
      // Clear date filter
      setLocalDateRange({ start: '', end: '' });
      onDateRangeChange('', '');
      return;
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - days);
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setLocalDateRange({ start: startStr, end: endStr });
    onDateRangeChange(startStr, endStr);
  };

  const getFilterSummary = (): string[] => {
    const activeFilters: string[] = [];

    if (dateRange) {
      activeFilters.push(`期間: ${format(new Date(dateRange.start), 'M/d')} - ${format(new Date(dateRange.end), 'M/d')}`);
    }

    if (timeRange && (timeRange.startHour !== null || timeRange.endHour !== null)) {
      const start = timeRange.startHour ?? 0;
      const end = timeRange.endHour ?? 23;
      activeFilters.push(`時間帯: ${start}:00 - ${end}:00`);
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
            <div className="date-presets">
              <button onClick={() => applyDatePreset(7)} className="preset-btn" title="直近7日間">
                7日間
              </button>
              <button onClick={() => applyDatePreset(30)} className="preset-btn" title="直近30日間">
                30日間
              </button>
              <button onClick={() => applyDatePreset('thisMonth')} className="preset-btn" title="今月">
                今月
              </button>
              <button onClick={() => applyDatePreset('lastMonth')} className="preset-btn" title="先月">
                先月
              </button>
              <button onClick={() => applyDatePreset('all')} className="preset-btn" title="全期間">
                全期間
              </button>
            </div>
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

          {/* 時間帯フィルター */}
          {onTimeRangeChange && (
            <div className="filter-group">
              <label>時間帯</label>

              {/* Time presets */}
              <div className="time-presets">
                {timePresets.map((preset, index) => (
                  <button
                    key={index}
                    className={`preset-btn ${
                      localTimeRange.startHour === preset.start &&
                      localTimeRange.endHour === preset.end
                        ? 'active'
                        : ''
                    }`}
                    onClick={() => applyTimePreset(preset.start, preset.end)}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom time range */}
              <div className="time-range">
                <input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="開始時"
                  value={localTimeRange.startHour ?? ''}
                  onChange={(e) => handleTimeChange('startHour', e.target.value)}
                  className="time-input"
                />
                <span className="time-separator">:00 〜</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="終了時"
                  value={localTimeRange.endHour ?? ''}
                  onChange={(e) => handleTimeChange('endHour', e.target.value)}
                  className="time-input"
                />
                <span className="time-separator">:00</span>
              </div>
            </div>
          )}

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