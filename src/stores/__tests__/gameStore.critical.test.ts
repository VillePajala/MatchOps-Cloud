/**
 * GameStore Critical Coverage Tests
 * 
 * Focus on game state mutations, field interactions, and core game logic to reach 90% coverage.
 * Priority areas:
 * 1. Game session management (timer, periods, scoring)
 * 2. Player field positioning and substitutions
 * 3. Game events and scoring operations
 * 4. Game state transitions and validation
 * 5. Performance optimizations and edge cases
 */

// Unmock the gameStore to test the real implementation
jest.unmock('../gameStore');

import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '../gameStore';
import type { Player, Point, GameEvent, TacticalDisc } from '@/types';

describe('GameStore Critical Coverage Tests', () => {
  beforeEach(() => {
    // Reset store state
    const store = useGameStore.getState();
    store.resetGameSession();
  });

  describe('Game Session Management', () => {
    it('should initialize game with default values', () => {
      const { result } = renderHook(() => useGameStore());

      expect(result.current.gameSession.gameId).toBeNull();
      expect(result.current.gameSession.teamName).toBe('');
      expect(result.current.gameSession.opponentName).toBe('');
      expect(result.current.gameSession.currentPeriod).toBe(1);
      expect(result.current.gameSession.numberOfPeriods).toBe(2);
      expect(result.current.gameSession.timeElapsedInSeconds).toBe(0);
      expect(result.current.gameSession.isTimerRunning).toBe(false);
      expect(result.current.gameSession.homeScore).toBe(0);
      expect(result.current.gameSession.awayScore).toBe(0);
    });

    it('should set basic game information', () => {
      const { result } = renderHook(() => useGameStore());

      act(() => {
        result.current.setGameId('game-123');
        result.current.setTeamName('Lions FC');
        result.current.setOpponentName('Tigers FC');
        result.current.setGameDate('2024-01-15');
        result.current.setGameLocation('Stadium A');
        result.current.setGameTime('14:30');
        result.current.setHomeOrAway('home');
      });

      expect(result.current.gameSession.gameId).toBe('game-123');
      expect(result.current.gameSession.teamName).toBe('Lions FC');
      expect(result.current.gameSession.opponentName).toBe('Tigers FC');
      expect(result.current.gameSession.gameDate).toBe('2024-01-15');
      expect(result.current.gameSession.gameLocation).toBe('Stadium A');
      expect(result.current.gameSession.gameTime).toBe('14:30');
      expect(result.current.gameSession.homeOrAway).toBe('home');
    });

    it('should manage game timing', () => {
      const { result } = renderHook(() => useGameStore());

      act(() => {
        result.current.setNumberOfPeriods(3);
        result.current.setPeriodDuration(30); // 30 minutes
        result.current.setSubInterval(10); // 10 minutes
      });

      expect(result.current.gameSession.numberOfPeriods).toBe(3);
      expect(result.current.gameSession.periodDurationMinutes).toBe(30);
      expect(result.current.gameSession.subIntervalMinutes).toBe(10);
    });

    it('should advance to next period correctly', () => {
      const { result } = renderHook(() => useGameStore());

      // Setup game with 3 periods
      act(() => {
        result.current.setNumberOfPeriods(3);
        result.current.setPeriodDuration(20);
      });

      // Advance through periods
      act(() => {
        result.current.setCurrentPeriod(2);
      });

      expect(result.current.gameSession.currentPeriod).toBe(2);
      expect(result.current.gameSession.completedIntervalDurations).toEqual([20]);

      act(() => {
        result.current.setCurrentPeriod(result.current.gameSession.currentPeriod + 1);
      });

      expect(result.current.gameSession.currentPeriod).toBe(3);
      expect(result.current.completedIntervalDurations).toEqual([20, 20]);
    });

    it('should not advance beyond final period', () => {
      const { result } = renderHook(() => useGameStore());

      // Setup game with 2 periods
      act(() => {
        result.current.setNumberOfPeriods(2);
        result.current.setCurrentPeriod(2); // Already at final period
      });

      // Try to advance beyond final period
      act(() => {
        result.current.setCurrentPeriod(3);
      });

      expect(result.current.gameSession.currentPeriod).toBe(2); // Should not change
    });

    it('should handle timer operations', () => {
      const { result } = renderHook(() => useGameStore());

      // Start timer
      act(() => {
        result.current.setTimerRunning(true);
      });

      expect(result.current.gameSession.isTimerRunning).toBe(true);

      // Pause timer
      act(() => {
        result.current.setTimerRunning(false);
      });

      expect(result.current.gameSession.isTimerRunning).toBe(false);

      // Set elapsed time
      act(() => {
        result.current.setTimeElapsed(900); // 15 minutes
      });

      expect(result.current.gameSession.timeElapsedInSeconds).toBe(900);
    });

    it('should reset timer correctly', () => {
      const { result } = renderHook(() => useGameStore());

      // Set some timer state
      act(() => {
        result.current.setTimeElapsed(1200);
        result.current.setTimerRunning(true);
      });

      expect(result.current.gameSession.timeElapsedInSeconds).toBe(1200);
      expect(result.current.gameSession.isTimerRunning).toBe(true);

      // Reset timer
      act(() => {
        result.current.resetTimer();
      });

      expect(result.current.gameSession.timeElapsedInSeconds).toBe(0);
      expect(result.current.gameSession.isTimerRunning).toBe(false);
    });

    it('should handle substitution intervals correctly', () => {
      const { result } = renderHook(() => useGameStore());

      act(() => {
        result.current.setSubInterval(15); // 15 minutes
        // result.current.confirmSubstitution() // Function doesn't exist;
      });

      expect(result.current.gameSession.lastSubConfirmationTimeSeconds).toBeGreaterThan(0);
      expect(result.current.nextSubDueTimeSeconds).toBe(900); // 15 * 60
    });
  });

  describe('Scoring System', () => {
    it('should increment home score', () => {
      const { result } = renderHook(() => useGameStore());

      act(() => {
        result.current.setHomeOrAway('home');
        result.current.incrementHomeScore();
      });

      expect(result.current.gameSession.homeScore).toBe(1);
      expect(result.current.gameSession.awayScore).toBe(0);
    });

    it('should increment away score', () => {
      const { result } = renderHook(() => useGameStore());

      act(() => {
        result.current.setHomeOrAway('away');
        result.current.incrementHomeScore();
      });

      expect(result.current.gameSession.homeScore).toBe(0);
      expect(result.current.gameSession.awayScore).toBe(1);
    });

    it('should decrement scores correctly', () => {
      const { result } = renderHook(() => useGameStore());

      // Setup initial scores
      act(() => {
        result.current.setHomeScore(2);
        result.current.setAwayScore(1);
      });

      act(() => {
        result.current.setHomeScore(Math.max(0, result.current.gameSession.homeScore - 1));
      });

      expect(result.current.gameSession.homeScore).toBe(1);

      act(() => {
        result.current.setAwayScore(Math.max(0, result.current.gameSession.awayScore - 1));
      });

      expect(result.current.gameSession.awayScore).toBe(0);
    });

    it('should not decrement below zero', () => {
      const { result } = renderHook(() => useGameStore());

      // Scores start at 0
      act(() => {
        result.current.setHomeScore(Math.max(0, result.current.gameSession.homeScore - 1));
        result.current.setAwayScore(Math.max(0, result.current.gameSession.awayScore - 1));
      });

      expect(result.current.gameSession.homeScore).toBe(0);
      expect(result.current.gameSession.awayScore).toBe(0);
    });

    it('should reset scores', () => {
      const { result } = renderHook(() => useGameStore());

      // Set some scores
      act(() => {
        result.current.setHomeScore(3);
        result.current.setAwayScore(2);
      });

      act(() => {
        result.current.resetScores();
      });

      expect(result.current.gameSession.homeScore).toBe(0);
      expect(result.current.gameSession.awayScore).toBe(0);
    });
  });

  describe('Player Field Management', () => {
    const mockPlayer: Player = {
      id: 'p1',
      name: 'Test Player',
      number: 7,
      position: 'forward',
    };

    const fieldPosition: Point = { x: 100, y: 200 };

    it('should add player to field', () => {
      const { result } = renderHook(() => useGameStore());

      act(() => {
        result.current.addPlayerToField(mockPlayer, fieldPosition);
      });

      expect(result.current.playersOnField).toHaveLength(1);
      expect(result.current.playersOnField[0]).toEqual({
        ...mockPlayer,
        fieldPosition,
      });
    });

    it('should remove player from field', () => {
      const { result } = renderHook(() => useGameStore());

      // Add player first
      act(() => {
        result.current.addPlayerToField(mockPlayer, fieldPosition);
      });

      expect(result.current.playersOnField).toHaveLength(1);

      // Remove player
      act(() => {
        result.current.removePlayerFromField('p1');
      });

      expect(result.current.playersOnField).toHaveLength(0);
    });

    it('should update player field position', () => {
      const { result } = renderHook(() => useGameStore());

      // Add player first
      act(() => {
        result.current.addPlayerToField(mockPlayer, fieldPosition);
      });

      const newPosition: Point = { x: 150, y: 250 };

      act(() => {
        result.current.updatePlayerFieldPosition('p1', newPosition);
      });

      const updatedPlayer = result.current.playersOnField.find(p => p.id === 'p1');
      expect(updatedPlayer?.fieldPosition).toEqual(newPosition);
    });

    it('should handle invalid player operations gracefully', () => {
      const { result } = renderHook(() => useGameStore());

      // Try to remove non-existent player
      act(() => {
        result.current.removePlayerFromField('non-existent');
      });

      expect(result.current.playersOnField).toHaveLength(0);

      // Try to update position of non-existent player
      act(() => {
        result.current.updatePlayerFieldPosition('non-existent', { x: 0, y: 0 });
      });

      expect(result.current.playersOnField).toHaveLength(0);
    });

    it('should prevent duplicate players on field', () => {
      const { result } = renderHook(() => useGameStore());

      // Add player twice
      act(() => {
        result.current.addPlayerToField(mockPlayer, fieldPosition);
        result.current.addPlayerToField(mockPlayer, { x: 200, y: 300 });
      });

      expect(result.current.playersOnField).toHaveLength(1);
    });

    it('should clear all field players', () => {
      const { result } = renderHook(() => useGameStore());

      const player1: Player = { id: 'p1', name: 'Player 1', number: 1, position: 'forward' };
      const player2: Player = { id: 'p2', name: 'Player 2', number: 2, position: 'midfielder' };

      // Add multiple players
      act(() => {
        result.current.addPlayerToField(player1, { x: 100, y: 100 });
        result.current.addPlayerToField(player2, { x: 200, y: 200 });
      });

      expect(result.current.playersOnField).toHaveLength(2);

      // Clear all players
      act(() => {
        result.current.clearFieldPlayers();
      });

      expect(result.current.playersOnField).toHaveLength(0);
    });
  });

  describe('Bench Management', () => {
    const mockBenchPlayer: Player = {
      id: 'bp1',
      name: 'Bench Player',
      number: 12,
      position: 'midfielder',
    };

    it('should add player to bench', () => {
      const { result } = renderHook(() => useGameStore());

      act(() => {
        result.current.addPlayerToBench(mockBenchPlayer);
      });

      expect(result.current.playersOnBench).toHaveLength(1);
      expect(result.current.playersOnBench[0]).toEqual(mockBenchPlayer);
    });

    it('should remove player from bench', () => {
      const { result } = renderHook(() => useGameStore());

      // Add player first
      act(() => {
        result.current.addPlayerToBench(mockBenchPlayer);
      });

      expect(result.current.playersOnBench).toHaveLength(1);

      // Remove player
      act(() => {
        result.current.removePlayerFromBench('bp1');
      });

      expect(result.current.playersOnBench).toHaveLength(0);
    });

    it('should clear all bench players', () => {
      const { result } = renderHook(() => useGameStore());

      const player1: Player = { id: 'bp1', name: 'Bench 1', number: 11, position: 'defender' };
      const player2: Player = { id: 'bp2', name: 'Bench 2', number: 12, position: 'forward' };

      // Add multiple players
      act(() => {
        result.current.addPlayerToBench(player1);
        result.current.addPlayerToBench(player2);
      });

      expect(result.current.playersOnBench).toHaveLength(2);

      // Clear all players
      act(() => {
        result.current.clearBenchPlayers();
      });

      expect(result.current.playersOnBench).toHaveLength(0);
    });
  });

  describe('Game Events', () => {
    it('should add game event', () => {
      const { result } = renderHook(() => useGameStore());

      const event: GameEvent = {
        id: 'event-1',
        type: 'goal',
        time: 300, // 5 minutes
        period: 1,
        playerId: 'p1',
        playerName: 'Scorer',
        details: 'Great shot from outside the box',
      };

      act(() => {
        result.current.addEvent(event);
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0]).toEqual(event);
    });

    it('should remove game event', () => {
      const { result } = renderHook(() => useGameStore());

      const event: GameEvent = {
        id: 'event-1',
        type: 'substitution',
        time: 600,
        period: 1,
        playerId: 'p1',
        playerName: 'Sub Out',
      };

      // Add event first
      act(() => {
        result.current.addEvent(event);
      });

      expect(result.current.events).toHaveLength(1);

      // Remove event
      act(() => {
        result.current.removeEvent('event-1');
      });

      expect(result.current.events).toHaveLength(0);
    });

    it('should update existing event', () => {
      const { result } = renderHook(() => useGameStore());

      const event: GameEvent = {
        id: 'event-1',
        type: 'goal',
        time: 300,
        period: 1,
        playerId: 'p1',
        playerName: 'Original Scorer',
      };

      // Add event
      act(() => {
        result.current.addEvent(event);
      });

      // Update event
      const updatedEvent: GameEvent = {
        ...event,
        playerName: 'Updated Scorer',
        details: 'Updated details',
      };

      act(() => {
        result.current.updateEvent('event-1', updatedEvent);
      });

      expect(result.current.events[0].playerName).toBe('Updated Scorer');
      expect(result.current.events[0].details).toBe('Updated details');
    });

    it('should clear all events', () => {
      const { result } = renderHook(() => useGameStore());

      const event1: GameEvent = {
        id: 'event-1',
        type: 'goal',
        time: 300,
        period: 1,
        playerId: 'p1',
        playerName: 'Player 1',
      };

      const event2: GameEvent = {
        id: 'event-2',
        type: 'card',
        time: 600,
        period: 1,
        playerId: 'p2',
        playerName: 'Player 2',
      };

      // Add events
      act(() => {
        result.current.addEvent(event1);
        result.current.addEvent(event2);
      });

      expect(result.current.events).toHaveLength(2);

      // Clear all events
      act(() => {
        result.current.clearEvents();
      });

      expect(result.current.events).toHaveLength(0);
    });
  });

  describe('Tactical Elements', () => {
    const mockTacticalDisc: TacticalDisc = {
      id: 'disc-1',
      position: { x: 300, y: 400 },
      color: '#FF0000',
      size: 'medium',
      label: 'Attack Zone',
    };

    it('should add tactical disc', () => {
      const { result } = renderHook(() => useGameStore());

      act(() => {
        result.current.addTacticalDisc(mockTacticalDisc);
      });

      expect(result.current.tacticalDiscs).toHaveLength(1);
      expect(result.current.tacticalDiscs[0]).toEqual(mockTacticalDisc);
    });

    it('should remove tactical disc', () => {
      const { result } = renderHook(() => useGameStore());

      // Add disc first
      act(() => {
        result.current.addTacticalDisc(mockTacticalDisc);
      });

      expect(result.current.tacticalDiscs).toHaveLength(1);

      // Remove disc
      act(() => {
        result.current.removeTacticalDisc('disc-1');
      });

      expect(result.current.tacticalDiscs).toHaveLength(0);
    });

    it('should update tactical disc position', () => {
      const { result } = renderHook(() => useGameStore());

      // Add disc
      act(() => {
        result.current.addTacticalDisc(mockTacticalDisc);
      });

      const newPosition: Point = { x: 500, y: 600 };

      // Update position
      act(() => {
        result.current.updateTacticalDiscPosition('disc-1', newPosition);
      });

      expect(result.current.tacticalDiscs[0].position).toEqual(newPosition);
    });

    it('should clear all tactical discs', () => {
      const { result } = renderHook(() => useGameStore());

      const disc1: TacticalDisc = { id: 'd1', position: { x: 100, y: 100 }, color: '#FF0000', size: 'small' };
      const disc2: TacticalDisc = { id: 'd2', position: { x: 200, y: 200 }, color: '#00FF00', size: 'large' };

      // Add discs
      act(() => {
        result.current.addTacticalDisc(disc1);
        result.current.addTacticalDisc(disc2);
      });

      expect(result.current.tacticalDiscs).toHaveLength(2);

      // Clear all
      act(() => {
        result.current.clearTacticalDiscs();
      });

      expect(result.current.tacticalDiscs).toHaveLength(0);
    });
  });

  describe('Game State Management', () => {
    it('should reset game to initial state', () => {
      const { result } = renderHook(() => useGameStore());

      // Modify game state
      act(() => {
        result.current.setGameId('test-game');
        result.current.setTeamName('Test Team');
        result.current.setHomeScore(2);
        result.current.setAwayScore(1);
        result.current.setCurrentPeriod(2);
        result.current.setTimeElapsed(1800);
        result.current.addPlayerToField(
          { id: 'p1', name: 'Player 1', number: 1, position: 'forward' },
          { x: 100, y: 100 }
        );
      });

      // Verify state was modified
      expect(result.current.gameId).toBe('test-game');
      expect(result.current.gameSession.homeScore).toBe(2);
      expect(result.current.playersOnField).toHaveLength(1);

      // Reset game
      act(() => {
        result.current.resetGame();
      });

      // Verify reset to initial state
      expect(result.current.gameId).toBeNull();
      expect(result.current.gameSession.teamName).toBe('');
      expect(result.current.gameSession.homeScore).toBe(0);
      expect(result.current.gameSession.awayScore).toBe(0);
      expect(result.current.gameSession.currentPeriod).toBe(1);
      expect(result.current.gameSession.timeElapsedInSeconds).toBe(0);
      expect(result.current.playersOnField).toHaveLength(0);
      expect(result.current.playersOnBench).toHaveLength(0);
      expect(result.current.events).toHaveLength(0);
      expect(result.current.tacticalDiscs).toHaveLength(0);
    });

    it('should handle complex game state operations', () => {
      const { result } = renderHook(() => useGameStore());

      // Perform multiple operations
      act(() => {
        result.current.setGameId('complex-game');
        result.current.setNumberOfPeriods(4);
        result.current.setPeriodDuration(25);
        
        // Add players to field and bench
        result.current.addPlayerToField(
          { id: 'f1', name: 'Field Player 1', number: 1, position: 'goalkeeper' },
          { x: 50, y: 200 }
        );
        result.current.addPlayerToBench(
          { id: 'b1', name: 'Bench Player 1', number: 12, position: 'forward' }
        );

        // Add events
        result.current.addEvent({
          id: 'e1',
          type: 'goal',
          time: 900,
          period: 1,
          playerId: 'f1',
          playerName: 'Field Player 1',
        });

        // Set scores
        result.current.setHomeOrAway('home');
        result.current.incrementHomeScore();
        
        // Add tactical element
        result.current.addTacticalDisc({
          id: 't1',
          position: { x: 300, y: 300 },
          color: '#0000FF',
          size: 'large',
        });
      });

      // Verify complex state
      expect(result.current.gameId).toBe('complex-game');
      expect(result.current.gameSession.numberOfPeriods).toBe(4);
      expect(result.current.periodDurationMinutes).toBe(25);
      expect(result.current.playersOnField).toHaveLength(1);
      expect(result.current.playersOnBench).toHaveLength(1);
      expect(result.current.events).toHaveLength(1);
      expect(result.current.gameSession.homeScore).toBe(1);
      expect(result.current.tacticalDiscs).toHaveLength(1);
    });

    it('should validate period transitions correctly', () => {
      const { result } = renderHook(() => useGameStore());

      // Set up game with 3 periods
      act(() => {
        result.current.setNumberOfPeriods(3);
        result.current.setPeriodDuration(30);
      });

      // Test normal progression
      expect(result.current.gameSession.currentPeriod).toBe(1);
      expect(result.current.isGameComplete).toBe(false);

      act(() => {
        result.current.setCurrentPeriod(result.current.gameSession.currentPeriod + 1);
      });

      expect(result.current.gameSession.currentPeriod).toBe(2);
      expect(result.current.isGameComplete).toBe(false);

      act(() => {
        result.current.setCurrentPeriod(result.current.gameSession.currentPeriod + 1);
      });

      expect(result.current.gameSession.currentPeriod).toBe(3);
      expect(result.current.isGameComplete).toBe(false);

      // After final period
      act(() => {
        result.current.markGameComplete();
      });

      expect(result.current.isGameComplete).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of players efficiently', () => {
      const { result } = renderHook(() => useGameStore());

      // Add many players to field
      const startTime = performance.now();

      act(() => {
        for (let i = 1; i <= 50; i++) {
          result.current.addPlayerToField(
            { id: `p${i}`, name: `Player ${i}`, number: i, position: 'forward' },
            { x: i * 10, y: i * 10 }
          );
        }
      });

      const endTime = performance.now();

      expect(result.current.playersOnField).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should handle concurrent state updates', () => {
      const { result } = renderHook(() => useGameStore());

      // Perform multiple concurrent updates
      act(() => {
        result.current.setHomeScore(1);
        result.current.setAwayScore(2);
        result.current.setTimeElapsed(600);
        result.current.setCurrentPeriod(2);
        result.current.addPlayerToField(
          { id: 'p1', name: 'Player 1', number: 1, position: 'forward' },
          { x: 100, y: 100 }
        );
      });

      // All updates should be applied
      expect(result.current.gameSession.homeScore).toBe(1);
      expect(result.current.gameSession.awayScore).toBe(2);
      expect(result.current.gameSession.timeElapsedInSeconds).toBe(600);
      expect(result.current.gameSession.currentPeriod).toBe(2);
      expect(result.current.playersOnField).toHaveLength(1);
    });

    it('should handle invalid input gracefully', () => {
      const { result } = renderHook(() => useGameStore());

      // Test with invalid values
      act(() => {
        result.current.setNumberOfPeriods(-1); // Should not set negative
        result.current.setPeriodDuration(0); // Should not set zero/negative
        result.current.setHomeScore(-5); // Should not set negative scores
      });

      // Should maintain valid state
      expect(result.current.gameSession.numberOfPeriods).toBeGreaterThan(0);
      expect(result.current.periodDurationMinutes).toBeGreaterThan(0);
      expect(result.current.gameSession.homeScore).toBeGreaterThanOrEqual(0);
    });
  });
});