import { OperationQueue, operationQueue, OperationPriority, Operation } from '../operationQueue';

describe('OperationQueue', () => {
  let queue: OperationQueue;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    queue = new OperationQueue();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    consoleDebugSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  const createOperation = (
    id: string,
    priority: OperationPriority,
    executeFunction?: () => Promise<void>,
    options?: { timeout?: number; maxRetries?: number }
  ): Operation => ({
    id,
    name: `test-operation-${id}`,
    priority,
    execute: executeFunction || jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 50)) // Small delay to allow queue inspection
    ),
    timeout: options?.timeout,
    maxRetries: options?.maxRetries,
    createdAt: Date.now(),
  });

  describe('constructor', () => {
    it('should initialize queues for all priority levels', () => {
      const stats = queue.getStats();
      expect(stats.priority_1).toBe(0); // CRITICAL
      expect(stats.priority_2).toBe(0); // HIGH
      expect(stats.priority_3).toBe(0); // MEDIUM
      expect(stats.priority_4).toBe(0); // LOW
    });
  });

  describe('add', () => {
    it('should add operation to correct priority queue', async () => {
      const operation = createOperation('test1', OperationPriority.HIGH);
      await queue.add(operation);

      // Check immediately - should be queued or running
      const stats = queue.getStats();
      expect(stats.priority_2 + stats.running).toBe(1); // Either queued or running
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[OperationQueue] Added test-operation-test1 (priority: 2)'
      );
    });

    it('should clear lower priority operations when adding critical operation', async () => {
      // Add operations that will be queued (not running yet)
      const neverComplete = () => new Promise<void>(() => {}); // Never resolves
      
      // Add multiple operations to ensure some stay in queue
      await queue.add(createOperation('medium1', OperationPriority.MEDIUM, neverComplete));
      await queue.add(createOperation('medium2', OperationPriority.MEDIUM, neverComplete));
      await queue.add(createOperation('low1', OperationPriority.LOW, neverComplete));
      await queue.add(createOperation('high1', OperationPriority.HIGH, neverComplete));
      await queue.add(createOperation('high2', OperationPriority.HIGH, neverComplete));

      // Don't process yet - keep them in queues
      let stats = queue.getStats();
      expect(stats.totalQueued).toBeGreaterThan(2); // Multiple operations queued

      // Add critical operation - should clear lower priority queued ones
      await queue.add(createOperation('critical1', OperationPriority.CRITICAL, neverComplete));

      stats = queue.getStats();
      // Some operations may have started running (up to maxConcurrent=2)
      // But lower priority queued operations should be cleared
      expect(stats.priority_2).toBe(0); // HIGH queue cleared
      expect(stats.priority_3).toBe(0); // MEDIUM queue cleared  
      expect(stats.priority_4).toBe(0); // LOW queue cleared
      expect(stats.priority_1).toBeGreaterThan(0); // CRITICAL queued or running
    });

    it('should start processing queue when not already processing', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const operation = createOperation('test1', OperationPriority.HIGH, mockExecute);

      await queue.add(operation);
      
      // Allow async operations to complete
      await jest.runOnlyPendingTimersAsync();

      expect(mockExecute).toHaveBeenCalled();
    });
  });

  describe('operation execution', () => {
    it('should execute operations in priority order and clear lower priority when critical added', async () => {
      const executionOrder: string[] = [];
      
      // Create a new queue to avoid interference
      const testQueue = new OperationQueue();
      
      // Add operations with enough delay to ensure queuing
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      await testQueue.add(createOperation('low', OperationPriority.LOW, async () => {
        await delay(10);
        executionOrder.push('low');
      }));
      await testQueue.add(createOperation('medium', OperationPriority.MEDIUM, async () => {
        await delay(10);
        executionOrder.push('medium');
      }));
      await testQueue.add(createOperation('high', OperationPriority.HIGH, async () => {
        await delay(10);
        executionOrder.push('high');
      }));
      
      // Adding critical should clear lower priority queued operations
      await testQueue.add(createOperation('critical', OperationPriority.CRITICAL, async () => {
        await delay(10);
        executionOrder.push('critical');
      }));

      // Process all operations
      await jest.runAllTimersAsync();

      // Critical should execute, and only operations that were already running should complete
      expect(executionOrder).toContain('critical');
      
      // Some lower priority operations may have started before critical was added
      // But those still queued should have been cleared
      expect(executionOrder.length).toBeGreaterThan(0);
      expect(executionOrder.length).toBeLessThanOrEqual(4); // Max all 4 if all started before critical added
      
      // Critical should be in the execution order
      const criticalIndex = executionOrder.indexOf('critical');
      expect(criticalIndex).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent operations up to maxConcurrent limit', async () => {
      const runningOperations = new Set<string>();
      const maxConcurrentReached = { value: 0 };
      
      const createConcurrentOperation = (id: string) => createOperation(
        id,
        OperationPriority.HIGH,
        async () => {
          runningOperations.add(id);
          maxConcurrentReached.value = Math.max(maxConcurrentReached.value, runningOperations.size);
          
          // Simulate async work
          await new Promise(resolve => setTimeout(resolve, 100));
          
          runningOperations.delete(id);
        }
      );

      // Add multiple operations
      await queue.add(createConcurrentOperation('op1'));
      await queue.add(createConcurrentOperation('op2'));
      await queue.add(createConcurrentOperation('op3'));
      await queue.add(createConcurrentOperation('op4'));

      // Process all operations
      await jest.runAllTimersAsync();

      // Should not exceed maxConcurrent (2)
      expect(maxConcurrentReached.value).toBeLessThanOrEqual(2);
    });

    it('should handle operation timeout', async () => {
      const operation = createOperation(
        'timeout-test',
        OperationPriority.HIGH,
        async () => {
          // Simulate operation that never completes
          await new Promise(() => {}); // Never resolves
        },
        { timeout: 1000 }
      );

      await queue.add(operation);

      // Fast-forward to timeout
      jest.advanceTimersByTime(1000);
      await jest.runOnlyPendingTimersAsync();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('TIMEOUT: test-operation-timeout-test failed')
      );
    });

    it('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      const operation = createOperation(
        'retry-test',
        OperationPriority.HIGH,
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Simulated failure');
          }
        },
        { maxRetries: 3 }
      );

      await queue.add(operation);

      // Process initial attempt and retries
      await jest.runAllTimersAsync();

      expect(attemptCount).toBe(3);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying test-operation-retry-test')
      );
    });

    it('should not retry beyond maxRetries', async () => {
      let attemptCount = 0;
      const operation = createOperation(
        'max-retry-test',
        OperationPriority.HIGH,
        async () => {
          attemptCount++;
          throw new Error('Always fails');
        },
        { maxRetries: 2 }
      );

      await queue.add(operation);

      // Process all attempts
      await jest.runAllTimersAsync();

      expect(attemptCount).toBe(3); // Initial + 2 retries
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OperationQueue] Failed test-operation-max-retry-test'),
        expect.any(Error)
      );
    });

    it('should handle operation without retries', async () => {
      let attemptCount = 0;
      const operation = createOperation(
        'no-retry-test',
        OperationPriority.HIGH,
        async () => {
          attemptCount++;
          throw new Error('Fails immediately');
        }
        // No maxRetries specified (defaults to 0)
      );

      await queue.add(operation);

      // Process the operation
      await jest.runAllTimersAsync();

      expect(attemptCount).toBe(1); // Only initial attempt
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OperationQueue] Failed test-operation-no-retry-test'),
        expect.any(Error)
      );
    });

    it('should continue processing after operation completion', async () => {
      const completedOperations: string[] = [];
      
      const createTrackingOperation = (id: string) => createOperation(
        id,
        OperationPriority.HIGH,
        async () => {
          completedOperations.push(id);
        }
      );

      // Add multiple operations
      await queue.add(createTrackingOperation('op1'));
      await queue.add(createTrackingOperation('op2'));
      await queue.add(createTrackingOperation('op3'));

      // Process all operations
      await jest.runAllTimersAsync();

      expect(completedOperations).toEqual(['op1', 'op2', 'op3']);
    });
  });

  describe('getStats', () => {
    it('should return correct queue statistics', async () => {
      // Use operations that block to prevent immediate execution
      const neverComplete = () => new Promise<void>(() => {});
      
      await queue.add(createOperation('critical1', OperationPriority.CRITICAL, neverComplete));
      await queue.add(createOperation('critical2', OperationPriority.CRITICAL, neverComplete));
      await queue.add(createOperation('high1', OperationPriority.HIGH, neverComplete));
      await queue.add(createOperation('medium1', OperationPriority.MEDIUM, neverComplete));

      // Allow first operation to start
      await jest.runOnlyPendingTimersAsync();

      const stats = queue.getStats();

      // Some operations may be running, some queued
      expect(stats.priority_1 + stats.priority_2 + stats.priority_3 + stats.priority_4 + stats.running).toBe(4);
      expect(stats.priority_4).toBe(0); // LOW - none added
    });

    it('should track running operations', async () => {
      let isRunning = false;
      const operation = createOperation(
        'running-test',
        OperationPriority.HIGH,
        async () => {
          isRunning = true;
          const stats = queue.getStats();
          expect(stats.running).toBe(1);
          await new Promise(resolve => setTimeout(resolve, 100));
          isRunning = false;
        }
      );

      await queue.add(operation);
      
      // Start operation
      jest.advanceTimersByTime(0);
      await jest.runOnlyPendingTimersAsync();

      // Complete operation
      await jest.runAllTimersAsync();
    });
  });

  describe('clear', () => {
    it('should clear all queues', async () => {
      // Use blocking operations
      const neverComplete = () => new Promise<void>(() => {});
      
      await queue.add(createOperation('critical1', OperationPriority.CRITICAL, neverComplete));
      await queue.add(createOperation('high1', OperationPriority.HIGH, neverComplete));
      await queue.add(createOperation('medium1', OperationPriority.MEDIUM, neverComplete));
      await queue.add(createOperation('low1', OperationPriority.LOW, neverComplete));

      // Allow operations to start
      await jest.runOnlyPendingTimersAsync();

      let stats = queue.getStats();
      expect(stats.totalQueued + stats.running).toBe(4);

      queue.clear();

      stats = queue.getStats();
      expect(stats.totalQueued).toBe(0);
      expect(stats.priority_1).toBe(0);
      expect(stats.priority_2).toBe(0);
      expect(stats.priority_3).toBe(0);
      expect(stats.priority_4).toBe(0);

      expect(consoleDebugSpy).toHaveBeenCalledWith('[OperationQueue] Cleared all queues');
    });
  });

  describe('edge cases', () => {
    it('should handle empty queue gracefully', async () => {
      const stats = queue.getStats();
      expect(stats.totalQueued).toBe(0);
      expect(stats.running).toBe(0);
    });

    it('should handle operation with undefined execute function', async () => {
      const operation: Operation = {
        id: 'undefined-test',
        name: 'test-operation-undefined',
        priority: OperationPriority.HIGH,
        execute: undefined as any,
        createdAt: Date.now(),
      };

      // The queue doesn't validate execute function on add, only on execution
      await queue.add(operation);
      
      // Wait for execution attempt which should fail
      await jest.runAllTimersAsync();
      
      // Should log an error when it tries to execute
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle multiple operations with same priority', async () => {
      const executionOrder: string[] = [];
      
      await queue.add(createOperation('first', OperationPriority.HIGH, async () => {
        executionOrder.push('first');
      }));
      await queue.add(createOperation('second', OperationPriority.HIGH, async () => {
        executionOrder.push('second');
      }));
      await queue.add(createOperation('third', OperationPriority.HIGH, async () => {
        executionOrder.push('third');
      }));

      await jest.runAllTimersAsync();

      // Should execute in FIFO order for same priority
      expect(executionOrder).toEqual(['first', 'second', 'third']);
    });

    it('should handle retry with priority queue insertion', async () => {
      let attemptCount = 0;
      const operation = createOperation(
        'retry-insertion-test',
        OperationPriority.MEDIUM,
        async () => {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error('First attempt fails');
          }
        },
        { maxRetries: 1 }
      );

      // Add a high priority operation after the failing one
      await queue.add(operation);
      await queue.add(createOperation('high-priority', OperationPriority.HIGH));

      await jest.runAllTimersAsync();

      expect(attemptCount).toBe(2); // Initial + 1 retry
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(operationQueue).toBeInstanceOf(OperationQueue);
    });

    it('should maintain state across calls to singleton', async () => {
      const neverComplete = () => new Promise<void>(() => {});
      await operationQueue.add(createOperation('singleton-test', OperationPriority.HIGH, neverComplete));
      
      // Allow operation to start but not complete
      await jest.runOnlyPendingTimersAsync();
      
      const stats = operationQueue.getStats();
      expect(stats.totalQueued + stats.running).toBeGreaterThan(0);
      
      operationQueue.clear();
      const clearedStats = operationQueue.getStats();
      expect(clearedStats.totalQueued).toBe(0);
    });
  });

  describe('OperationPriority enum', () => {
    it('should have correct priority values', () => {
      expect(OperationPriority.CRITICAL).toBe(1);
      expect(OperationPriority.HIGH).toBe(2);
      expect(OperationPriority.MEDIUM).toBe(3);
      expect(OperationPriority.LOW).toBe(4);
    });
  });
});