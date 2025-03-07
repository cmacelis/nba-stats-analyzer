import React, { useState } from 'react';
import { withRetry } from '../utils/apiRetry';

interface ApiRequestState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseApiRequestOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  autoRetry?: boolean;
}

export function useApiRequest<T>(
  requestFn: () => Promise<T>,
  options: UseApiRequestOptions = {}
) {
  const [state, setState] = useState<ApiRequestState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = options.autoRetry 
        ? await withRetry(() => requestFn())
        : await requestFn();

      setState({ data, loading: false, error: null });
      options.onSuccess?.(data);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      setState({ data: null, loading: false, error: errorObj });
      options.onError?.(errorObj);
    }
  };

  return {
    ...state,
    execute,
    reset: () => setState({ data: null, loading: false, error: null })
  };
} 