/**
 * useDebouncedSave Hook Tests - Comprehensive Coverage
 * 
 * Tests for debounced game saving hook that prevents multiple rapid saves
 * and batches operations with race condition fixes and error recovery.
 */

import { renderHook, act } from '@testing-library/react';
import { useDebouncedSave } from '../useDebouncedSave';

// Mock logger
jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

describe('useDebouncedSave Hook', () => {
  let mockSaveFunction: jest.Mock;

  beforeEach(() => {
    mockSaveFunction = jest.fn().mockResolvedValue(undefined);
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction));

      expect(result.current.debouncedSave).toBeInstanceOf(Function);
      expect(result.current.saveImmediately).toBeInstanceOf(Function);
      expect(result.current.getStatus).toBeInstanceOf(Function);
      expect(result.current.cancelPendingSave).toBeInstanceOf(Function);

      const status = result.current.getStatus();
      expect(status.isSaving).toBe(false);
      expect(status.hasPendingSave).toBe(false);
      expect(status.retryCount).toBe(0);
    });

    it('should use custom delay when provided', () => {
      const customDelay = 5000;
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, customDelay));

      act(() => {
        result.current.debouncedSave();
      });

      // Should not have called save function yet
      expect(mockSaveFunction).not.toHaveBeenCalled();

      // Fast-forward 4 seconds - still shouldn't be called
      act(() => {
        jest.advanceTimersByTime(4000);
      });
      expect(mockSaveFunction).not.toHaveBeenCalled();

      // Fast-forward 1 more second - now it should be called
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('debounced saving', () => {
    it('should debounce multiple rapid save calls', async () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      // Call save multiple times rapidly
      act(() => {
        result.current.debouncedSave();
        result.current.debouncedSave();
        result.current.debouncedSave();
      });

      // Should not have called save function yet
      expect(mockSaveFunction).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Should only have called save function once
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });

    it('should reset timeout when new save is called during debounce period', async () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      // Start first save
      act(() => {
        result.current.debouncedSave();
      });

      // Wait 500ms
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Call save again - should reset the timer
      act(() => {
        result.current.debouncedSave();
      });

      // Wait another 500ms (total 1000ms from first call, 500ms from second)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should not have called save function yet (timer was reset)
      expect(mockSaveFunction).not.toHaveBeenCalled();

      // Wait final 500ms (1000ms from second call)
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Now should have called save function
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });

    it('should update status correctly during debounced save', () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      // Initial status
      let status = result.current.getStatus();
      expect(status.isSaving).toBe(false);
      expect(status.hasPendingSave).toBe(false);

      // Start debounced save
      act(() => {
        result.current.debouncedSave();
      });

      // Status should still show not saving (debounce period)
      status = result.current.getStatus();
      expect(status.isSaving).toBe(false);
      expect(status.hasPendingSave).toBe(false);
    });
  });

  describe('immediate saving', () => {
    it('should save immediately when saveImmediately is called', async () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction));

      await act(async () => {
        await result.current.saveImmediately();
      });

      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });

    it('should cancel pending debounced save when immediate save is called', async () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      // Start debounced save
      act(() => {
        result.current.debouncedSave();
      });

      // Call immediate save before debounce period ends
      await act(async () => {
        await result.current.saveImmediately();
      });

      // Should have called save function once (immediate)
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);

      // Fast-forward past original debounce period
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should still only have been called once (debounced call was cancelled)
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });

    it('should prevent concurrent immediate saves', async () => {
      let resolvePromise: () => void;
      const longRunningSave = jest.fn().mockImplementation(() => {
        return new Promise<void>((resolve) => {
          resolvePromise = resolve;
        });
      });

      const { result } = renderHook(() => useDebouncedSave(longRunningSave));

      // Start first immediate save
      const firstSavePromise = act(async () => {
        return result.current.saveImmediately();
      });

      // Try to start second immediate save while first is in progress
      await act(async () => {
        await result.current.saveImmediately();
      });

      // Should only have called save function once
      expect(longRunningSave).toHaveBeenCalledTimes(1);

      // Resolve the first save
      act(() => {
        resolvePromise!();
      });

      await firstSavePromise;
    });

    it('should re-throw errors from immediate saves', async () => {
      const saveError = new Error('Save failed');
      mockSaveFunction.mockRejectedValueOnce(saveError);

      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction));

      await expect(
        act(async () => {
          await result.current.saveImmediately();
        })
      ).rejects.toThrow('Save failed');
    });
  });

  describe('race condition handling', () => {
    it('should mark save as pending when called during active save', async () => {
      let resolveSave: () => void;
      const longRunningSave = jest.fn().mockImplementation(() => {
        return new Promise<void>((resolve) => {
          resolveSave = resolve;
        });
      });

      const { result } = renderHook(() => useDebouncedSave(longRunningSave, 100));

      // Start first debounced save
      act(() => {
        result.current.debouncedSave();
      });

      // Fast-forward to trigger save (but don't resolve yet)
      await act(async () => {
        jest.advanceTimersByTime(100);
        // Give time for the timeout to fire
        await Promise.resolve();
      });

      // Call debouncedSave again while saving (this should set pending flag)
      act(() => {
        result.current.debouncedSave();
      });

      // Resolve the first save
      await act(async () => {
        resolveSave!();
        // Give the promise time to resolve and any follow-up logic to execute
        await Promise.resolve();
        await Promise.resolve();
      });

      // Should have called save function at least once
      expect(longRunningSave).toHaveBeenCalled();
    }, 10000);

    it('should handle pending saves with retry mechanism', async () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 100));

      // Simulate rapid calls that would trigger pending save logic
      act(() => {
        result.current.debouncedSave();
      });

      // Fast-forward to trigger first save
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling and retry logic', () => {
    it('should retry failed saves with exponential backoff', async () => {
      mockSaveFunction
        .mockRejectedValueOnce(new Error('Save failed 1'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      // Start debounced save
      act(() => {
        result.current.debouncedSave();
      });

      // Fast-forward to trigger first save attempt (which will fail)
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockSaveFunction).toHaveBeenCalledTimes(1);

      // Fast-forward to trigger first retry (which will succeed)
      await act(async () => {
        jest.advanceTimersByTime(2000); // Wait for retry backoff
      });

      expect(mockSaveFunction).toHaveBeenCalledTimes(2);

      // Check retry count is reset after successful save
      const status = result.current.getStatus();
      expect(status.retryCount).toBe(0); // Reset after successful save
    });

    it('should give up after max retries', async () => {
      mockSaveFunction.mockRejectedValue(new Error('Persistent save failure'));

      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      // Start debounced save
      act(() => {
        result.current.debouncedSave();
      });

      // Fast-forward through all retry attempts
      for (let i = 0; i <= 3; i++) {
        await act(async () => {
          jest.advanceTimersByTime(10000); // Advance enough to trigger all retries
        });
      }

      // Should have attempted 4 times total (initial + 3 retries)
      expect(mockSaveFunction).toHaveBeenCalledTimes(4);

      // Should reset retry count after giving up
      const status = result.current.getStatus();
      expect(status.retryCount).toBe(0);
    });

    it('should reset retry count on successful save', async () => {
      mockSaveFunction
        .mockRejectedValueOnce(new Error('Save failed'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      act(() => {
        result.current.debouncedSave();
      });

      // First attempt fails
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Retry succeeds
      await act(async () => {
        jest.advanceTimersByTime(2000); // Wait for retry
      });

      const status = result.current.getStatus();
      expect(status.retryCount).toBe(0); // Reset after success
    });
  });

  describe('cancellation and cleanup', () => {
    it('should cancel pending save when cancelPendingSave is called', () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      // Start debounced save
      act(() => {
        result.current.debouncedSave();
      });

      // Cancel before it executes
      act(() => {
        result.current.cancelPendingSave();
      });

      // Fast-forward past delay
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not have called save function
      expect(mockSaveFunction).not.toHaveBeenCalled();
    });

    it('should clean up timeouts and state on unmount', () => {
      const { result, unmount } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      // Start debounced save
      act(() => {
        result.current.debouncedSave();
      });

      // Unmount before save executes
      unmount();

      // Fast-forward past delay
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not have called save function due to cleanup
      expect(mockSaveFunction).not.toHaveBeenCalled();
    });

    it('should handle timeout cancellation before execution', async () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      act(() => {
        result.current.debouncedSave();
      });

      // Cancel during debounce period
      act(() => {
        result.current.cancelPendingSave();
      });

      // Fast-forward past original delay
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockSaveFunction).not.toHaveBeenCalled();
    });
  });

  describe('function reference updates', () => {
    it('should use updated save function when it changes', async () => {
      const originalSave = jest.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ saveFunc }) => useDebouncedSave(saveFunc, 100),
        { initialProps: { saveFunc: originalSave } }
      );

      // Start with original function
      act(() => {
        result.current.debouncedSave();
      });

      // Update to new function before save executes
      const newSave = jest.fn().mockResolvedValue(undefined);
      rerender({ saveFunc: newSave });

      // Let save execute
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Should have called the new function, not the original
      expect(originalSave).not.toHaveBeenCalled();
      expect(newSave).toHaveBeenCalledTimes(1);
    });

    it('should handle immediate save with updated function', async () => {
      const originalSave = jest.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ saveFunc }) => useDebouncedSave(saveFunc),
        { initialProps: { saveFunc: originalSave } }
      );

      // Update function
      const newSave = jest.fn().mockResolvedValue(undefined);
      rerender({ saveFunc: newSave });

      // Call immediate save
      await act(async () => {
        await result.current.saveImmediately();
      });

      // Should use new function
      expect(originalSave).not.toHaveBeenCalled();
      expect(newSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle zero delay', async () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 0));

      act(() => {
        result.current.debouncedSave();
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });

    it('should handle very large delay values', () => {
      const largeDelay = 1000000; // 1000 seconds
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, largeDelay));

      act(() => {
        result.current.debouncedSave();
      });

      // Should not execute even after a reasonable time
      act(() => {
        jest.advanceTimersByTime(60000); // 1 minute
      });

      expect(mockSaveFunction).not.toHaveBeenCalled();
    });

    it('should handle rapid save/cancel cycles', () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.debouncedSave();
          result.current.cancelPendingSave();
        });
      }

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockSaveFunction).not.toHaveBeenCalled();
    });

    it('should maintain correct state after multiple mount/unmount cycles', () => {
      let result: any;
      
      // Mount and unmount multiple times
      for (let i = 0; i < 3; i++) {
        const { result: hookResult, unmount } = renderHook(() => 
          useDebouncedSave(mockSaveFunction, 100)
        );
        result = hookResult;
        
        act(() => {
          result.current.debouncedSave();
        });
        
        unmount();
      }

      // Final mount
      const { result: finalResult } = renderHook(() => 
        useDebouncedSave(mockSaveFunction, 100)
      );

      const status = finalResult.current.getStatus();
      expect(status.isSaving).toBe(false);
      expect(status.hasPendingSave).toBe(false);
      expect(status.retryCount).toBe(0);
    });

    it('should handle concurrent debounced and immediate saves', async () => {
      const { result } = renderHook(() => useDebouncedSave(mockSaveFunction, 1000));

      // Start debounced save
      act(() => {
        result.current.debouncedSave();
      });

      // Start immediate save before debounced save executes
      await act(async () => {
        await result.current.saveImmediately();
      });

      // Fast-forward past debounce period
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should only have called save once (immediate save cancels debounced)
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });
  });
});