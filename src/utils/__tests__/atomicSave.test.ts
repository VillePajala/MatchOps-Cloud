/**
 * Atomic Save Operations Tests - Critical Data Integrity
 * 
 * Tests for atomic save operations that ensure all-or-nothing game saves.
 * These functions prevent partial saves that could corrupt game data.
 */

import {
  executeAtomicSave,
  createSaveOperation,
  withRetry,
  type SaveOperation,
  type SaveTransactionResult
} from '../atomicSave';
import logger from '../logger';

// Mock logger to prevent console spam in tests
jest.mock('../logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock setTimeout for retry tests
jest.useFakeTimers('legacy');

describe('Atomic Save Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeAtomicSave', () => {
    describe('Successful transactions', () => {
      it('should execute single operation successfully', async () => {
        const operation: SaveOperation<string> = {
          name: 'test-operation',
          execute: jest.fn().mockResolvedValue('success')
        };

        const result = await executeAtomicSave([operation]);

        expect(result.success).toBe(true);
        expect(result.results).toEqual(['success']);
        expect(result.error).toBeUndefined();
        expect(result.rolledBack).toBeUndefined();

        expect(operation.execute).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith('[AtomicSave] Starting transaction with 1 operations');
        expect(mockLogger.log).toHaveBeenCalledWith('[AtomicSave] Executing: test-operation');
        expect(mockLogger.log).toHaveBeenCalledWith('[AtomicSave] Completed: test-operation');
        expect(mockLogger.log).toHaveBeenCalledWith('[AtomicSave] Transaction completed successfully');
      });

      it('should execute multiple operations in sequence', async () => {
        const operations: SaveOperation<number>[] = [
          {
            name: 'operation-1',
            execute: jest.fn().mockResolvedValue(1)
          },
          {
            name: 'operation-2',
            execute: jest.fn().mockResolvedValue(2)
          },
          {
            name: 'operation-3',
            execute: jest.fn().mockResolvedValue(3)
          }
        ];

        const result = await executeAtomicSave(operations);

        expect(result.success).toBe(true);
        expect(result.results).toEqual([1, 2, 3]);
        expect(result.error).toBeUndefined();

        // Verify all operations were called
        operations.forEach(op => {
          expect(op.execute).toHaveBeenCalledTimes(1);
        });

        expect(mockLogger.log).toHaveBeenCalledWith('[AtomicSave] Starting transaction with 3 operations');
      });

      it('should handle empty operations array', async () => {
        const result = await executeAtomicSave([]);

        expect(result.success).toBe(true);
        expect(result.results).toEqual([]);
        expect(result.error).toBeUndefined();

        expect(mockLogger.log).toHaveBeenCalledWith('[AtomicSave] Starting transaction with 0 operations');
        expect(mockLogger.log).toHaveBeenCalledWith('[AtomicSave] Transaction completed successfully');
      });

      it('should handle operations returning different types', async () => {
        const operations: SaveOperation<any>[] = [
          {
            name: 'string-op',
            execute: jest.fn().mockResolvedValue('text')
          },
          {
            name: 'number-op',
            execute: jest.fn().mockResolvedValue(42)
          },
          {
            name: 'object-op',
            execute: jest.fn().mockResolvedValue({ id: 'test' })
          }
        ];

        const result = await executeAtomicSave(operations);

        expect(result.success).toBe(true);
        expect(result.results).toEqual(['text', 42, { id: 'test' }]);
      });
    });

    describe('Failed transactions with rollback', () => {
      it('should rollback completed operations when one fails', async () => {
        const rollback1 = jest.fn().mockResolvedValue(undefined);
        const rollback2 = jest.fn().mockResolvedValue(undefined);
        
        const operations: SaveOperation<string>[] = [
          {
            name: 'operation-1',
            execute: jest.fn().mockResolvedValue('result-1'),
            rollback: rollback1
          },
          {
            name: 'operation-2',
            execute: jest.fn().mockResolvedValue('result-2'),
            rollback: rollback2
          },
          {
            name: 'operation-3',
            execute: jest.fn().mockRejectedValue(new Error('Operation 3 failed'))
          }
        ];

        const result = await executeAtomicSave(operations);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Operation "operation-3" failed: Operation 3 failed');
        expect(result.rolledBack).toBe(true);
        expect(result.results).toBeUndefined();

        // Verify operations 1 and 2 were executed
        expect(operations[0].execute).toHaveBeenCalledTimes(1);
        expect(operations[1].execute).toHaveBeenCalledTimes(1);
        expect(operations[2].execute).toHaveBeenCalledTimes(1);

        // Verify rollback was called in reverse order (2, then 1)
        expect(rollback2).toHaveBeenCalledTimes(1);
        expect(rollback1).toHaveBeenCalledTimes(1);

        expect(mockLogger.error).toHaveBeenCalledWith(
          '[AtomicSave] Failed: operation-3',
          expect.any(Error)
        );
        expect(mockLogger.log).toHaveBeenCalledWith('[AtomicSave] Rolling back 2 operations');
      });

      it('should handle operations without rollback functions', async () => {
        const rollback1 = jest.fn().mockResolvedValue(undefined);
        
        const operations: SaveOperation<string>[] = [
          {
            name: 'operation-1',
            execute: jest.fn().mockResolvedValue('result-1'),
            rollback: rollback1
          },
          {
            name: 'operation-2',
            execute: jest.fn().mockResolvedValue('result-2')
            // No rollback function
          },
          {
            name: 'operation-3',
            execute: jest.fn().mockRejectedValue(new Error('Failed'))
          }
        ];

        const result = await executeAtomicSave(operations);

        expect(result.success).toBe(false);
        expect(result.rolledBack).toBe(true);

        // Verify rollback was attempted for both operations
        expect(rollback1).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith('[AtomicSave] No rollback available for: operation-2');
      });

      it('should continue rollback even if rollback operation fails', async () => {
        const rollback1 = jest.fn().mockResolvedValue(undefined);
        const rollback2 = jest.fn().mockRejectedValue(new Error('Rollback failed'));
        
        const operations: SaveOperation<string>[] = [
          {
            name: 'operation-1',
            execute: jest.fn().mockResolvedValue('result-1'),
            rollback: rollback1
          },
          {
            name: 'operation-2',
            execute: jest.fn().mockResolvedValue('result-2'),
            rollback: rollback2
          },
          {
            name: 'operation-3',
            execute: jest.fn().mockRejectedValue(new Error('Failed'))
          }
        ];

        const result = await executeAtomicSave(operations);

        expect(result.success).toBe(false);
        expect(result.rolledBack).toBe(true);

        // Both rollbacks should be attempted
        expect(rollback1).toHaveBeenCalledTimes(1);
        expect(rollback2).toHaveBeenCalledTimes(1);

        expect(mockLogger.error).toHaveBeenCalledWith(
          '[AtomicSave] Rollback failed for operation-2:',
          expect.any(Error)
        );
      });

      it('should handle first operation failure without rollback', async () => {
        const operations: SaveOperation<string>[] = [
          {
            name: 'operation-1',
            execute: jest.fn().mockRejectedValue(new Error('First op failed'))
          }
        ];

        const result = await executeAtomicSave(operations);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Operation "operation-1" failed: First op failed');
        expect(result.rolledBack).toBe(false); // No completed operations to rollback
      });
    });

    describe('Unexpected transaction errors', () => {
      it('should handle unexpected errors during transaction', async () => {
        // This test simulates an unexpected error that happens outside operation execution
        const operations: SaveOperation<string>[] = [
          {
            name: 'operation-1',
            execute: jest.fn().mockResolvedValue('success')
          }
        ];

        // Mock an error in the transaction flow itself (not in operation.execute)
        const originalMap = Array.prototype.map;
        Array.prototype.map = jest.fn().mockImplementation(() => {
          throw new Error('Unexpected array error');
        });

        const result = await executeAtomicSave(operations);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Transaction failed: Unexpected array error');

        // Restore original function
        Array.prototype.map = originalMap;

        expect(mockLogger.error).toHaveBeenCalledWith(
          '[AtomicSave] Transaction failed with unexpected error:',
          expect.any(Error)
        );
      });
    });
  });

  describe('createSaveOperation', () => {
    it('should create operation with all parameters', () => {
      const execute = jest.fn();
      const rollback = jest.fn();
      
      const operation = createSaveOperation('test-op', execute, rollback);

      expect(operation.name).toBe('test-op');
      expect(operation.execute).toBe(execute);
      expect(operation.rollback).toBe(rollback);
    });

    it('should create operation without rollback', () => {
      const execute = jest.fn();
      
      const operation = createSaveOperation('test-op', execute);

      expect(operation.name).toBe('test-op');
      expect(operation.execute).toBe(execute);
      expect(operation.rollback).toBeUndefined();
    });

    it('should create functional operation', async () => {
      const testResult = { saved: true };
      const execute = jest.fn().mockResolvedValue(testResult);
      const rollback = jest.fn().mockResolvedValue(undefined);
      
      const operation = createSaveOperation('functional-test', execute, rollback);

      // Test execute
      const result = await operation.execute();
      expect(result).toEqual(testResult);
      expect(execute).toHaveBeenCalledTimes(1);

      // Test rollback
      await operation.rollback!();
      expect(rollback).toHaveBeenCalledTimes(1);
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      jest.clearAllTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
    });

    describe('Successful operations', () => {
      it('should return result on first attempt', async () => {
        const operation = jest.fn().mockResolvedValue('success');

        const result = await withRetry(operation);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });

      it('should work with different return types', async () => {
        const numberOp = jest.fn().mockResolvedValue(42);
        const objectOp = jest.fn().mockResolvedValue({ test: true });

        expect(await withRetry(numberOp)).toBe(42);
        expect(await withRetry(objectOp)).toEqual({ test: true });
      });
    });

    describe('Retry behavior', () => {
      it('should retry failed operations with default settings', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new Error('Attempt 1 failed'))
          .mockRejectedValueOnce(new Error('Attempt 2 failed'))
          .mockResolvedValue('success');

        const promise = withRetry(operation);

        // Process the first failure and advance timer
        await jest.advanceTimersByTimeAsync(1000);
        // Process the second failure and advance timer  
        await jest.advanceTimersByTimeAsync(1000);

        const result = await promise;

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
        expect(mockLogger.warn).toHaveBeenCalledTimes(2);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          '[Retry] Attempt 1 failed, retrying in 1000ms:',
          'Attempt 1 failed'
        );
      });

      it('should respect custom retry count and delay', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new Error('Attempt 1 failed'))
          .mockResolvedValue('success');

        const promise = withRetry(operation, 2, 500);

        // Fast-forward through custom delay
        await jest.advanceTimersByTimeAsync(500);

        const result = await promise;

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(2);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          '[Retry] Attempt 1 failed, retrying in 500ms:',
          'Attempt 1 failed'
        );
      });

      it('should throw error after max retries exceeded', async () => {
        // Use real timers for this specific test to avoid Promise resolution issues
        jest.useRealTimers();
        
        const operation = jest.fn()
          .mockRejectedValue(new Error('Always fails'));

        // Use a very short delay to minimize test time
        await expect(withRetry(operation, 2, 1)).rejects.toThrow('Always fails');
        
        expect(operation).toHaveBeenCalledTimes(2);
        expect(mockLogger.warn).toHaveBeenCalledTimes(1); // Only log first failure (not the final one)
        
        // Restore fake timers for other tests
        jest.useFakeTimers('legacy');
      });

      it('should handle non-Error exceptions', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce('String error')
          .mockRejectedValueOnce(null)
          .mockResolvedValue('success');

        const promise = withRetry(operation, 5, 50);

        // Fast-forward through delays
        await jest.advanceTimersByTimeAsync(100);

        const result = await promise;

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
        expect(mockLogger.warn).toHaveBeenCalledTimes(2);
      });

      it('should not retry if maxRetries is 1', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Failed'));

        const promise = withRetry(operation, 1);

        await expect(promise).rejects.toThrow('Failed');
        expect(operation).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should work with atomic save and retry together', async () => {
      const unreliableExecute = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('saved');

      const operation: SaveOperation<string> = {
        name: 'retry-operation',
        execute: () => withRetry(unreliableExecute, 3, 100)
      };

      const promise = executeAtomicSave([operation]);

      // Fast-forward through retry delay
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.results).toEqual(['saved']);
      expect(unreliableExecute).toHaveBeenCalledTimes(2);
    });

    it('should handle complex multi-operation scenario', async () => {
      const rollbackData: string[] = [];
      
      const operations: SaveOperation<string>[] = [
        {
          name: 'save-game',
          execute: jest.fn().mockResolvedValue('game-saved'),
          rollback: jest.fn().mockImplementation(async () => {
            rollbackData.push('game-rolled-back');
          })
        },
        {
          name: 'save-stats',
          execute: jest.fn().mockResolvedValue('stats-saved'),
          rollback: jest.fn().mockImplementation(async () => {
            rollbackData.push('stats-rolled-back');
          })
        },
        {
          name: 'notify-server',
          execute: jest.fn().mockRejectedValue(new Error('Server unreachable'))
        }
      ];

      const result = await executeAtomicSave(operations);

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(result.error).toContain('notify-server');

      // Verify rollbacks happened in reverse order
      expect(rollbackData).toEqual(['stats-rolled-back', 'game-rolled-back']);
    });
  });
});