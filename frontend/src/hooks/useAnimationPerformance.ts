import { useEffect, useRef } from 'react';
import { performanceService } from '../services/performanceService';

export const useAnimationPerformance = (componentName: string) => {
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    const measureFrameRate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const duration = timestamp - startTimeRef.current;
      
      if (duration >= 1000) { // Measure every second
        const fps = frameRef.current || 0;
        performanceService.recordMetric('Custom', fps, {
          componentName,
          type: 'animation',
          metric: 'fps'
        });
        
        frameRef.current = 0;
        startTimeRef.current = timestamp;
      } else {
        frameRef.current = (frameRef.current || 0) + 1;
      }

      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [componentName]);
}; 