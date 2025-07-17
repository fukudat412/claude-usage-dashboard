import { useState, useEffect } from 'react';
import { ApiResponse } from '../types';

interface UseVsCodeExtensionReturn {
  isAvailable: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useVsCodeExtension = (): UseVsCodeExtensionReturn => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v2/vscode/available');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse<{ available: boolean }> = await response.json();
      
      if (data.success) {
        setIsAvailable(data.data?.available || false);
      } else {
        setError(data.error || 'Failed to check VS Code extension availability');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchAvailability();
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  return {
    isAvailable,
    loading,
    error,
    refetch
  };
};