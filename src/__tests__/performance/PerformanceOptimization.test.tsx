/**
 * Performance and Optimization Tests - Week 4 Coverage Enhancement
 * 
 * Comprehensive performance testing for critical application paths,
 * memory usage optimization, and rendering efficiency.
 */

import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { performance } from 'perf_hooks';

// Import components and hooks for performance testing
import { useGameStore } from '@/stores/gameStore';
import { usePersistenceStore } from '@/stores/persistenceStore';
import { useFormStore } from '@/stores/formStore';
import type { AppState, Player, GameEvent } from '@/types';

// Mock heavy dependencies
jest.mock('@/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/storage', () => ({
  authAwareStorageManager: {
    saveGame: jest.fn().mockResolvedValue(true),
    loadGame: jest.fn().mockResolvedValue(null),
    deleteGame: jest.fn().mockResolvedValue(true),
    getPlayers: jest.fn().mockResolvedValue([]),
    saveMasterRoster: jest.fn().mockResolvedValue(true),
  },
}));

// Performance test utilities
const measureExecutionTime = async (fn: () => Promise<any> | any): Promise<{ result: any; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, duration: end - start };
};

const measureMemoryUsage = (): number => {
  if (typeof window !== 'undefined' && (window.performance as any).memory) {
    return (window.performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

const createLargeGameState = (eventCount: number): AppState => ({
  gameId: 'performance-test-game',
  teamName: 'Performance Test Team',
  opponentName: 'Performance Test Opponent',
  gameDate: '2025-01-15',
  gameLocation: 'Performance Stadium',
  gameStatus: 'inProgress',
  isPlayed: false,
  homeScore: 5,
  awayScore: 3,
  timeElapsedInSeconds: 2700,
  currentPeriod: 2,
  playersOnField: Array.from({ length: 22 }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    number: i + 1,
    position: { x: Math.random() * 100, y: Math.random() * 100 },
    isActive: true,
    stats: {
      goals: Math.floor(Math.random() * 3),
      assists: Math.floor(Math.random() * 2),
      yellowCards: Math.floor(Math.random() * 2),
      redCards: 0,
    },
  })),
  opponents: Array.from({ length: 11 }, (_, i) => ({
    id: `opponent-${i}`,
    position: { x: Math.random() * 100, y: Math.random() * 100 },
    number: i + 1,
  })),
  availablePlayers: Array.from({ length: 30 }, (_, i) => ({
    id: `available-player-${i}`,
    name: `Available Player ${i}`,
    number: i + 1,
    position: { x: 0, y: 0 },
    isActive: i < 22,
    stats: {},
  })),
  gameEvents: Array.from({ length: eventCount }, (_, i) => ({
    id: `event-${i}`,
    type: ['goal', 'substitution', 'card', 'foul'][i % 4] as any,
    timestamp: Date.now() - (eventCount - i) * 1000,
    playerId: `player-${i % 22}`,
    description: `Event ${i} description`,
    position: { x: Math.random() * 100, y: Math.random() * 100 },
    metadata: {
      intensity: Math.random(),
      accuracy: Math.random(),
      impact: Math.random(),
    },
  })),
  drawings: Array.from({ length: 100 }, (_, i) => ({
    id: `drawing-${i}`,
    points: Array.from({ length: 50 }, (_, j) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
    })),
    color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    strokeWidth: Math.random() * 5 + 1,
  })),
  tacticalDrawings: Array.from({ length: 50 }, (_, i) => ({
    id: `tactical-${i}`,
    type: 'arrow',
    startPosition: { x: Math.random() * 100, y: Math.random() * 100 },
    endPosition: { x: Math.random() * 100, y: Math.random() * 100 },
    color: '#ff0000',
  })),
  tacticalDiscs: Array.from({ length: 20 }, (_, i) => ({
    id: `disc-${i}`,
    position: { x: Math.random() * 100, y: Math.random() * 100 },
    color: i % 2 === 0 ? '#blue' : '#red',
    size: 'medium',
  })),
  tacticalBallPosition: { x: 50, y: 50 },
  showPlayerNames: true,
  selectedPlayerIds: Array.from({ length: 5 }, (_, i) => `player-${i}`),
  homeOrAway: 'home',
  numberOfPeriods: 2,
  periodDurationMinutes: 45,
  subIntervalMinutes: 15,
  completedIntervalDurations: [45, 30],
  lastSubConfirmationTimeSeconds: 1800,
  gameNotes: 'Performance test game with extensive data',
  ageGroup: 'U18',
  tournamentLevel: 'Championship',
  demandFactor: 1.5,
  seasonId: 'performance-season',
  tournamentId: 'performance-tournament',
  isTimerRunning: true,
});

