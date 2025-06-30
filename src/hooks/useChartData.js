import { useState, useMemo, useEffect } from 'react';
import { startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { debounce } from 'lodash';

export function useChartData(rawData, options = {}) {
  const {
    initialDateRange = null,
    initialMetrics = ['totalTokens'],
    enableRealTimeUpdates = false,
    updateInterval = 30000, // 30秒
    filterThresholds = {}
  } = options;

  const [dateRange, setDateRange] = useState(initialDateRange);
  const [selectedMetrics, setSelectedMetrics] = useState(initialMetrics);
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState({
    minCost: filterThresholds.minCost || 0,
    minTokens: filterThresholds.minTokens || 0,
    maxCost: filterThresholds.maxCost || Infinity,
    maxTokens: filterThresholds.maxTokens || Infinity
  });

  // リアルタイム更新
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const interval = setInterval(() => {
      // データの再取得をトリガー
      if (options.onDataRefresh) {
        options.onDataRefresh();
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [enableRealTimeUpdates, updateInterval, options]);

  // フィルタリングされたデータ
  const filteredData = useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];

    let filtered = [...rawData];

    // 日付範囲フィルタ
    if (dateRange?.start && dateRange?.end) {
      filtered = filtered.filter(item => {
        try {
          const itemDate = parseISO(item.date || item.month);
          return isWithinInterval(itemDate, {
            start: startOfDay(parseISO(dateRange.start)),
            end: endOfDay(parseISO(dateRange.end))
          });
        } catch (error) {
          console.warn('Invalid date format:', item.date || item.month);
          return true;
        }
      });
    }

    // 数値フィルタ
    filtered = filtered.filter(item => {
      const cost = Number(item.cost || 0);
      const tokens = Number(item.totalTokens || 0);
      
      return cost >= filters.minCost &&
             cost <= filters.maxCost &&
             tokens >= filters.minTokens &&
             tokens <= filters.maxTokens;
    });

    // テキスト検索フィルタ
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableText = [
          item.date,
          item.month,
          item.sessionId,
          item.project
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchableText.includes(searchLower);
      });
    }

    return filtered;
  }, [rawData, dateRange, filters, searchText]);

  // ソートされたデータ
  const sortedData = useMemo(() => {
    if (!filteredData.length) return [];

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (typeof aValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = aValue < bValue ? -1 : 1;
      }

      return sortConfig.direction === 'desc' ? -comparison : comparison;
    });
  }, [filteredData, sortConfig]);

  // 統計データ
  const statistics = useMemo(() => {
    if (!sortedData.length) {
      return {
        totalItems: 0,
        totalCost: 0,
        totalTokens: 0,
        avgCost: 0,
        avgTokens: 0,
        maxCost: 0,
        maxTokens: 0,
        dateRange: null
      };
    }

    const costs = sortedData.map(item => Number(item.cost || 0));
    const tokens = sortedData.map(item => Number(item.totalTokens || 0));
    const dates = sortedData.map(item => item.date || item.month).filter(Boolean);

    return {
      totalItems: sortedData.length,
      totalCost: costs.reduce((sum, cost) => sum + cost, 0),
      totalTokens: tokens.reduce((sum, token) => sum + token, 0),
      avgCost: costs.length ? costs.reduce((sum, cost) => sum + cost, 0) / costs.length : 0,
      avgTokens: tokens.length ? tokens.reduce((sum, token) => sum + token, 0) / tokens.length : 0,
      maxCost: Math.max(...costs, 0),
      maxTokens: Math.max(...tokens, 0),
      dateRange: dates.length ? {
        start: Math.min(...dates.map(d => new Date(d).getTime())),
        end: Math.max(...dates.map(d => new Date(d).getTime()))
      } : null
    };
  }, [sortedData]);

  // デバウンス機能付きの検索更新
  const debouncedSetSearchText = useMemo(
    () => debounce((text) => setSearchText(text), 300),
    []
  );

  // ユーティリティ関数
  const updateDateRange = (start, end) => {
    setDateRange({ start, end });
  };

  const clearDateRange = () => {
    setDateRange(null);
  };

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      minCost: 0,
      minTokens: 0,
      maxCost: Infinity,
      maxTokens: Infinity
    });
    setSearchText('');
    setDateRange(null);
  };

  const updateSort = (key, direction) => {
    setSortConfig({ key, direction });
  };

  const toggleMetric = (metric) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metric)) {
        return prev.filter(m => m !== metric);
      } else {
        return [...prev, metric];
      }
    });
  };

  // データをチャート用にフォーマット
  const chartData = useMemo(() => {
    return sortedData.map(item => ({
      ...item,
      // 選択されたメトリクスのみを含める
      ...selectedMetrics.reduce((acc, metric) => {
        acc[metric] = item[metric];
        return acc;
      }, {})
    }));
  }, [sortedData, selectedMetrics]);

  return {
    // データ
    data: sortedData,
    chartData,
    statistics,
    
    // フィルタ状態
    dateRange,
    selectedMetrics,
    searchText,
    sortConfig,
    filters,
    
    // フィルタ更新関数
    updateDateRange,
    clearDateRange,
    updateFilters,
    clearFilters,
    updateSort,
    toggleMetric,
    setSearchText: debouncedSetSearchText,
    
    // ユーティリティ
    hasActiveFilters: !!(dateRange || searchText || 
      filters.minCost > 0 || filters.minTokens > 0 ||
      filters.maxCost < Infinity || filters.maxTokens < Infinity),
    
    isEmpty: sortedData.length === 0,
    isFiltered: rawData?.length !== sortedData.length
  };
}