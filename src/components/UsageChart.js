import React, { useState } from 'react';
import InteractiveChart from './charts/InteractiveChart';
import FilterPanel from './FilterPanel';
import { useChartData } from '../hooks/useChartData';

const UsageChart = ({ data, viewMode, formatNumber, enableFilters = true }) => {
  const [chartType, setChartType] = useState('area');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  const {
    data: filteredData,
    chartData,
    statistics,
    dateRange,
    filters,
    searchText,
    hasActiveFilters,
    updateDateRange,
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

  const handleDataPointClick = (dataPoint) => {
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
        <div className="chart-type-controls">
          <label htmlFor="chart-type">チャート種類:</label>
          <select
            id="chart-type"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="area">エリアチャート</option>
            <option value="line">ラインチャート</option>
            <option value="bar">バーチャート</option>
            <option value="scatter">散布図</option>
            <option value="pie">円グラフ</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div className="active-filters-info">
            <span className="filter-info">
              {statistics.totalItems}件中 {filteredData.length}件を表示
            </span>
          </div>
        )}
      </div>

      <InteractiveChart
        data={chartData}
        chartType={chartType}
        viewMode={viewMode}
        formatNumber={formatNumber}
        onDataPointClick={handleDataPointClick}
        title={`${viewMode === 'daily' ? '日別' : '月別'}使用量${hasActiveFilters ? ' (フィルター適用)' : ''}`}
        enableExport={true}
        enableDrillDown={true}
        showControls={true}
      />

      {statistics && filteredData.length > 0 && (
        <div className="chart-summary">
          <h4>データサマリー</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">表示件数:</span>
              <span className="summary-value">{statistics.totalItems}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">総コスト:</span>
              <span className="summary-value">${statistics.totalCost.toFixed(2)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">総トークン:</span>
              <span className="summary-value">{formatNumber(statistics.totalTokens)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">平均コスト:</span>
              <span className="summary-value">${statistics.avgCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageChart;