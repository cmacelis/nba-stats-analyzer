interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}

export const withRetry = async <T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 5000,
    shouldRetry = () => true
  } = config;

  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1 || !shouldRetry(lastError)) {
        throw error;
      }

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Usage example:
export const fetchWithRetry = async <T>(url: string, options?: RequestInit): Promise<T> => {
  return withRetry(
    () => fetch(url, options).then(res => res.json()),
    {
      maxRetries: 3,
      shouldRetry: (error) => {
        // Retry on network errors or 5xx server errors
        return error instanceof TypeError || 
          (error.response && error.response.status >= 500);
      }
    }
  );
}; 