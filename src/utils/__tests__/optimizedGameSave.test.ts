/**
 * Optimized Game Save Tests - Performance Critical
 * 
 * Tests for optimized game saving utilities that provide performance
 * improvements for frequently-used save operations.
 */

import { saveGameEventOnly, batchSaveGameChanges } from '../optimizedGameSave';
import { storageManager } from '@/lib/storage';
import logger from '../logger';
import type { AppState, GameEvent } from '@/types';

// Mock dependencies
jest.mock('@/lib/storage', () => ({
  storageManager: {
    getProviderName: jest.fn(),
    getSavedGames: jest.fn(),
    saveSavedGame: jest.fn(),
  },
}));

jest.mock('../logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;

describe('Optimized Game Save Utilities', () => {
  const mockGameId = 'test-game-123';
  
  const mockGameState: AppState = {
    gameId: mockGameId,
    teamName: 'Test Team',
    opponentName: 'Test Opponent',
    gameDate: '2024-01-01',
    homeScore: 1,
    awayScore: 0,
    gameNotes: '',
    homeOrAway: 'home',
    numberOfPeriods: 2,
    periodDurationMinutes: 45,
    currentPeriod: 1,
    gameStatus: 'inProgress',
    seasonId: 'season-1',
    tournamentId: 'tournament-1',
    gamePhase: 'firstHalf',
    timeElapsedInSeconds: 1234,
    isPlayed: true,
    playersOnField: [],
    opponents: [],
    drawings: [],
    availablePlayers: [],
    gameEvents: [
      {
        id: 'event-1',
        time: 600,
        type: 'goal',
        playerId: 'player-1',
        homeScore: 1,
        awayScore: 0,
      },
    ],
    selectedPlayerIds: [],
    tacticalDiscs: [],
    tacticalDrawings: [],
    tacticalBallPosition: { relX: 0.5, relY: 0.5 },
    completedIntervalDurations: [],
    lastSubConfirmationTimeSeconds: null,
    showPlayerNames: true,
  };

  const mockNewEvent: GameEvent = {
    id: 'event-2',
    time: 1200,
    type: 'substitution',
    playerId: 'player-2',
    substitutePlayerId: 'player-3',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageManager.getSavedGames.mockResolvedValue({
      [mockGameId]: mockGameState,
    });
    mockStorageManager.saveSavedGame.mockResolvedValue(undefined);
  });

  describe('saveGameEventOnly', () => {
    describe('Supabase storage provider', () => {
      beforeEach(() => {
        mockStorageManager.getProviderName?.mockReturnValue('supabase-provider');
      });

      it('should save only event for supabase with partial update', async () => {
        await saveGameEventOnly(mockGameId, mockNewEvent);

        expect(mockStorageManager.getSavedGames).toHaveBeenCalledTimes(1);
        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          id: mockGameId,
          gameEvents: [...mockGameState.gameEvents, mockNewEvent],
        });
        expect(logger.log).toHaveBeenCalledWith(
          `[OPTIMIZED] Saved only event and score for game ${mockGameId}`
        );
      });

      it('should save event with updated score for supabase', async () => {
        const updatedScore = { homeScore: 2, awayScore: 1 };
        
        await saveGameEventOnly(mockGameId, mockNewEvent, updatedScore);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          id: mockGameId,
          gameEvents: [...mockGameState.gameEvents, mockNewEvent],
          homeScore: 2,
          awayScore: 1,
        });
      });

      it('should handle game not found for supabase', async () => {
        mockStorageManager.getSavedGames.mockResolvedValue({});

        await expect(saveGameEventOnly('non-existent-game', mockNewEvent))
          .rejects.toThrow('Game not found');

        expect(mockStorageManager.saveSavedGame).not.toHaveBeenCalled();
      });
    });

    describe('localStorage storage provider', () => {
      beforeEach(() => {
        mockStorageManager.getProviderName?.mockReturnValue('localStorage-provider');
      });

      it('should save full game for localStorage', async () => {
        await saveGameEventOnly(mockGameId, mockNewEvent);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          ...mockGameState,
          gameEvents: [...mockGameState.gameEvents, mockNewEvent],
        });
      });

      it('should save full game with updated score for localStorage', async () => {
        const updatedScore = { homeScore: 2, awayScore: 1 };
        
        await saveGameEventOnly(mockGameId, mockNewEvent, updatedScore);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          ...mockGameState,
          gameEvents: [...mockGameState.gameEvents, mockNewEvent],
          homeScore: 2,
          awayScore: 1,
        });
      });

      it('should handle game not found for localStorage', async () => {
        mockStorageManager.getSavedGames.mockResolvedValue({});

        await expect(saveGameEventOnly('non-existent-game', mockNewEvent))
          .rejects.toThrow('Game not found');
      });
    });

    describe('Provider without getProviderName method', () => {
      beforeEach(() => {
        delete (mockStorageManager as any).getProviderName;
      });

      it('should fallback to localStorage behavior when getProviderName is not available', async () => {
        await saveGameEventOnly(mockGameId, mockNewEvent);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          ...mockGameState,
          gameEvents: [...mockGameState.gameEvents, mockNewEvent],
        });
      });
    });

    describe('Error handling', () => {
      it('should handle storage manager errors', async () => {
        const storageError = new Error('Storage failed');
        mockStorageManager.getSavedGames.mockRejectedValue(storageError);

        await expect(saveGameEventOnly(mockGameId, mockNewEvent))
          .rejects.toThrow('Storage failed');

        expect(logger.error).toHaveBeenCalledWith('Failed to save game event:', storageError);
      });

      it('should handle save operation errors', async () => {
        const saveError = new Error('Save operation failed');
        mockStorageManager.saveSavedGame.mockRejectedValue(saveError);

        await expect(saveGameEventOnly(mockGameId, mockNewEvent))
          .rejects.toThrow('Save operation failed');

        expect(logger.error).toHaveBeenCalledWith('Failed to save game event:', saveError);
      });

      it('should handle games with no existing events', async () => {
        const gameWithoutEvents = { ...mockGameState, gameEvents: undefined as any };
        mockStorageManager.getSavedGames.mockResolvedValue({
          [mockGameId]: gameWithoutEvents,
        });

        await saveGameEventOnly(mockGameId, mockNewEvent);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith(
          expect.objectContaining({
            gameEvents: [mockNewEvent],
          })
        );
      });
    });
  });

  describe('batchSaveGameChanges', () => {
    const mockChanges = {
      events: [mockNewEvent],
      score: { homeScore: 2, awayScore: 1 },
      assessments: [{ playerId: 'player-1', rating: 8 }],
      timerState: { elapsed: 2400, phase: 'secondHalf' },
    };

    it('should batch save multiple changes', async () => {
      await batchSaveGameChanges(mockGameId, mockChanges);

      expect(mockStorageManager.getSavedGames).toHaveBeenCalledTimes(1);
      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockGameState,
        gameEvents: mockChanges.events,
        homeScore: 2,
        awayScore: 1,
        assessments: mockChanges.assessments,
        timerState: mockChanges.timerState,
      });
      expect(logger.log).toHaveBeenCalledWith(
        `[BATCH] Saved 4 changes for game ${mockGameId}`
      );
    });

    it('should save only specified changes', async () => {
      const partialChanges = {
        events: [mockNewEvent],
        score: { homeScore: 3, awayScore: 2 },
      };

      await batchSaveGameChanges(mockGameId, partialChanges);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockGameState,
        gameEvents: partialChanges.events,
        homeScore: 3,
        awayScore: 2,
      });
      expect(logger.log).toHaveBeenCalledWith(
        `[BATCH] Saved 2 changes for game ${mockGameId}`
      );
    });

    it('should handle empty changes object', async () => {
      await batchSaveGameChanges(mockGameId, {});

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith(mockGameState);
      expect(logger.log).toHaveBeenCalledWith(
        `[BATCH] Saved 0 changes for game ${mockGameId}`
      );
    });

    it('should skip falsy timer state', async () => {
      const changesWithFalsyTimer = {
        events: [mockNewEvent],
        timerState: null,
      };

      await batchSaveGameChanges(mockGameId, changesWithFalsyTimer);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockGameState,
        gameEvents: changesWithFalsyTimer.events,
      });
    });

    it('should handle game not found', async () => {
      mockStorageManager.getSavedGames.mockResolvedValue({});

      await expect(batchSaveGameChanges('non-existent-game', mockChanges))
        .rejects.toThrow('Game not found');

      expect(mockStorageManager.saveSavedGame).not.toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      const storageError = new Error('Batch save failed');
      mockStorageManager.saveSavedGame.mockRejectedValue(storageError);

      await expect(batchSaveGameChanges(mockGameId, mockChanges))
        .rejects.toThrow('Batch save failed');

      expect(logger.error).toHaveBeenCalledWith('Failed to batch save game changes:', storageError);
    });

    it('should handle undefined assessments correctly', async () => {
      const changesWithUndefinedAssessments = {
        events: [mockNewEvent],
        assessments: undefined,
      };

      await batchSaveGameChanges(mockGameId, changesWithUndefinedAssessments);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockGameState,
        gameEvents: changesWithUndefinedAssessments.events,
      });
    });

    it('should handle empty arrays correctly', async () => {
      const changesWithEmptyArrays = {
        events: [],
        assessments: [],
      };

      await batchSaveGameChanges(mockGameId, changesWithEmptyArrays);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockGameState,
        gameEvents: [],
        assessments: [],
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle rapid successive saves', async () => {
      const promises = [
        saveGameEventOnly(mockGameId, mockNewEvent),
        saveGameEventOnly(mockGameId, { ...mockNewEvent, id: 'event-3' }),
        batchSaveGameChanges(mockGameId, { score: { homeScore: 3, awayScore: 2 } }),
      ];

      await Promise.all(promises);

      expect(mockStorageManager.getSavedGames).toHaveBeenCalledTimes(3);
      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledTimes(3);
    });

    it('should maintain data consistency across operations', async () => {
      // First save an event
      await saveGameEventOnly(mockGameId, mockNewEvent);

      // Then batch save additional changes
      await batchSaveGameChanges(mockGameId, {
        score: { homeScore: 2, awayScore: 1 },
        assessments: [{ playerId: 'player-1', rating: 9 }],
      });

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance edge cases', () => {
    it('should handle large event arrays efficiently', async () => {
      const largeEventArray = Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i}`,
        time: i * 60,
        type: 'goal' as const,
        playerId: `player-${i % 10}`,
        homeScore: Math.floor(i / 2),
        awayScore: Math.floor(i / 3),
      }));

      const gameWithManyEvents = {
        ...mockGameState,
        gameEvents: largeEventArray,
      };

      mockStorageManager.getSavedGames.mockResolvedValue({
        [mockGameId]: gameWithManyEvents,
      });

      await saveGameEventOnly(mockGameId, mockNewEvent);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith(
        expect.objectContaining({
          gameEvents: [...largeEventArray, mockNewEvent],
        })
      );
    });

    it('should handle complex nested timer state', async () => {
      const complexTimerState = {
        currentPhase: 'secondHalf',
        elapsed: 2700,
        intervals: [
          { start: 0, end: 2700, type: 'playing' },
          { start: 2700, end: 2760, type: 'injury' },
        ],
        lastUpdate: new Date().toISOString(),
        metadata: {
          pauseCount: 3,
          totalPauseTime: 180,
          adjustments: [15, 30, 60],
        },
      };

      await batchSaveGameChanges(mockGameId, {
        timerState: complexTimerState,
      });

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockGameState,
        timerState: complexTimerState,
      });
    });
  });
});