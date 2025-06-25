import { useState, useEffect } from 'react';

const useUsageData = () => {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/usage');
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      
      const data = await response.json();
      setUsageData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, []);

  const refetch = () => {
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