/**
 * Performance monitoring utilities for measuring critical user flows
 * Implements Step 1 of the performance plan: instrumentation
 */

interface PerformanceMark {
  name: string;
  timestamp: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();
  private measures: Map<string, number> = new Map();

  /**
   * Mark the start of a performance measurement
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mark(name: string, metadata?: Record<string, any>) {
    const mark: PerformanceMark = {
      name,
      timestamp: performance.now(),
      metadata
    };
    
    this.marks.set(name, mark);
    
    if (typeof window !== 'undefined' && window.performance?.mark) {
      window.performance.mark(name);
    }
    
    console.debug(`[PERF] Mark: ${name}`, metadata);
  }

  /**
   * Measure the time between two marks
   */
  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : { timestamp: performance.now() };
    
    if (!start) {
      console.warn(`[PERF] Start mark "${startMark}" not found`);
      return null;
    }
    
    if (endMark && !this.marks.has(endMark)) {
      console.warn(`[PERF] End mark "${endMark}" not found`);
      return null;
    }
    
    const duration = (end?.timestamp || performance.now()) - start.timestamp;
    this.measures.set(name, duration);
    
    if (typeof window !== 'undefined' && window.performance?.measure) {
      try {
        window.performance.measure(name, startMark, endMark);
      } catch {
        // Marks might not exist in performance API
      }
    }
    
    console.log(`[PERF] Measure: ${name} = ${duration.toFixed(2)}ms`);
    
    // Report critical metrics to analytics if available
    if (duration > 1000) {
      console.warn(`[PERF] Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  /**
   * Get all marks
   */
  getMarks() {
    return Array.from(this.marks.values());
  }

  /**
   * Get all measures
   */
  getMeasures() {
    return Array.from(this.measures.entries()).map(([name, duration]) => ({
      name,
      duration
    }));
  }

  /**
   * Clear all marks and measures
   */
  clear() {
    this.marks.clear();
    this.measures.clear();
    
    if (typeof window !== 'undefined' && window.performance?.clearMarks) {
      window.performance.clearMarks();
      window.performance.clearMeasures();
    }
  }

  /**
   * Report performance metrics (for future telemetry integration)
   */
  report() {
    const metrics = {
      marks: this.getMarks(),
      measures: this.getMeasures(),
      timestamp: Date.now()
    };
    
    console.table(this.getMeasures());
    
    // TODO: Send to analytics service
    // if (window.analytics) {
    //   window.analytics.track('performance_metrics', metrics);
    // }
    
    return metrics;
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

// Convenience functions for common measurements
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const perfMark = (name: string, metadata?: Record<string, any>) => 
  perfMonitor.mark(name, metadata);

export const perfMeasure = (name: string, startMark: string, endMark?: string) => 
  perfMonitor.measure(name, startMark, endMark);

// Pre-defined marks for critical user flows
export const PERF_MARKS = {
  // Sign-in flow
  SIGN_IN_START: 'signIn:start',
  SIGN_IN_SUCCESS: 'signIn:success',
  FIRST_PAINT: 'signIn:firstPaint',
  
  // Modal operations
  MODAL_OPEN_START: 'modal:openStart',
  MODAL_CODE_LOADED: 'modal:codeLoaded',
  MODAL_DATA_READY: 'modal:dataReady',
  MODAL_INTERACTIVE: 'modal:interactive',
  
  // Game operations
  GAME_LOAD_START: 'game:loadStart',
  GAME_LOAD_COMPLETE: 'game:loadComplete',
  GAME_SAVE_START: 'game:saveStart',
  GAME_SAVE_COMPLETE: 'game:saveComplete',
  
  // Data fetching
  FETCH_GAMES_START: 'fetch:gamesStart',
  FETCH_GAMES_COMPLETE: 'fetch:gamesComplete',
  FETCH_STATS_START: 'fetch:statsStart',
  FETCH_STATS_COMPLETE: 'fetch:statsComplete',
} as const;

// Utility to measure React component render time
export function measureComponentRender(componentName: string) {
  const startMark = `render:${componentName}:start`;
  const endMark = `render:${componentName}:end`;
  
  return {
    start: () => perfMark(startMark),
    end: () => {
      perfMark(endMark);
      perfMeasure(`render:${componentName}`, startMark, endMark);
    }
  };
}

// Measure async operations
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const startMark = `${name}:start`;
  const endMark = `${name}:end`;
  
  perfMark(startMark);
  
  try {
    const result = await operation();
    perfMark(endMark);
    perfMeasure(name, startMark, endMark);
    return result;
  } catch (error) {
    perfMark(`${name}:error`);
    perfMeasure(`${name}:failed`, startMark);
    throw error;
  }
}