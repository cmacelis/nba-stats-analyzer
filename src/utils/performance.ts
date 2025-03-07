interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string): void {
    const start = this.marks.get(startMark);
    if (!start) {
      console.warn(`Start mark "${startMark}" not found`);
      return;
    }

    const duration = performance.now() - start;
    this.metrics.push({
      name,
      value: duration,
      timestamp: Date.now()
    });

    // Clean up the start mark
    this.marks.delete(startMark);
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
    this.marks.clear();
  }
}

class PerformanceOptimizer {
  private metrics: Map<string, number> = new Map();
  
  measureComponentRender(componentName: string) {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.metrics.set(componentName, duration);
      
      if (duration > 16.67) { // 60fps threshold
        console.warn(`Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`);
      }
    };
  }
}

export const performanceMonitor = new PerformanceMonitor(); 