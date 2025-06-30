import { useState, useEffect } from 'react';
import { UseUsageDataReturn, UsageData } from '../types';

const useUsageData = (): UseUsageDataReturn => {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/usage');
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      
      const data: UsageData = await response.json();
      setUsageData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, []);

  const refetch = (): void => {
    fetchUsageData();
  };

  return {
    usageData,
    loading,
    error,
    refetch
  };
};

export default useUsageData;