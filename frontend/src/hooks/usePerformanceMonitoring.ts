import { useEffect, useCallback, useRef } from 'react';
import { performanceService } from '../services/performanceService';

interface OperationContext {
  componentName: string;
  operationName: string;
  timestamp: number;
}

export function usePerformanceMonitoring(componentName: string) {
  const mountTimeRef = useRef(performance.now());

  useEffect(() => {
    return () => {
      const duration = performance.now() - mountTimeRef.current;
      performanceService.recordMetric('Custom', duration, {
        componentName,
        type: 'lifecycle',
        operation: 'mount-to-unmount'
      });
    };
  }, [componentName]);

  const recordOperation = useCallback((operationName: string) => {
    const startTime = performance.now();
    const context: OperationContext = {
      componentName,
      operationName,
      timestamp: Date.now()
    };
    
    return () => {
      const duration = performance.now() - startTime;
      performanceService.recordMetric('Custom', duration, context);
    };
  }, [componentName]);

  return {
    recordOperation
  };
} 