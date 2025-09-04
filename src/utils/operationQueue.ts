/**
 * PHASE 3: Operation Priority System
 * Separates auto-save from game loading operations to prevent blocking
 */

export enum OperationPriority {
  CRITICAL = 1,    // Game loading - highest priority
  HIGH = 2,        // User actions (save, delete)
  MEDIUM = 3,      // Auto-save
  LOW = 4          // Background tasks
}

export interface Operation {
  id: string;
  name: string;
  priority: OperationPriority;
  execute: () => Promise<void>;
  timeout?: number;
  createdAt: number;
  retryCount?: number;
  maxRetries?: number;
}

export class OperationQueue {
  private queues = new Map<OperationPriority, Operation[]>();
  private running = new Set<string>();
  private maxConcurrent = 2; // Allow 2 operations to run concurrently
  private isProcessing = false;

  constructor() {
    // Initialize queues for each priority level
    Object.values(OperationPriority)
      .filter(v => typeof v === 'number')
      .forEach(priority => {
        this.queues.set(priority as OperationPriority, []);
      });
  }

  async add(operation: Operation): Promise<void> {
    const queue = this.queues.get(operation.priority) || [];
    
    // For critical operations, clear lower priority operations
    if (operation.priority === OperationPriority.CRITICAL) {
      this.clearLowerPriorityOperations(operation.priority);
    }
    
    queue.push(operation);
    this.queues.set(operation.priority, queue);
    
    console.debug(`[OperationQueue] Added ${operation.name} (priority: ${operation.priority})`);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private clearLowerPriorityOperations(priority: OperationPriority) {
    for (const [queuePriority, queue] of this.queues) {
      if (queuePriority > priority) {
        const cleared = queue.splice(0, queue.length);
        if (cleared.length > 0) {
          console.debug(`[OperationQueue] Cleared ${cleared.length} lower priority operations`);
        }
      }
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.hasOperations() && this.running.size < this.maxConcurrent) {
      const operation = this.getNextOperation();
      if (!operation) break;

      this.runOperation(operation);
    }

    this.isProcessing = false;
    
    // Continue processing if more operations arrived
    if (this.hasOperations() && this.running.size < this.maxConcurrent) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private hasOperations(): boolean {
    return Array.from(this.queues.values()).some(queue => queue.length > 0);
  }

  private getNextOperation(): Operation | null {
    // Get operation from highest priority queue first
    for (const priority of [OperationPriority.CRITICAL, OperationPriority.HIGH, OperationPriority.MEDIUM, OperationPriority.LOW]) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift() || null;
      }
    }
    return null;
  }

  private async runOperation(operation: Operation) {
    this.running.add(operation.id);
    const startTime = Date.now();
    
    try {
      console.debug(`[OperationQueue] Starting ${operation.name} (attempt ${(operation.retryCount || 0) + 1})`);
      
      // Add timeout if specified
      if (operation.timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Operation ${operation.name} timed out`)), operation.timeout);
        });
        
        await Promise.race([operation.execute(), timeoutPromise]);
      } else {
        await operation.execute();
      }
      
      const duration = Date.now() - startTime;
      console.debug(`[OperationQueue] Completed ${operation.name} in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const retryCount = operation.retryCount || 0;
      const maxRetries = operation.maxRetries || 0;
      
      if (retryCount < maxRetries) {
        // Exponential backoff with jitter - more conservative
        const baseDelay = Math.min(2000 * Math.pow(2, retryCount), 15000); // Cap at 15s, start at 2s
        const jitter = Math.random() * 0.2 * baseDelay; // 20% jitter
        const delay = baseDelay + jitter;
        
        console.debug(`[OperationQueue] Retrying ${operation.name} in ${Math.round(delay)}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        setTimeout(() => {
          const retryOperation: Operation = {
            ...operation,
            retryCount: retryCount + 1,
            createdAt: Date.now()
          };
          
          // Add back to appropriate queue
          const queue = this.queues.get(operation.priority) || [];
          queue.unshift(retryOperation); // Add to front for immediate retry
          this.queues.set(operation.priority, queue);
          
          this.processQueue();
        }, delay);
      } else {
        const isTimeout = (error instanceof Error) && error.message?.includes('timed out');
        if (isTimeout) {
          console.error(`[OperationQueue] ⏰ TIMEOUT: ${operation.name} failed after ${duration}ms (${retryCount + 1} attempts). This may indicate network or database performance issues.`);
          console.error(`[OperationQueue] Consider checking: 1) Network connectivity, 2) Database performance, 3) Server load`);
        } else {
          console.error(`[OperationQueue] Failed ${operation.name} after ${duration}ms (${retryCount + 1} attempts):`, error);
        }
      }
    } finally {
      this.running.delete(operation.id);
      
      // Continue processing queue
      setTimeout(() => this.processQueue(), 0);
    }
  }

  getStats() {
    const queueSizes = Object.fromEntries(
      Array.from(this.queues.entries()).map(([priority, queue]) => [
        `priority_${priority}`, 
        queue.length
      ])
    );
    
    return {
      ...queueSizes,
      running: this.running.size,
      totalQueued: Array.from(this.queues.values()).reduce((sum, queue) => sum + queue.length, 0)
    };
  }

  clear() {
    for (const queue of this.queues.values()) {
      queue.splice(0, queue.length);
    }
    console.debug('[OperationQueue] Cleared all queues');
  }
}

// Singleton instance
export const operationQueue = new OperationQueue();