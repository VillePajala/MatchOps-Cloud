import { LoadingRegistry, loadingRegistry } from '../loadingRegistry';

describe('LoadingRegistry', () => {
  let registry: LoadingRegistry;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    registry = new LoadingRegistry();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    consoleDebugSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('setLoading', () => {
    it('should start tracking a loading operation', () => {
      registry.setLoading('test-id', true, undefined, undefined, 'test-operation');

      expect(registry.isLoading('test-id')).toBe(true);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[LoadingRegistry] Started tracking "test-operation" for ID "test-id"'
      );
    });

    it('should stop tracking when loading is set to false', () => {
      registry.setLoading('test-id', true, undefined, undefined, 'test-operation');
      expect(registry.isLoading('test-id')).toBe(true);

      registry.setLoading('test-id', false);
      expect(registry.isLoading('test-id')).toBe(false);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[LoadingRegistry\] Completed "test-operation" for ID "test-id" in \d+ms/)
      );
    });

    it('should clear existing timeout when setting new loading for same ID', () => {
      const onTimeout = jest.fn();
      
      // Start first loading
      registry.setLoading('test-id', true, onTimeout, 1000, 'operation-1');
      
      // Start second loading for same ID
      registry.setLoading('test-id', true, onTimeout, 2000, 'operation-2');
      
      // Fast-forward to first timeout time
      jest.advanceTimersByTime(1000);
      
      // First timeout should not have fired
      expect(onTimeout).not.toHaveBeenCalled();
      expect(registry.isLoading('test-id')).toBe(true);
    });

    it('should use default timeout when none provided', () => {
      const onTimeout = jest.fn();
      registry.setLoading('test-id', true, onTimeout);

      // Fast-forward to default timeout (10 seconds)
      jest.advanceTimersByTime(10000);

      expect(onTimeout).toHaveBeenCalledWith('test-id');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LoadingRegistry] Operation "unknown" for ID "test-id" timed out after 10000ms'
      );
      expect(registry.isLoading('test-id')).toBe(false);
    });

    it('should use custom timeout when provided', () => {
      const onTimeout = jest.fn();
      registry.setLoading('test-id', true, onTimeout, 5000, 'custom-operation');

      // Fast-forward to custom timeout
      jest.advanceTimersByTime(5000);

      expect(onTimeout).toHaveBeenCalledWith('test-id');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LoadingRegistry] Operation "custom-operation" for ID "test-id" timed out after 5000ms'
      );
      expect(registry.isLoading('test-id')).toBe(false);
    });

    it('should not timeout if loading is stopped before timeout', () => {
      const onTimeout = jest.fn();
      registry.setLoading('test-id', true, onTimeout, 5000);

      // Stop loading before timeout
      jest.advanceTimersByTime(2000);
      registry.setLoading('test-id', false);

      // Continue to timeout time
      jest.advanceTimersByTime(3000);

      expect(onTimeout).not.toHaveBeenCalled();
      expect(registry.isLoading('test-id')).toBe(false);
    });

    it('should handle timeout callback gracefully when not provided', () => {
      registry.setLoading('test-id', true, undefined, 1000);

      expect(() => {
        jest.advanceTimersByTime(1000);
      }).not.toThrow();

      expect(registry.isLoading('test-id')).toBe(false);
    });
  });

  describe('isLoading', () => {
    it('should return false for non-existent ID', () => {
      expect(registry.isLoading('non-existent')).toBe(false);
    });

    it('should return true for active loading operation', () => {
      registry.setLoading('active-id', true);
      expect(registry.isLoading('active-id')).toBe(true);
    });

    it('should return false after loading is stopped', () => {
      registry.setLoading('test-id', true);
      registry.setLoading('test-id', false);
      expect(registry.isLoading('test-id')).toBe(false);
    });
  });

  describe('getLoadingOperations', () => {
    it('should return empty array when no operations are loading', () => {
      expect(registry.getLoadingOperations()).toEqual([]);
    });

    it('should return current loading operations with durations', () => {
      const startTime = Date.now();
      jest.setSystemTime(startTime);

      registry.setLoading('op1', true, undefined, undefined, 'operation-1');
      
      jest.advanceTimersByTime(1000);
      registry.setLoading('op2', true, undefined, undefined, 'operation-2');
      
      jest.advanceTimersByTime(500);

      const operations = registry.getLoadingOperations();
      
      expect(operations).toHaveLength(2);
      expect(operations).toEqual(
        expect.arrayContaining([
          { id: 'op1', operation: 'operation-1', duration: 1500 },
          { id: 'op2', operation: 'operation-2', duration: 500 }
        ])
      );
    });

    it('should update durations correctly over time', () => {
      registry.setLoading('test-id', true, undefined, undefined, 'test-op');
      
      jest.advanceTimersByTime(2000);
      let operations = registry.getLoadingOperations();
      expect(operations[0].duration).toBe(2000);
      
      jest.advanceTimersByTime(1000);
      operations = registry.getLoadingOperations();
      expect(operations[0].duration).toBe(3000);
    });
  });

  describe('clearAll', () => {
    it('should clear all loading operations', () => {
      registry.setLoading('op1', true, undefined, undefined, 'operation-1');
      registry.setLoading('op2', true, undefined, undefined, 'operation-2');
      registry.setLoading('op3', true, undefined, undefined, 'operation-3');

      expect(registry.getLoadingOperations()).toHaveLength(3);

      registry.clearAll();

      expect(registry.getLoadingOperations()).toHaveLength(0);
      expect(registry.isLoading('op1')).toBe(false);
      expect(registry.isLoading('op2')).toBe(false);
      expect(registry.isLoading('op3')).toBe(false);
    });

    it('should clear all timeouts to prevent memory leaks', () => {
      const onTimeout1 = jest.fn();
      const onTimeout2 = jest.fn();

      registry.setLoading('op1', true, onTimeout1, 5000);
      registry.setLoading('op2', true, onTimeout2, 3000);

      registry.clearAll();

      // Fast-forward past all timeout times
      jest.advanceTimersByTime(10000);

      // No timeouts should fire
      expect(onTimeout1).not.toHaveBeenCalled();
      expect(onTimeout2).not.toHaveBeenCalled();
    });

    it('should log completion for each cleared operation', () => {
      registry.setLoading('op1', true, undefined, undefined, 'operation-1');
      registry.setLoading('op2', true, undefined, undefined, 'operation-2');

      registry.clearAll();

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[LoadingRegistry\] Completed "operation-1" for ID "op1" in \d+ms/)
      );
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[LoadingRegistry\] Completed "operation-2" for ID "op2" in \d+ms/)
      );
    });
  });

  describe('edge cases', () => {
    it('should handle multiple operations with same ID correctly', () => {
      const onTimeout1 = jest.fn();
      const onTimeout2 = jest.fn();

      // Start first operation
      registry.setLoading('same-id', true, onTimeout1, 2000, 'operation-1');
      
      // Start second operation with same ID (should clear first)
      registry.setLoading('same-id', true, onTimeout2, 3000, 'operation-2');

      // Fast-forward to first timeout
      jest.advanceTimersByTime(2000);
      expect(onTimeout1).not.toHaveBeenCalled(); // Should be cleared
      expect(registry.isLoading('same-id')).toBe(true);

      // Fast-forward to second timeout
      jest.advanceTimersByTime(1000);
      expect(onTimeout2).toHaveBeenCalledWith('same-id');
      expect(registry.isLoading('same-id')).toBe(false);
    });

    it('should handle clearing non-existent operation gracefully', () => {
      expect(() => {
        registry.setLoading('non-existent', false);
      }).not.toThrow();
    });

    it('should handle zero timeout', () => {
      const onTimeout = jest.fn();
      registry.setLoading('test-id', true, onTimeout, 0);

      // Zero timeout means it fires immediately on next tick
      jest.runOnlyPendingTimers();

      expect(onTimeout).toHaveBeenCalledWith('test-id');
      expect(registry.isLoading('test-id')).toBe(false);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(loadingRegistry).toBeInstanceOf(LoadingRegistry);
    });

    it('should maintain state across calls to singleton', () => {
      loadingRegistry.setLoading('singleton-test', true);
      expect(loadingRegistry.isLoading('singleton-test')).toBe(true);
      
      loadingRegistry.setLoading('singleton-test', false);
      expect(loadingRegistry.isLoading('singleton-test')).toBe(false);
    });
  });
});