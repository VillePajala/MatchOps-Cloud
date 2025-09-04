import {
  PerformanceMonitor,
  perfMonitor,
  perfMark,
  perfMeasure,
  PERF_MARKS,
  measureComponentRender,
  measureAsync
} from '../performance';

describe('performance', () => {
  const mockPerformance = {
    now: jest.fn(),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  };

  const mockConsole = {
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    table: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock performance API
    Object.defineProperty(global, 'performance', {
      value: mockPerformance,
      writable: true,
    });

    // Mock console methods
    Object.defineProperty(global, 'console', {
      value: mockConsole,
      writable: true,
    });

    // Mock window with performance
    Object.defineProperty(global, 'window', {
      value: {
        performance: mockPerformance,
      },
      writable: true,
    });

    // Setup default mock implementations
    mockPerformance.now.mockReturnValue(1000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    describe('mark', () => {
      it('should create a mark with timestamp', () => {
        const metadata = { component: 'TestComponent' };
        
        monitor.mark('test-mark', metadata);

        const marks = monitor.getMarks();
        expect(marks).toHaveLength(1);
        expect(marks[0]).toEqual({
          name: 'test-mark',
          timestamp: 1000,
          metadata
        });
        expect(mockPerformance.now).toHaveBeenCalled();
      });

      it('should call window.performance.mark when available', () => {
        monitor.mark('test-mark');

        expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark');
      });

      it('should handle missing window.performance gracefully', () => {
        delete (global as any).window;

        expect(() => monitor.mark('test-mark')).not.toThrow();
        expect(mockConsole.debug).toHaveBeenCalledWith('[PERF] Mark: test-mark', undefined);
      });

      it('should handle missing window.performance.mark gracefully', () => {
        (global as any).window = { performance: {} };

        expect(() => monitor.mark('test-mark')).not.toThrow();
        expect(mockConsole.debug).toHaveBeenCalledWith('[PERF] Mark: test-mark', undefined);
      });

      it('should log mark creation', () => {
        const metadata = { test: true };
        
        monitor.mark('debug-mark', metadata);

        expect(mockConsole.debug).toHaveBeenCalledWith('[PERF] Mark: debug-mark', metadata);
      });

      it('should overwrite existing marks with same name', () => {
        monitor.mark('duplicate-mark');
        mockPerformance.now.mockReturnValue(2000);
        monitor.mark('duplicate-mark');

        const marks = monitor.getMarks();
        expect(marks).toHaveLength(1);
        expect(marks[0].timestamp).toBe(2000);
      });
    });

    describe('measure', () => {
      beforeEach(() => {
        monitor.mark('start-mark');
        mockPerformance.now.mockReturnValue(1500);
        monitor.mark('end-mark');
        mockPerformance.now.mockReturnValue(2000);
      });

      it('should measure duration between two marks', () => {
        const duration = monitor.measure('test-measure', 'start-mark', 'end-mark');

        expect(duration).toBe(500); // 1500 - 1000
        expect(mockConsole.log).toHaveBeenCalledWith('[PERF] Measure: test-measure = 500.00ms');
      });

      it('should measure from start mark to current time when no end mark provided', () => {
        const duration = monitor.measure('current-measure', 'start-mark');

        expect(duration).toBe(1000); // 2000 - 1000
        expect(mockConsole.log).toHaveBeenCalledWith('[PERF] Measure: current-measure = 1000.00ms');
      });

      it('should return null when start mark not found', () => {
        const duration = monitor.measure('invalid-measure', 'nonexistent-start');

        expect(duration).toBeNull();
        expect(mockConsole.warn).toHaveBeenCalledWith('[PERF] Start mark "nonexistent-start" not found');
      });

      it('should return null when end mark not found', () => {
        const duration = monitor.measure('invalid-measure', 'start-mark', 'nonexistent-end');

        expect(duration).toBeNull();
        expect(mockConsole.warn).toHaveBeenCalledWith('[PERF] End mark "nonexistent-end" not found');
      });

      it('should call window.performance.measure when available', () => {
        monitor.measure('perf-measure', 'start-mark', 'end-mark');

        expect(mockPerformance.measure).toHaveBeenCalledWith('perf-measure', 'start-mark', 'end-mark');
      });

      it('should handle window.performance.measure errors gracefully', () => {
        mockPerformance.measure.mockImplementation(() => {
          throw new Error('Performance API error');
        });

        expect(() => monitor.measure('error-measure', 'start-mark', 'end-mark')).not.toThrow();
      });

      it('should handle missing window.performance gracefully', () => {
        delete (global as any).window;

        const duration = monitor.measure('no-window-measure', 'start-mark', 'end-mark');

        expect(duration).toBe(500);
      });

      it('should warn about slow operations over 1000ms', () => {
        mockPerformance.now.mockReturnValue(3000); // 2000ms duration
        const duration = monitor.measure('slow-measure', 'start-mark');

        expect(duration).toBe(2000);
        expect(mockConsole.warn).toHaveBeenCalledWith('[PERF] Slow operation detected: slow-measure took 2000.00ms');
      });

      it('should not warn about fast operations under 1000ms', () => {
        const duration = monitor.measure('fast-measure', 'start-mark', 'end-mark');

        expect(duration).toBe(500);
        expect(mockConsole.warn).not.toHaveBeenCalledWith(expect.stringContaining('Slow operation detected'));
      });

      it('should store measures for later retrieval', () => {
        monitor.measure('stored-measure', 'start-mark', 'end-mark');

        const measures = monitor.getMeasures();
        expect(measures).toHaveLength(1);
        expect(measures[0]).toEqual({
          name: 'stored-measure',
          duration: 500
        });
      });
    });

    describe('getMarks', () => {
      it('should return empty array when no marks', () => {
        const marks = monitor.getMarks();
        expect(marks).toEqual([]);
      });

      it('should return all marks', () => {
        monitor.mark('mark1');
        monitor.mark('mark2', { test: true });

        const marks = monitor.getMarks();
        expect(marks).toHaveLength(2);
        expect(marks[0].name).toBe('mark1');
        expect(marks[1].name).toBe('mark2');
        expect(marks[1].metadata).toEqual({ test: true });
      });
    });

    describe('getMeasures', () => {
      it('should return empty array when no measures', () => {
        const measures = monitor.getMeasures();
        expect(measures).toEqual([]);
      });

      it('should return all measures', () => {
        monitor.mark('start');
        mockPerformance.now.mockReturnValue(1200);
        monitor.measure('measure1', 'start');
        monitor.measure('measure2', 'start');

        const measures = monitor.getMeasures();
        expect(measures).toHaveLength(2);
        expect(measures[0]).toEqual({ name: 'measure1', duration: 200 });
        expect(measures[1]).toEqual({ name: 'measure2', duration: 200 });
      });
    });

    describe('clear', () => {
      beforeEach(() => {
        monitor.mark('test-mark');
        monitor.mark('start');
        monitor.measure('test-measure', 'start');
      });

      it('should clear all marks and measures', () => {
        monitor.clear();

        expect(monitor.getMarks()).toHaveLength(0);
        expect(monitor.getMeasures()).toHaveLength(0);
      });

      it('should call window.performance clear methods when available', () => {
        monitor.clear();

        expect(mockPerformance.clearMarks).toHaveBeenCalled();
        expect(mockPerformance.clearMeasures).toHaveBeenCalled();
      });

      it('should handle missing window.performance gracefully', () => {
        delete (global as any).window;

        expect(() => monitor.clear()).not.toThrow();
      });

      it('should handle missing clearMarks/clearMeasures methods gracefully', () => {
        (global as any).window = { performance: {} };

        expect(() => monitor.clear()).not.toThrow();
      });
    });

    describe('report', () => {
      beforeEach(() => {
        monitor.mark('mark1');
        monitor.mark('start');
        mockPerformance.now.mockReturnValue(1300);
        monitor.measure('measure1', 'start');
      });

      it('should return metrics with marks and measures', () => {
        const mockDateNow = 1234567890;
        jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);

        const metrics = monitor.report();

        expect(metrics).toEqual({
          marks: expect.arrayContaining([
            expect.objectContaining({ name: 'mark1' }),
            expect.objectContaining({ name: 'start' })
          ]),
          measures: [{ name: 'measure1', duration: 300 }],
          timestamp: mockDateNow
        });

        Date.now.mockRestore();
      });

      it('should log measures in table format', () => {
        monitor.report();

        expect(mockConsole.table).toHaveBeenCalledWith([
          { name: 'measure1', duration: 300 }
        ]);
      });

      it('should return empty metrics when no data', () => {
        const emptyMonitor = new PerformanceMonitor();
        const metrics = emptyMonitor.report();

        expect(metrics.marks).toHaveLength(0);
        expect(metrics.measures).toHaveLength(0);
        expect(typeof metrics.timestamp).toBe('number');
      });
    });
  });

  describe('singleton and convenience functions', () => {
    it('should export a singleton instance', () => {
      expect(perfMonitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('should provide perfMark convenience function', () => {
      const metadata = { test: true };
      perfMark('convenience-mark', metadata);

      const marks = perfMonitor.getMarks();
      const mark = marks.find(m => m.name === 'convenience-mark');
      expect(mark).toBeTruthy();
      expect(mark?.metadata).toEqual(metadata);
    });

    it('should provide perfMeasure convenience function', () => {
      perfMark('start');
      mockPerformance.now.mockReturnValue(1500);
      const duration = perfMeasure('convenience-measure', 'start');

      expect(duration).toBe(500);
      expect(mockConsole.log).toHaveBeenCalledWith('[PERF] Measure: convenience-measure = 500.00ms');
    });
  });

  describe('PERF_MARKS constants', () => {
    it('should export predefined performance marks', () => {
      expect(PERF_MARKS.SIGN_IN_START).toBe('signIn:start');
      expect(PERF_MARKS.SIGN_IN_SUCCESS).toBe('signIn:success');
      expect(PERF_MARKS.FIRST_PAINT).toBe('signIn:firstPaint');
      expect(PERF_MARKS.MODAL_OPEN_START).toBe('modal:openStart');
      expect(PERF_MARKS.MODAL_CODE_LOADED).toBe('modal:codeLoaded');
      expect(PERF_MARKS.MODAL_DATA_READY).toBe('modal:dataReady');
      expect(PERF_MARKS.MODAL_INTERACTIVE).toBe('modal:interactive');
      expect(PERF_MARKS.GAME_LOAD_START).toBe('game:loadStart');
      expect(PERF_MARKS.GAME_LOAD_COMPLETE).toBe('game:loadComplete');
      expect(PERF_MARKS.GAME_SAVE_START).toBe('game:saveStart');
      expect(PERF_MARKS.GAME_SAVE_COMPLETE).toBe('game:saveComplete');
      expect(PERF_MARKS.FETCH_GAMES_START).toBe('fetch:gamesStart');
      expect(PERF_MARKS.FETCH_GAMES_COMPLETE).toBe('fetch:gamesComplete');
      expect(PERF_MARKS.FETCH_STATS_START).toBe('fetch:statsStart');
      expect(PERF_MARKS.FETCH_STATS_COMPLETE).toBe('fetch:statsComplete');
    });

    it('should have consistent values across imports', () => {
      // Test that the constants maintain their values
      const marks1 = PERF_MARKS;
      const marks2 = PERF_MARKS;
      
      expect(marks1).toBe(marks2);
      expect(marks1.SIGN_IN_START).toBe('signIn:start');
    });
  });

  describe('measureComponentRender', () => {
    it('should return start and end functions', () => {
      const render = measureComponentRender('TestComponent');

      expect(typeof render.start).toBe('function');
      expect(typeof render.end).toBe('function');
    });

    it('should mark start and end of component render', () => {
      const render = measureComponentRender('TestComponent');

      render.start();
      mockPerformance.now.mockReturnValue(1200);
      render.end();

      const marks = perfMonitor.getMarks();
      const startMark = marks.find(m => m.name === 'render:TestComponent:start');
      const endMark = marks.find(m => m.name === 'render:TestComponent:end');

      expect(startMark).toBeTruthy();
      expect(endMark).toBeTruthy();
    });

    it('should measure component render duration', () => {
      const render = measureComponentRender('TestComponent');

      render.start();
      mockPerformance.now.mockReturnValue(1300);
      render.end();

      const measures = perfMonitor.getMeasures();
      const renderMeasure = measures.find(m => m.name === 'render:TestComponent');

      expect(renderMeasure).toBeTruthy();
      expect(renderMeasure?.duration).toBe(300);
    });

    it('should handle different component names', () => {
      const render1 = measureComponentRender('Component1');
      const render2 = measureComponentRender('Component2');

      render1.start();
      render2.start();
      mockPerformance.now.mockReturnValue(1150);
      render1.end();
      mockPerformance.now.mockReturnValue(1250);
      render2.end();

      const measures = perfMonitor.getMeasures();
      expect(measures.find(m => m.name === 'render:Component1')?.duration).toBe(150);
      expect(measures.find(m => m.name === 'render:Component2')?.duration).toBe(250);
    });
  });

  describe('measureAsync', () => {
    it('should measure successful async operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await measureAsync('async-op', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();

      const marks = perfMonitor.getMarks();
      expect(marks.find(m => m.name === 'async-op:start')).toBeTruthy();
      expect(marks.find(m => m.name === 'async-op:end')).toBeTruthy();

      const measures = perfMonitor.getMeasures();
      expect(measures.find(m => m.name === 'async-op')).toBeTruthy();
    });

    it('should measure failed async operation', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(measureAsync('failing-op', operation)).rejects.toThrow('Operation failed');

      const marks = perfMonitor.getMarks();
      expect(marks.find(m => m.name === 'failing-op:start')).toBeTruthy();
      expect(marks.find(m => m.name === 'failing-op:error')).toBeTruthy();

      const measures = perfMonitor.getMeasures();
      expect(measures.find(m => m.name === 'failing-op:failed')).toBeTruthy();
    });

    it('should handle operation that returns undefined', async () => {
      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await measureAsync('undefined-op', operation);

      expect(result).toBeUndefined();
      expect(operation).toHaveBeenCalled();

      const measures = perfMonitor.getMeasures();
      expect(measures.find(m => m.name === 'undefined-op')).toBeTruthy();
    });

    it('should handle operation that returns null', async () => {
      const operation = jest.fn().mockResolvedValue(null);

      const result = await measureAsync('null-op', operation);

      expect(result).toBeNull();

      const measures = perfMonitor.getMeasures();
      expect(measures.find(m => m.name === 'null-op')).toBeTruthy();
    });

    it('should handle operation that returns complex objects', async () => {
      const complexResult = { data: [1, 2, 3], metadata: { total: 3 } };
      const operation = jest.fn().mockResolvedValue(complexResult);

      const result = await measureAsync('complex-op', operation);

      expect(result).toEqual(complexResult);

      const measures = perfMonitor.getMeasures();
      expect(measures.find(m => m.name === 'complex-op')).toBeTruthy();
    });

    it('should measure multiple concurrent operations independently', async () => {
      const op1 = jest.fn().mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve('op1'), 100);
      }));
      const op2 = jest.fn().mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve('op2'), 200);
      }));

      const promise1 = measureAsync('concurrent-op1', op1);
      const promise2 = measureAsync('concurrent-op2', op2);

      jest.advanceTimersByTime(100);
      mockPerformance.now.mockReturnValue(1100);
      jest.advanceTimersByTime(100);
      mockPerformance.now.mockReturnValue(1200);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('op1');
      expect(result2).toBe('op2');

      const measures = perfMonitor.getMeasures();
      expect(measures.find(m => m.name === 'concurrent-op1')).toBeTruthy();
      expect(measures.find(m => m.name === 'concurrent-op2')).toBeTruthy();
    });
  });

  describe('edge cases and error handling', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    it('should handle performance.now returning negative values', () => {
      mockPerformance.now.mockReturnValue(-100);

      monitor.mark('negative-mark');
      const marks = monitor.getMarks();

      expect(marks[0].timestamp).toBe(-100);
    });

    it('should handle performance.now returning very large values', () => {
      mockPerformance.now.mockReturnValue(Number.MAX_SAFE_INTEGER);

      monitor.mark('large-mark');
      const marks = monitor.getMarks();

      expect(marks[0].timestamp).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle measuring when end mark timestamp is before start mark', () => {
      monitor.mark('later-mark');
      mockPerformance.now.mockReturnValue(500); // Earlier time
      monitor.mark('earlier-mark');

      const duration = monitor.measure('backwards-measure', 'later-mark', 'earlier-mark');

      expect(duration).toBe(-500); // Negative duration
      expect(mockConsole.log).toHaveBeenCalledWith('[PERF] Measure: backwards-measure = -500.00ms');
    });

    it('should handle marks with extremely long names', () => {
      const longName = 'a'.repeat(1000);

      monitor.mark(longName);
      const marks = monitor.getMarks();

      expect(marks[0].name).toBe(longName);
    });

    it('should handle marks with special characters', () => {
      const specialName = 'mark-with-🚀-emoji-and-symbols-!@#$%^&*()';

      monitor.mark(specialName);
      const marks = monitor.getMarks();

      expect(marks[0].name).toBe(specialName);
    });

    it('should handle metadata with circular references', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => monitor.mark('circular-mark', circularObj)).not.toThrow();
      
      const marks = monitor.getMarks();
      expect(marks[0].metadata).toBe(circularObj);
    });

    it('should handle very large metadata objects', () => {
      const largeMetadata = {
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }))
      };

      expect(() => monitor.mark('large-metadata-mark', largeMetadata)).not.toThrow();
      
      const marks = monitor.getMarks();
      expect(marks[0].metadata?.data).toHaveLength(1000);
    });

    it('should handle performance API throwing errors', () => {
      mockPerformance.now.mockImplementation(() => {
        throw new Error('Performance API error');
      });

      expect(() => monitor.mark('error-mark')).toThrow('Performance API error');
    });
  });
});