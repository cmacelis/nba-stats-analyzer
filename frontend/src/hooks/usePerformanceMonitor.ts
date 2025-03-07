import { useRef, useEffect } from 'react';

interface PerformanceOptions {
  componentName: string;
  logToConsole?: boolean;
  threshold?: number; // in milliseconds
  onSlowRender?: (duration: number) => void;
}

export function usePerformanceMonitor({
  componentName,
  logToConsole = false,
  threshold = 16, // ~1 frame at 60fps
  onSlowRender
}: PerformanceOptions): void {
  const renderStartTime = useRef<number>(0);
  
  useEffect(() => {
    const endTime = performance.now();
    const duration = endTime - renderStartTime.current;
    
    if (duration > threshold) {
      if (logToConsole) {
        console.warn(`Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`);
      }
      
      if (onSlowRender) {
        onSlowRender(duration);
      }
    }
    
    return () => {
      // Capture start time for next render
      renderStartTime.current = performance.now();
    };
  });
  
  // Set initial render start time
  if (renderStartTime.current === 0) {
    renderStartTime.current = performance.now();
  }
} 