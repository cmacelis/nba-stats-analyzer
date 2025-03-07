import { useEffect, useRef } from 'react';
import { analytics } from '../services/analyticsService';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  totalTime: number;
}

export function usePerformanceMonitor(componentName: string) {
  const metrics = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalTime: 0
  });

  const startTime = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    metrics.current.renderCount++;
    metrics.current.lastRenderTime = renderTime;
    metrics.current.totalTime += renderTime;
    metrics.current.averageRenderTime = 
      metrics.current.totalTime / metrics.current.renderCount;

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${componentName}] Performance Metrics:`, {
        renderCount: metrics.current.renderCount,
        lastRenderTime: `${renderTime.toFixed(2)}ms`,
        averageRenderTime: `${metrics.current.averageRenderTime.toFixed(2)}ms`
      });
    }

    startTime.current = performance.now();
  });

  return metrics.current;
} 