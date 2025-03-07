import React, { createContext, useContext, useEffect, useState } from 'react';
import { performanceService } from '../services/performanceService';

interface Metrics {
  FCP: number;
  LCP: number;
  CLS: number;
  FID: number;
}

interface PerformanceHistory extends Metrics {
  timestamp: number;
}

interface PerformanceContextType {
  metrics: Metrics;
  history: PerformanceHistory[];
}

const defaultMetrics: Metrics = {
  FCP: 0,
  LCP: 0,
  CLS: 0,
  FID: 0
};

const PerformanceContext = createContext<PerformanceContextType>({
  metrics: defaultMetrics,
  history: []
});

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics);
  const [history, setHistory] = useState<PerformanceHistory[]>([]);

  useEffect(() => {
    const unsubscribe = performanceService.subscribe((metric) => {
      const metricName = metric.name;
      if (metricName in defaultMetrics) {
        setMetrics(prev => {
          const updated = {
            ...prev,
            [metricName]: metric.value
          };
          
          setHistory(prev => [...prev, {
            ...updated,
            timestamp: Date.now()
          }].slice(-50)); // Keep last 50 entries
          
          return updated;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <PerformanceContext.Provider value={{ metrics, history }}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = () => useContext(PerformanceContext); 