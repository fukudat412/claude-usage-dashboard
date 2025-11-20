import React, { useState } from 'react';
import InteractiveChart from './charts/InteractiveChart';
import FilterPanel from './FilterPanel';
import { useChartData } from '../hooks/useChartData';

interface UsageDataPoint {
  date: string;
  month?: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  cost: number;
  sessions: number;
  [key: string]: any;
}

interface UsageChartProps {
  data: UsageDataPoint[];
  viewMode: 'daily' | 'monthly';
  formatNumber: (value: number) => string;
  enableFilters?: boolean;
}

type ChartType = 'area' | 'line' | 'bar';

const UsageChart: React.FC<UsageChartProps> = ({
  data,
  viewMode,
  formatNumber,
  enableFilters = true
}) => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [filtersCollapsed, setFiltersCollapsed] = useState<boolean>(true);

  const {
    data: filteredData,
    chartData,
    statistics,
    dateRange,
    timeRange,
    filters,
    searchText,
    hasActiveFilters,
    updateDateRange,
    updateTimeRange,
    updateFilters,
    setSearchText,
    clearFilters
  } = useChartData(data, {
    enableRealTimeUpdates: false,
    filterThresholds: {
      minCost: 0,
      minTokens: 0
    }
  });

  const handleDataPointClick = (dataPoint: any): void => {
    console.log('Data point clicked:', dataPoint);
    // 詳細ページへの遷移やモーダル表示などの処理
  };

  if (!data || data.length === 0) {
    return <div className="no-data">表示するデータがありません</div>;
  }

  return (
    <div className="usage-chart-container">
      {enableFilters && (
        <FilterPanel
          dateRange={dateRange}
          onDateRangeChange={updateDateRange}
          timeRange={timeRange}
          onTimeRangeChange={updateTimeRange}
          filters={filters}
          onFiltersChange={updateFilters}
          searchText={searchText}
          onSearchChange={setSearchText}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          statistics={statistics}
          isCollapsed={filtersCollapsed}
          onToggleCollapse={() => setFiltersCollapsed(!filtersCollapsed)}
        />
      )}

      <div className="chart-controls-extended">
        {hasActiveFilters && (
          <div className="active-filters-info">
            <span className="filter-badge">
              フィルター適用中: {filteredData.length}/{statistics.totalItems}件
            </span>
          </div>
        )}
        <div className="chart-type-controls-compact">
          <select
            id="chart-type"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="chart-type-select"
            title="チャート種類を選択"
          >
            <option value="area">エリア</option>
            <option value="line">ライン</option>
            <option value="bar">バー</option>
          </select>
        </div>
      </div>

      <InteractiveChart
        data={chartData}
        chartType={chartType}
        viewMode={viewMode}
        formatNumber={formatNumber}
        onDataPointClick={handleDataPointClick}
        title={`${viewMode === 'daily' ? '日別' : '月別'}使用量${hasActiveFilters ? ' (フィルター適用)' : ''}`}
        enableDrillDown={true}
        showControls={true}
      />

      {statistics && filteredData.length > 0 && (
        <div className="chart-summary-compact">
          <div className="summary-stats">
            <span className="stat-item">
              <strong>${statistics.totalCost.toFixed(2)}</strong>
              <small>総コスト</small>
            </span>
            <span className="stat-separator">|</span>
            <span className="stat-item">
              <strong>{formatNumber(statistics.totalTokens)}</strong>
              <small>総トークン</small>
            </span>
            <span className="stat-separator">|</span>
            <span className="stat-item">
              <strong>{statistics.totalItems}件</strong>
              <small>表示期間</small>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageChart;