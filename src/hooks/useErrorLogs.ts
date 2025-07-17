import { useState, useEffect, useCallback } from 'react';
import { ErrorLog, ErrorFilter, ErrorStats, ApiResponse } from '../types';

interface UseErrorLogsReturn {
  errors: ErrorLog[];
  stats: ErrorStats | null;
  loading: boolean;
  error: string | null;
  filter: ErrorFilter;
  setFilter: (filter: ErrorFilter) => void;
  refetch: () => void;
  selectedError: ErrorLog | null;
  setSelectedError: (error: ErrorLog | null) => void;
  similarErrors: ErrorLog[];
}

export const useErrorLogs = (): UseErrorLogsReturn => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ErrorFilter>({});
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [similarErrors, setSimilarErrors] = useState<ErrorLog[]>([]);

  const buildQueryString = useCallback((filter: ErrorFilter): string => {
    const params = new URLSearchParams();
    
    if (filter.startDate) {
      params.append('startDate', filter.startDate.toISOString());
    }
    if (filter.endDate) {
      params.append('endDate', filter.endDate.toISOString());
    }
    if (filter.levels && filter.levels.length > 0) {
      params.append('levels', filter.levels.join(','));
    }
    if (filter.sources && filter.sources.length > 0) {
      params.append('sources', filter.sources.join(','));
    }
    if (filter.errorCodes && filter.errorCodes.length > 0) {
      params.append('errorCodes', filter.errorCodes.join(','));
    }
    if (filter.search) {
      params.append('search', filter.search);
    }
    if (filter.resolved !== undefined) {
      params.append('resolved', filter.resolved.toString());
    }
    if (filter.limit) {
      params.append('limit', filter.limit.toString());
    }
    if (filter.offset) {
      params.append('offset', filter.offset.toString());
    }

    return params.toString();
  }, []);

  const fetchErrors = useCallback(async (currentFilter: ErrorFilter = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(currentFilter);
      const response = await fetch(`/api/v2/errors?${queryString}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<ErrorLog[]> = await response.json();
      
      if (data.success) {
        setErrors(data.data || []);
      } else {
        setError(data.error || 'エラーログの取得に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーログの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  const fetchStats = useCallback(async (currentFilter: ErrorFilter = {}) => {
    try {
      const queryString = buildQueryString(currentFilter);
      const response = await fetch(`/api/v2/errors/stats?${queryString}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<ErrorStats> = await response.json();
      
      if (data.success) {
        setStats(data.data || null);
      } else {
        console.error('統計情報の取得に失敗しました:', data.error);
      }
    } catch (err) {
      console.error('統計情報の取得に失敗しました:', err);
    }
  }, [buildQueryString]);

  const fetchSimilarErrors = useCallback(async (errorId: string) => {
    try {
      const response = await fetch(`/api/v2/errors/${errorId}/similar`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<ErrorLog[]> = await response.json();
      
      if (data.success) {
        setSimilarErrors(data.data || []);
      } else {
        setSimilarErrors([]);
      }
    } catch (err) {
      console.error('類似エラーの取得に失敗しました:', err);
      setSimilarErrors([]);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchErrors(filter);
    fetchStats(filter);
  }, [fetchErrors, fetchStats, filter]);

  // Filter changed
  useEffect(() => {
    fetchErrors(filter);
    fetchStats(filter);
  }, [fetchErrors, fetchStats, filter]);

  // Selected error changed
  useEffect(() => {
    if (selectedError) {
      fetchSimilarErrors(selectedError.id);
    } else {
      setSimilarErrors([]);
    }
  }, [selectedError, fetchSimilarErrors]);

  // Initial load
  useEffect(() => {
    fetchErrors({});
    fetchStats({});
  }, []);

  return {
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
  };
};