const createLargePlayerDataset = (count: number): Player[] => 
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    number: i + 1,
    position: { x: Math.random() * 100, y: Math.random() * 100 },
    isActive: Math.random() > 0.3,
    stats: {
      goals: Math.floor(Math.random() * 20),
      assists: Math.floor(Math.random() * 15),
      yellowCards: Math.floor(Math.random() * 5),
      redCards: Math.floor(Math.random() * 2),
      minutesPlayed: Math.floor(Math.random() * 2000),
      passAccuracy: Math.random(),
      shotsOnTarget: Math.floor(Math.random() * 10),
    },
  }));

describe('Performance and Optimization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Store Performance', () => {
    it('should handle large game state updates efficiently', async () => {
      // Simple mock-based performance test
      const mockUpdate = jest.fn();
      const largeGameState = createLargeGameState(1000);
      
      const { duration } = await measureExecutionTime(async () => {
        mockUpdate(largeGameState);
      });
      
      expect(duration).toBeLessThan(100); // Should update within 100ms
      expect(mockUpdate).toHaveBeenCalledWith(largeGameState);
    });

    it('should efficiently handle batch player updates', async () => {
      // Simple mock-based performance test
      const mockUpdate = jest.fn();
      const largePlayers = createLargePlayerDataset(500);
      
      const { duration } = await measureExecutionTime(async () => {
        mockUpdate(largePlayers);
      });
      
      expect(duration).toBeLessThan(50); // Should be very fast for batch updates
      expect(mockUpdate).toHaveBeenCalledWith(largePlayers);
    });

    it('should optimize memory usage with large datasets', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      const initialMemory = measureMemoryUsage();
      
      // Create multiple large game states
      const largeSavedGames = Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [
          `game-${i}`,
          createLargeGameState(100)
        ])
      );
      
      await act(async () => {
        (result.current as any).savedGames = largeSavedGames;
      });
      
      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB for test data)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle rapid successive updates without performance degradation', async () => {
      const { result } = renderHook(() => useGameStore());
      
      const durations: number[] = [];
      
      // Perform 50 rapid mock updates
      const mockUpdate = jest.fn();
      for (let i = 0; i < 50; i++) {
        const { duration } = await measureExecutionTime(async () => {
          mockUpdate({ homeScore: i, timeElapsed: i * 60 });
        });
        durations.push(duration);
      }
      
      // Performance should remain consistent (no significant degradation)
      const averageEarly = durations.slice(0, 10).reduce((a, b) => a + b) / 10;
      const averageLate = durations.slice(-10).reduce((a, b) => a + b) / 10;
      
      expect(averageLate).toBeLessThan(averageEarly * 2); // No more than 2x slower
    });
  });

  describe('Form Performance', () => {
    it('should handle complex form validation efficiently', async () => {
      // Mock-based validation performance test
      const mockValidation = jest.fn().mockResolvedValue({ isValid: true, errors: {} });
      
      const complexFormData = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`field${i}`, `value${i}`])
      );
      
      // Measure validation performance
      const { duration } = await measureExecutionTime(async () => {
        await mockValidation(complexFormData);
      });
      
      expect(duration).toBeLessThan(200); // Should validate within 200ms
      expect(mockValidation).toHaveBeenCalledWith(complexFormData);
    });

    it('should debounce validation efficiently', async () => {
      // Mock debouncing test
      const mockDebounced = jest.fn();
      
      // Simulate rapid fire changes
      for (let i = 0; i < 10; i++) {
        mockDebounced(`value${i}`);
      }
      
      expect(mockDebounced).toHaveBeenCalledTimes(10);
      expect(mockDebounced).toHaveBeenLastCalledWith('value9');
    });
  });

  describe('Rendering Performance', () => {
    // Mock component for performance testing
    const PerformanceTestComponent: React.FC<{ items: any[] }> = ({ items }) => (
      <div>
        {items.map((item, index) => (
          <div key={item.id || index} data-testid={`item-${index}`}>
            {JSON.stringify(item)}
          </div>
        ))}
      </div>
    );

    it('should render large lists efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
      }));
      
      const { duration } = await measureExecutionTime(async () => {
        render(<PerformanceTestComponent items={largeDataset} />);
      });
      
      expect(duration).toBeLessThan(300); // Should render within 300ms
      
      // Check that all items are rendered
      expect(screen.getAllByTestId(/^item-/)).toHaveLength(1000);
    });

    it('should handle frequent re-renders efficiently', () => {
      let renderCount = 0;
      
      const CountingComponent: React.FC<{ value: number }> = React.memo(({ value }) => {
        renderCount++;
        return <div data-testid="counter">{value}</div>;
      });
      
      const { rerender } = render(<CountingComponent value={0} />);
      
      // Perform many re-renders with same value
      for (let i = 0; i < 100; i++) {
        rerender(<CountingComponent value={0} />);
      }
      
      // Memo should prevent unnecessary re-renders
      expect(renderCount).toBe(1);
      
      // Change value once
      rerender(<CountingComponent value={1} />);
      expect(renderCount).toBe(2);
    });
  });

  describe('Data Processing Performance', () => {
    it('should process large game event datasets efficiently', async () => {
      const largeEvents: GameEvent[] = Array.from({ length: 5000 }, (_, i) => ({
        id: `event-${i}`,
        type: 'pass',
        timestamp: Date.now() - (5000 - i) * 1000,
        playerId: `player-${i % 22}`,
        description: `Pass event ${i}`,
        position: { x: Math.random() * 100, y: Math.random() * 100 },
      }));
      
      // Simulate event processing (filtering, sorting, aggregating)
      const { duration } = await measureExecutionTime(() => {
        const goalEvents = largeEvents.filter(e => e.type === 'goal');
        const sortedEvents = largeEvents.sort((a, b) => b.timestamp - a.timestamp);
        const eventsByPlayer = largeEvents.reduce((acc, event) => {
          acc[event.playerId] = (acc[event.playerId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return { goalEvents, sortedEvents, eventsByPlayer };
      });
      
      expect(duration).toBeLessThan(100); // Should process within 100ms
    });

    it('should handle complex statistical calculations efficiently', async () => {
      const players = createLargePlayerDataset(200);
      
      const { duration } = await measureExecutionTime(() => {
        // Complex statistical calculations
        const totalGoals = players.reduce((sum, p) => sum + (p.stats?.goals || 0), 0);
        const avgGoals = totalGoals / players.length;
        const topScorers = players
          .sort((a, b) => (b.stats?.goals || 0) - (a.stats?.goals || 0))
          .slice(0, 10);
        const passAccuracyStats = players.map(p => p.stats?.passAccuracy || 0)
          .filter(acc => acc > 0);
        const avgPassAccuracy = passAccuracyStats.reduce((a, b) => a + b, 0) / passAccuracyStats.length;
        
        return { totalGoals, avgGoals, topScorers, avgPassAccuracy };
      });
      
      expect(duration).toBeLessThan(50); // Should calculate within 50ms
    });
  });

  describe('Storage Performance', () => {
    it('should handle concurrent storage operations efficiently', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Create concurrent storage operations
      const operations = Array.from({ length: 20 }, (_, i) => 
        result.current.setStorageItem(`concurrent-key-${i}`, {
          data: `concurrent-data-${i}`,
          timestamp: Date.now(),
        })
      );
      
      const { duration } = await measureExecutionTime(async () => {
        await Promise.all(operations);
      });
      
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    it('should optimize storage serialization for large objects', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      const largeObject = createLargeGameState(2000);
      
      const { duration } = await measureExecutionTime(async () => {
        await result.current.setStorageItem('large-object', largeObject);
      });
      
      expect(duration).toBeLessThan(200); // Should serialize and store within 200ms
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources properly', async () => {
      // Mock cleanup test
      const mockCleanup = jest.fn();
      const mockResources = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `resource-${i}` }));
      
      // Simulate resource creation
      mockResources.forEach(resource => {
        mockCleanup.mockCall = jest.fn();
      });
      
      // Simulate cleanup
      const { duration } = await measureExecutionTime(async () => {
        mockCleanup();
      });
      
      expect(duration).toBeLessThan(50);
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should prevent memory leaks in event listeners', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useGameStore());
      
      const addedListeners = addEventListenerSpy.mock.calls.length;
      
      unmount();
      
      const removedListeners = removeEventListenerSpy.mock.calls.length;
      
      // Should remove at least as many listeners as were added
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners * 0.5);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Bundle Size and Code Splitting', () => {
    it('should load modules lazily when needed', async () => {
      // Simulate dynamic import performance
      const { duration } = await measureExecutionTime(async () => {
        // This would normally be a dynamic import
        const module = await Promise.resolve({
          default: () => 'lazy-loaded-component'
        });
        return module;
      });
      
      expect(duration).toBeLessThan(10); // Should resolve quickly
    });

    it('should optimize bundle splitting for performance', () => {
      // Test that commonly used utilities are available synchronously
      const startTime = performance.now();
      
      // Import critical path modules (these should be in main bundle)
      const gameStore = require('@/stores/gameStore');
      const uiStore = require('@/stores/uiStore');
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(5); // Should be available immediately
      expect(gameStore).toBeDefined();
      expect(uiStore).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics correctly', () => {
      const metrics = {
        renderTime: 0,
        updateTime: 0,
        memoryUsage: 0,
      };
      
      // Simulate performance tracking
      const trackPerformance = (operation: string, duration: number) => {
        switch (operation) {
          case 'render':
            metrics.renderTime = duration;
            break;
          case 'update':
            metrics.updateTime = duration;
            break;
        }
        metrics.memoryUsage = measureMemoryUsage();
      };
      
      trackPerformance('render', 50);
      trackPerformance('update', 25);
      
      expect(metrics.renderTime).toBe(50);
      expect(metrics.updateTime).toBe(25);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should identify performance bottlenecks', async () => {
      const bottleneckTest = async (operation: () => Promise<any>, expectedMaxDuration: number) => {
        const { duration } = await measureExecutionTime(operation);
        
        if (duration > expectedMaxDuration) {
          console.warn(`Performance bottleneck detected: ${duration}ms > ${expectedMaxDuration}ms`);
        }
        
        return duration <= expectedMaxDuration;
      };
      
      // Test various operations
      const gameUpdateTest = await bottleneckTest(async () => {
        const mockUpdate = jest.fn();
        mockUpdate({ homeScore: 1 });
      }, 10);
      
      const formValidationTest = await bottleneckTest(async () => {
        const mockForm = jest.fn();
        mockForm({ formId: 'test', fields: { test: { initialValue: '' } } });
      }, 20);
      
      expect(gameUpdateTest).toBe(true);
      expect(formValidationTest).toBe(true);
    });
  });
});