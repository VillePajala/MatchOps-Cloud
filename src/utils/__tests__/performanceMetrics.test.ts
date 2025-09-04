import { performanceMetrics, PerformanceMetricsCollector } from '../performanceMetrics';
import logger from '../logger';

// Mock logger
jest.mock('../logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

describe('performanceMetrics', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  // Mock performance API
  const mockPerformance = {
    getEntriesByType: jest.fn(),
    clearMeasures: jest.fn(),
  };

  // Mock sessionStorage
  const mockSessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup global mocks
    Object.defineProperty(global, 'performance', {
      value: mockPerformance,
      writable: true,
    });

    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });

    // Ensure window is available
    if (typeof window === 'undefined') {
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });
    }

    // Reset performance mock
    mockPerformance.getEntriesByType.mockReturnValue([]);
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default metrics when window is available', () => {
      const collector = new PerformanceMetricsCollector();
      const metrics = collector.getMetrics();

      expect(metrics.newGameModal.openToInteractive).toBeNull();
      expect(metrics.newGameModal.openToHydrated).toBeNull();
      expect(metrics.newGameModal.cacheHitRate).toBeNull();
      expect(metrics.newGameModal.lastMeasured).toBeNull();
      expect(metrics.loadGameModal.openToInteractive).toBeNull();
      expect(metrics.loadGameModal.lastMeasured).toBeNull();
      expect(metrics.supabaseWarmup.duration).toBeNull();
      expect(metrics.supabaseWarmup.lastMeasured).toBeNull();
    });

    it('should not set up interval when window is undefined', () => {
      // Temporarily remove window
      const originalWindow = global.window;
      delete (global as any).window;
      
      const collector = new PerformanceMetricsCollector();
      
      // Fast-forward time
      jest.advanceTimersByTime(10000);
      
      // Should not call performance APIs
      expect(mockPerformance.getEntriesByType).not.toHaveBeenCalled();

      // Restore window for other tests
      (global as any).window = originalWindow;
    });

    it('should set up metrics collection interval when window is available', () => {
      new PerformanceMetricsCollector();
      
      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);
      
      // Should call collectMetrics at least once
      expect(mockPerformance.getEntriesByType).toHaveBeenCalled();
    });
  });

  describe('collectMetrics', () => {
    let collector: PerformanceMetricsCollector;

    beforeEach(() => {
      collector = new PerformanceMetricsCollector();
      jest.clearAllMocks();
    });

    it('should collect new game modal interactive metrics', () => {
      const mockMeasures = [
        { name: 'new-game-modal-interactive-time', duration: 150 }
      ];
      mockPerformance.getEntriesByType.mockReturnValue(mockMeasures);

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.openToInteractive).toBe(150);
      expect(metrics.newGameModal.lastMeasured).toBe(Date.now());
    });

    it('should collect game creation data duration metrics', () => {
      const mockMeasures = [
        { name: 'game-creation-data-duration', duration: 250 }
      ];
      mockPerformance.getEntriesByType.mockReturnValue(mockMeasures);

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.openToHydrated).toBe(250);
    });

    it('should collect load game modal metrics', () => {
      const mockMeasures = [
        { name: 'load-game-modal-interactive', duration: 180 }
      ];
      mockPerformance.getEntriesByType.mockReturnValue(mockMeasures);

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.loadGameModal.openToInteractive).toBe(180);
      expect(metrics.loadGameModal.lastMeasured).toBe(Date.now());
    });

    it('should collect supabase warmup metrics', () => {
      const mockMeasures = [
        { name: 'supabase-warmup-duration', duration: 320 }
      ];
      mockPerformance.getEntriesByType.mockReturnValue(mockMeasures);

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.supabaseWarmup.duration).toBe(320);
      expect(metrics.supabaseWarmup.lastMeasured).toBe(Date.now());
    });

    it('should collect all metrics when multiple measures are available', () => {
      const mockMeasures = [
        { name: 'new-game-modal-interactive-time', duration: 150 },
        { name: 'game-creation-data-duration', duration: 250 },
        { name: 'load-game-modal-interactive', duration: 180 },
        { name: 'supabase-warmup-duration', duration: 320 }
      ];
      mockPerformance.getEntriesByType.mockReturnValue(mockMeasures);

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.openToInteractive).toBe(150);
      expect(metrics.newGameModal.openToHydrated).toBe(250);
      expect(metrics.loadGameModal.openToInteractive).toBe(180);
      expect(metrics.supabaseWarmup.duration).toBe(320);
    });

    it('should collect cache hit rate from session storage', () => {
      mockSessionStorage.getItem.mockReturnValue('{"hitRate": 0.85}');

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.cacheHitRate).toBe(0.85);
    });

    it('should handle invalid cache stats JSON gracefully', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid-json');

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.cacheHitRate).toBeNull();
    });

    it('should handle missing cache stats gracefully', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.cacheHitRate).toBeNull();
    });

    it('should return early when performance API is unavailable', () => {
      // Temporarily remove performance
      const originalPerformance = global.performance;
      delete (global as any).performance;

      jest.advanceTimersByTime(5000);

      // Should not throw and not log any metrics
      expect(mockLogger.debug).not.toHaveBeenCalled();

      // Restore performance for other tests
      (global as any).performance = originalPerformance;
    });

    it('should return early when getEntriesByType is unavailable', () => {
      // Temporarily replace performance with empty object
      const originalPerformance = global.performance;
      (global as any).performance = {};

      jest.advanceTimersByTime(5000);

      expect(mockLogger.debug).not.toHaveBeenCalled();

      // Restore performance for other tests
      (global as any).performance = originalPerformance;
    });

    it('should log collected metrics', () => {
      const mockMeasures = [
        { name: 'new-game-modal-interactive-time', duration: 150 }
      ];
      mockPerformance.getEntriesByType.mockReturnValue(mockMeasures);

      jest.advanceTimersByTime(5000);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[PerformanceMetrics] Collected metrics:',
        expect.objectContaining({
          newGameModal: expect.objectContaining({
            openToInteractive: 150
          })
        })
      );
    });

    it('should handle errors in metric collection gracefully', () => {
      mockPerformance.getEntriesByType.mockImplementation(() => {
        throw new Error('Performance API error');
      });

      jest.advanceTimersByTime(5000);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[PerformanceMetrics] Error collecting metrics:',
        expect.any(Error)
      );
    });

    it('should ignore metrics with unknown names', () => {
      const mockMeasures = [
        { name: 'unknown-metric', duration: 500 },
        { name: 'new-game-modal-interactive-time', duration: 150 }
      ];
      mockPerformance.getEntriesByType.mockReturnValue(mockMeasures);

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.openToInteractive).toBe(150);
      // Unknown metric should be ignored
    });
  });

  describe('getMetrics', () => {
    let collector: PerformanceMetricsCollector;

    beforeEach(() => {
      collector = new PerformanceMetricsCollector();
    });

    it('should return a copy of metrics', () => {
      const metrics1 = collector.getMetrics();
      const metrics2 = collector.getMetrics();

      expect(metrics1).toEqual(metrics2);
      expect(metrics1).not.toBe(metrics2); // Different objects
    });

    it('should return metrics with correct initial values', () => {
      const metrics = collector.getMetrics();

      expect(metrics).toEqual({
        newGameModal: {
          openToInteractive: null,
          openToHydrated: null,
          cacheHitRate: null,
          lastMeasured: null,
        },
        loadGameModal: {
          openToInteractive: null,
          lastMeasured: null,
        },
        supabaseWarmup: {
          duration: null,
          lastMeasured: null,
        },
      });
    });
  });

  describe('clearMetrics', () => {
    let collector: PerformanceMetricsCollector;

    beforeEach(() => {
      collector = new PerformanceMetricsCollector();
    });

    it('should call performance.clearMeasures when available', () => {
      collector.clearMetrics();

      expect(mockPerformance.clearMeasures).toHaveBeenCalledTimes(1);
    });

    it('should handle missing performance API gracefully', () => {
      // Temporarily remove performance
      const originalPerformance = global.performance;
      delete (global as any).performance;

      expect(() => collector.clearMetrics()).not.toThrow();

      // Restore performance for other tests
      (global as any).performance = originalPerformance;
    });

    it('should handle missing clearMeasures method gracefully', () => {
      // Temporarily replace performance with empty object
      const originalPerformance = global.performance;
      (global as any).performance = {};

      expect(() => collector.clearMetrics()).not.toThrow();

      // Restore performance for other tests
      (global as any).performance = originalPerformance;
    });
  });

  describe('recordCacheHitRate', () => {
    let collector: PerformanceMetricsCollector;

    beforeEach(() => {
      collector = new PerformanceMetricsCollector();
    });

    it('should update cache hit rate in metrics', () => {
      collector.recordCacheHitRate(0.75);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.cacheHitRate).toBe(0.75);
    });

    it('should save cache hit rate to session storage', () => {
      collector.recordCacheHitRate(0.90);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'gameCreationCacheStats',
        '{"hitRate":0.9}'
      );
    });

    it('should handle session storage errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => collector.recordCacheHitRate(0.85)).not.toThrow();

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.cacheHitRate).toBe(0.85);
    });

    it('should handle zero cache hit rate', () => {
      collector.recordCacheHitRate(0);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.cacheHitRate).toBe(0);
    });

    it('should handle maximum cache hit rate', () => {
      collector.recordCacheHitRate(1);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.cacheHitRate).toBe(1);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(performanceMetrics).toBeInstanceOf(PerformanceMetricsCollector);
    });

    it('should maintain state across calls', () => {
      performanceMetrics.recordCacheHitRate(0.95);
      
      const metrics = performanceMetrics.getMetrics();
      expect(metrics.newGameModal.cacheHitRate).toBe(0.95);
    });
  });

  describe('edge cases', () => {
    let collector: PerformanceMetricsCollector;

    beforeEach(() => {
      collector = new PerformanceMetricsCollector();
    });

    it('should handle very large duration values', () => {
      const mockMeasures = [
        { name: 'new-game-modal-interactive-time', duration: Number.MAX_SAFE_INTEGER }
      ];
      mockPerformance.getEntriesByType.mockReturnValue(mockMeasures);

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.openToInteractive).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle negative duration values', () => {
      const mockMeasures = [
        { name: 'supabase-warmup-duration', duration: -10 }
      ];
      mockPerformance.getEntriesByType.mockReturnValue(mockMeasures);

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.supabaseWarmup.duration).toBe(-10);
    });

    it('should handle multiple metrics collection cycles', () => {
      const firstMeasures = [
        { name: 'new-game-modal-interactive-time', duration: 100 }
      ];
      const secondMeasures = [
        { name: 'load-game-modal-interactive', duration: 200 }
      ];

      // First cycle
      mockPerformance.getEntriesByType.mockReturnValue(firstMeasures);
      jest.advanceTimersByTime(5000);

      // Second cycle
      mockPerformance.getEntriesByType.mockReturnValue(secondMeasures);
      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.openToInteractive).toBe(100);
      expect(metrics.loadGameModal.openToInteractive).toBe(200);
    });

    it('should handle empty measures array', () => {
      mockPerformance.getEntriesByType.mockReturnValue([]);

      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.newGameModal.openToInteractive).toBeNull();
      expect(metrics.loadGameModal.openToInteractive).toBeNull();
      expect(metrics.supabaseWarmup.duration).toBeNull();
    });

    it('should handle session storage being undefined', () => {
      // Temporarily remove sessionStorage
      const originalSessionStorage = global.sessionStorage;
      delete (global as any).sessionStorage;

      jest.advanceTimersByTime(5000);

      // Should not throw
      expect(() => collector.recordCacheHitRate(0.5)).not.toThrow();

      // Restore sessionStorage for other tests
      (global as any).sessionStorage = originalSessionStorage;
    });
  });
});