/**
 * PersistenceStore Critical Coverage Tests
 * 
 * Focus on critical save/load operations and edge cases to reach 90% coverage.
 * Priority areas:
 * 1. Save/load game operations with corruption handling
 * 2. Master roster persistence with validation
 * 3. Seasons/tournaments CRUD operations
 * 4. Data integrity and error recovery
 * 5. Bulk operations and performance scenarios
 */

import { renderHook, act } from '@testing-library/react';
import { usePersistenceStore } from '../persistenceStore';
import type { AppState, Player, Season, Tournament } from '@/types';
import * as typedStorageHelpers from '@/utils/typedStorageHelpers';
import { authAwareStorageManager } from '@/lib/storage';
import logger from '@/utils/logger';

// Mock external dependencies
jest.mock('@/utils/typedStorageHelpers', () => ({
  getTypedSavedGames: jest.fn(),
  saveTypedGame: jest.fn(),
  getTypedMasterRoster: jest.fn(),
  saveTypedMasterRoster: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  authAwareStorageManager: {
    deleteGame: jest.fn(),
    deleteSavedGame: jest.fn(),
    deletePlayer: jest.fn(),
    deleteSeason: jest.fn(),
    deleteTournament: jest.fn(),
    saveMasterRoster: jest.fn(),
    getPlayers: jest.fn(),
    getSeasons: jest.fn(),
    getTournaments: jest.fn(),
    setGenericData: jest.fn(),
    getGenericData: jest.fn(),
    deleteGenericData: jest.fn(),
    clearAllData: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
}));

describe('PersistenceStore Critical Coverage Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Clear all data to reset store state
    const store = usePersistenceStore.getState();
    await store.clearAllData();
  });

  describe('Game Save/Load Operations', () => {
    const mockGameState: AppState = {
      gameId: 'test-game-1',
      homeTeam: 'Home Team',
      awayTeam: 'Away Team',
      players: [
        { id: 'p1', name: 'Player 1', position: 'field', number: 1 },
        { id: 'p2', name: 'Player 2', position: 'bench', number: 2 },
      ],
      gameSettings: {
        periodDuration: 45,
        numberOfPeriods: 2,
        enableTimer: true,
      },
      currentPeriod: 1,
      gameTimer: { elapsed: 0, running: false },
      score: { home: 0, away: 0 },
      events: [],
    };

    it('should save game successfully', async () => {
      (typedStorageHelpers.saveTypedGame as jest.Mock).mockResolvedValue(true);
      (typedStorageHelpers.getTypedSavedGames as jest.Mock).mockResolvedValue({
        'test-game-1': mockGameState
      });

      const { result } = renderHook(() => usePersistenceStore());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveGame('test-game-1', mockGameState);
      });

      expect(saveResult).toBe(true);
      expect(typedStorageHelpers.saveTypedGame).toHaveBeenCalledWith(mockGameState);
      expect(result.current.savedGames['test-game-1']).toBeDefined();
    });

    it('should handle save game failure', async () => {
      const error = new Error('Storage quota exceeded');
      (typedStorageHelpers.saveTypedGame as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => usePersistenceStore());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveGame('test-game-1', mockGameState);
      });

      expect(saveResult).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('[PersistenceStore] Failed to save game test-game-1:', error);
    });

    it('should load game successfully', async () => {
      (typedStorageHelpers.getTypedSavedGames as jest.Mock).mockResolvedValue({
        'test-game-1': mockGameState,
      });

      const { result } = renderHook(() => usePersistenceStore());

      let loadedGame;
      await act(async () => {
        loadedGame = await result.current.loadGame('test-game-1');
      });

      expect(loadedGame).toEqual(mockGameState);
      expect(result.current.savedGames['test-game-1']).toEqual(mockGameState);
    });

    it('should handle corrupted game data during load', async () => {
      const corruptedData = {
        'test-game-1': {
          // Missing required fields
          gameId: 'test-game-1',
          // homeTeam: missing
          // awayTeam: missing
          // players: missing
        },
      };

      (typedStorageHelpers.getTypedSavedGames as jest.Mock).mockResolvedValue(corruptedData);

      const { result } = renderHook(() => usePersistenceStore());

      let loadedGame;
      await act(async () => {
        loadedGame = await result.current.loadGame('test-game-1');
      });

      expect(loadedGame).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load game test-game-1')
      );
    });

    it('should delete game successfully', async () => {
      // Setup initial state with a game
      const { result } = renderHook(() => usePersistenceStore());
      
      await act(async () => {
        await result.current.saveGame('test-game-1', mockGameState);
      });

      (authAwareStorageManager.deleteSavedGame as jest.Mock).mockResolvedValue(true);

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteGame('test-game-1');
      });

      expect(deleteResult).toBe(true);
      expect(authAwareStorageManager.deleteSavedGame).toHaveBeenCalledWith('test-game-1');
      expect(result.current.savedGames['test-game-1']).toBeUndefined();
    });

    it('should duplicate game successfully', async () => {
      // Setup initial state with a game
      const { result } = renderHook(() => usePersistenceStore());
      
      await act(async () => {
        await result.current.saveGame('test-game-1', mockGameState);
      });

      (typedStorageHelpers.saveTypedGame as jest.Mock).mockResolvedValue(true);

      let duplicateResult;
      await act(async () => {
        duplicateResult = await result.current.duplicateGame('test-game-1', 'test-game-2');
      });

      expect(duplicateResult).toBe(true);
      expect(typedStorageHelpers.saveTypedGame).toHaveBeenCalledWith(
        'test-game-2',
        expect.objectContaining({
          ...mockGameState,
          gameId: 'test-game-2',
        })
      );
      expect(result.current.savedGames['test-game-2']).toBeDefined();
    });

    it('should handle duplicate game with non-existent source', async () => {
      const { result } = renderHook(() => usePersistenceStore());

      let duplicateResult;
      await act(async () => {
        duplicateResult = await result.current.duplicateGame('non-existent', 'test-game-2');
      });

      expect(duplicateResult).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Source game non-existent not found')
      );
    });

    it('should get games list with proper metadata', async () => {
      const gamesData = {
        'game-1': {
          ...mockGameState,
          gameId: 'game-1',
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          gameDate: '2024-01-15',
          isCompleted: true,
        },
        'game-2': {
          ...mockGameState,
          gameId: 'game-2',
          homeTeam: 'Team C',
          awayTeam: 'Team D',
          gameDate: '2024-01-16',
          isCompleted: false,
        },
      };

      const { result } = renderHook(() => usePersistenceStore());
      
      // Save multiple games
      await act(async () => {
        await result.current.saveGame('game-1', {} as AppState);
        await result.current.saveGame('game-2', {} as AppState);
      });

      const gamesList = result.current.getGamesList();

      expect(gamesList).toHaveLength(2);
      expect(gamesList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'game-1',
            name: 'Team A vs Team B',
            date: '2024-01-15',
            isPlayed: true,
          }),
          expect.objectContaining({
            id: 'game-2',
            name: 'Team C vs Team D',
            date: '2024-01-16',
            isPlayed: false,
          }),
        ])
      );
    });
  });

  describe('Master Roster Operations', () => {
    const mockPlayers: Player[] = [
      { id: 'p1', name: 'Player 1', number: 1, position: 'forward' },
      { id: 'p2', name: 'Player 2', number: 2, position: 'midfielder' },
      { id: 'p3', name: 'Player 3', number: 3, position: 'defender' },
    ];

    it('should save master roster successfully', async () => {
      (authAwareStorageManager.saveMasterRoster as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => usePersistenceStore());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveMasterRoster(mockPlayers);
      });

      expect(saveResult).toBe(true);
      expect(authAwareStorageManager.saveMasterRoster).toHaveBeenCalledWith(mockPlayers);
      expect(result.current.masterRoster).toEqual(mockPlayers);
    });

    it('should load master roster with validation', async () => {
      (typedStorageHelpers.getTypedMasterRoster as jest.Mock).mockResolvedValue(mockPlayers);

      const { result } = renderHook(() => usePersistenceStore());

      let loadedRoster;
      await act(async () => {
        loadedRoster = await result.current.loadMasterRoster();
      });

      expect(loadedRoster).toEqual(mockPlayers);
      expect(result.current.masterRoster).toEqual(mockPlayers);
    });

    it('should handle invalid roster data during load', async () => {
      const invalidRoster = [
        { id: 'p1' }, // Missing required fields
        { name: 'Player 2' }, // Missing id
      ];

      (typedStorageHelpers.getTypedMasterRoster as jest.Mock).mockResolvedValue(invalidRoster);

      const { result } = renderHook(() => usePersistenceStore());

      let loadedRoster;
      await act(async () => {
        loadedRoster = await result.current.loadMasterRoster();
      });

      expect(loadedRoster).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid master roster data')
      );
    });

    it('should add player to roster', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      const newPlayer: Player = { id: 'p4', name: 'New Player', number: 4, position: 'goalkeeper' };

      // Set initial roster
      await act(async () => {
        result.current.setMasterRoster(mockPlayers);
      });

      (authAwareStorageManager.saveMasterRoster as jest.Mock).mockResolvedValue(true);

      let addResult;
      await act(async () => {
        addResult = await result.current.addPlayerToRoster(newPlayer);
      });

      expect(addResult).toBe(true);
      expect(result.current.masterRoster).toHaveLength(4);
      expect(result.current.masterRoster).toContainEqual(newPlayer);
    });

    it('should prevent duplicate player numbers', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      const duplicateNumberPlayer: Player = { 
        id: 'p4', 
        name: 'Duplicate Number', 
        number: 1, // Same as existing player
        position: 'goalkeeper' 
      };

      // Set initial roster
      await act(async () => {
        result.current.setMasterRoster(mockPlayers);
      });

      let addResult;
      await act(async () => {
        addResult = await result.current.addPlayerToRoster(duplicateNumberPlayer);
      });

      expect(addResult).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Player number 1 already exists')
      );
    });

    it('should update player in roster', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Set initial roster
      await act(async () => {
        result.current.setMasterRoster(mockPlayers);
      });

      (authAwareStorageManager.saveMasterRoster as jest.Mock).mockResolvedValue(true);

      const updates = { name: 'Updated Player 1', position: 'goalkeeper' };

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updatePlayerInRoster('p1', updates);
      });

      expect(updateResult).toBe(true);
      
      const updatedPlayer = result.current.masterRoster.find(p => p.id === 'p1');
      expect(updatedPlayer?.name).toBe('Updated Player 1');
      expect(updatedPlayer?.position).toBe('goalkeeper');
    });

    it('should remove player from roster', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Set initial roster
      await act(async () => {
        result.current.setMasterRoster(mockPlayers);
      });

      (authAwareStorageManager.saveMasterRoster as jest.Mock).mockResolvedValue(true);

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removePlayerFromRoster('p2');
      });

      expect(removeResult).toBe(true);
      expect(result.current.masterRoster).toHaveLength(2);
      expect(result.current.masterRoster.find(p => p.id === 'p2')).toBeUndefined();
    });
  });

  describe('Seasons and Tournaments Operations', () => {
    const mockSeasons: Season[] = [
      { id: 's1', name: 'Season 2024', startDate: '2024-01-01', endDate: '2024-12-31' },
      { id: 's2', name: 'Season 2025', startDate: '2025-01-01', endDate: '2025-12-31' },
    ];

    const mockTournaments: Tournament[] = [
      { id: 't1', name: 'Spring Cup', startDate: '2024-03-01', endDate: '2024-03-15' },
      { id: 't2', name: 'Summer League', startDate: '2024-06-01', endDate: '2024-08-31' },
    ];

    it('should save and load seasons successfully', async () => {
      const { result } = renderHook(() => usePersistenceStore());

      (authAwareStorageManager.setGenericData as jest.Mock).mockResolvedValue(true);
      (authAwareStorageManager.getGenericData as jest.Mock).mockResolvedValue(mockSeasons);

      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveSeasons(mockSeasons);
      });

      expect(saveResult).toBe(true);
      expect(result.current.seasons).toEqual(mockSeasons);

      let loadedSeasons;
      await act(async () => {
        loadedSeasons = await result.current.loadSeasons();
      });

      expect(loadedSeasons).toEqual(mockSeasons);
    });

    it('should add new season with validation', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      const newSeason: Season = { 
        id: 's3', 
        name: 'Season 2026', 
        startDate: '2026-01-01', 
        endDate: '2026-12-31' 
      };

      (authAwareStorageManager.setGenericData as jest.Mock).mockResolvedValue(true);

      // Set initial seasons
      await act(async () => {
        result.current.setSeasons(mockSeasons);
      });

      let addResult;
      await act(async () => {
        addResult = await result.current.addSeason(newSeason);
      });

      expect(addResult).toBe(true);
      expect(result.current.seasons).toHaveLength(3);
      expect(result.current.seasons).toContainEqual(newSeason);
    });

    it('should prevent duplicate season names', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      const duplicateSeason: Season = { 
        id: 's3', 
        name: 'Season 2024', // Duplicate name
        startDate: '2026-01-01', 
        endDate: '2026-12-31' 
      };

      // Set initial seasons
      await act(async () => {
        result.current.setSeasons(mockSeasons);
      });

      let addResult;
      await act(async () => {
        addResult = await result.current.addSeason(duplicateSeason);
      });

      expect(addResult).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Season with name "Season 2024" already exists')
      );
    });

    it('should update season successfully', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      (authAwareStorageManager.setGenericData as jest.Mock).mockResolvedValue(true);

      // Set initial seasons
      await act(async () => {
        result.current.setSeasons(mockSeasons);
      });

      const updates = { name: 'Updated Season 2024', endDate: '2024-11-30' };

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateSeason('s1', updates);
      });

      expect(updateResult).toBe(true);
      
      const updatedSeason = result.current.seasons.find(s => s.id === 's1');
      expect(updatedSeason?.name).toBe('Updated Season 2024');
      expect(updatedSeason?.endDate).toBe('2024-11-30');
    });

    it('should delete season successfully', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      (authAwareStorageManager.setGenericData as jest.Mock).mockResolvedValue(true);

      // Set initial seasons
      await act(async () => {
        result.current.setSeasons(mockSeasons);
      });

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteSeason('s2');
      });

      expect(deleteResult).toBe(true);
      expect(result.current.seasons).toHaveLength(1);
      expect(result.current.seasons.find(s => s.id === 's2')).toBeUndefined();
    });

    it('should handle tournaments with same operations pattern', async () => {
      const { result } = renderHook(() => usePersistenceStore());

      (authAwareStorageManager.setGenericData as jest.Mock).mockResolvedValue(true);
      (authAwareStorageManager.getGenericData as jest.Mock).mockResolvedValue(mockTournaments);

      // Test save/load cycle
      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveTournaments(mockTournaments);
      });

      expect(saveResult).toBe(true);
      expect(result.current.tournaments).toEqual(mockTournaments);

      let loadedTournaments;
      await act(async () => {
        loadedTournaments = await result.current.loadTournaments();
      });

      expect(loadedTournaments).toEqual(mockTournaments);
    });
  });

  describe('Data Integrity and Error Recovery', () => {
    it('should handle storage manager unavailability', async () => {
      const { result } = renderHook(() => usePersistenceStore());

      // Mock storage manager to throw
      (authAwareStorageManager.saveMasterRoster as jest.Mock).mockRejectedValue(
        new Error('Storage manager unavailable')
      );

      const mockGameState: AppState = {
        gameId: 'test-game',
        homeTeam: 'Home',
        awayTeam: 'Away',
        players: [],
        gameSettings: { periodDuration: 45, numberOfPeriods: 2, enableTimer: true },
        currentPeriod: 1,
        gameTimer: { elapsed: 0, running: false },
        score: { home: 0, away: 0 },
        events: [],
      };

      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveGame('test-game', mockGameState);
      });

      // Should handle gracefully
      expect(saveResult).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save game')
      );
    });

    it('should clear all data safely', async () => {
      const { result } = renderHook(() => usePersistenceStore());

      // Setup initial data
      await act(async () => {
        await result.current.saveGame('game-1', {} as AppState);
        await result.current.saveMasterRoster([{ id: 'p1', name: 'Player', number: 1, position: 'forward' }]);
        await result.current.saveSeasons([{ id: 's1', name: 'Season', startDate: '2024-01-01', endDate: '2024-12-31' }]);
      });

      // Mock storage operations
      (authAwareStorageManager.getPlayers as jest.Mock).mockResolvedValue([
        { id: 'p1', name: 'Player', number: 1, position: 'forward' }
      ]);
      (authAwareStorageManager.getSeasons as jest.Mock).mockResolvedValue([]);
      (authAwareStorageManager.getTournaments as jest.Mock).mockResolvedValue([]);
      (authAwareStorageManager.deleteSavedGame as jest.Mock).mockResolvedValue(true);
      (authAwareStorageManager.deletePlayer as jest.Mock).mockResolvedValue(true);

      let clearResult;
      await act(async () => {
        clearResult = await result.current.clearAllData();
      });

      expect(clearResult).toBe(true);
      expect(result.current.savedGames).toEqual({});
      expect(result.current.masterRoster).toEqual([]);
      expect(result.current.seasons).toEqual([]);
      expect(result.current.tournaments).toEqual([]);
    });

    it('should handle partial clear failures gracefully', async () => {
      const { result } = renderHook(() => usePersistenceStore());

      // Setup initial data
      await act(async () => {
        await result.current.saveGame('game-1', {} as AppState);
      });

      // Mock some operations to fail
      (authAwareStorageManager.getPlayers as jest.Mock).mockRejectedValue(new Error('Network error'));
      (authAwareStorageManager.getSeasons as jest.Mock).mockResolvedValue([]);
      (authAwareStorageManager.getTournaments as jest.Mock).mockResolvedValue([]);
      (authAwareStorageManager.deleteSavedGame as jest.Mock).mockResolvedValue(true);

      let clearResult;
      await act(async () => {
        clearResult = await result.current.clearAllData();
      });

      // Should still clear what it can
      expect(clearResult).toBe(false); // Overall failure due to error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Clear all data error')
      );
    });
  });

  describe('Performance and Bulk Operations', () => {
    it('should handle large datasets efficiently', async () => {
      const { result } = renderHook(() => usePersistenceStore());

      // Create large dataset
      const largeRoster: Player[] = [];
      for (let i = 1; i <= 100; i++) {
        largeRoster.push({
          id: `p${i}`,
          name: `Player ${i}`,
          number: i,
          position: i % 4 === 0 ? 'goalkeeper' : 'forward',
        });
      }

      (authAwareStorageManager.saveMasterRoster as jest.Mock).mockResolvedValue(true);

      const startTime = performance.now();

      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveMasterRoster(largeRoster);
      });

      const endTime = performance.now();

      expect(saveResult).toBe(true);
      expect(result.current.masterRoster).toHaveLength(100);
      
      // Should complete reasonably quickly (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle concurrent operations safely', async () => {
      const { result } = renderHook(() => usePersistenceStore());

      const mockGameState1: AppState = {
        gameId: 'concurrent-game-1',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        players: [],
        gameSettings: { periodDuration: 45, numberOfPeriods: 2, enableTimer: true },
        currentPeriod: 1,
        gameTimer: { elapsed: 0, running: false },
        score: { home: 0, away: 0 },
        events: [],
      };

      const mockGameState2: AppState = {
        ...mockGameState1,
        gameId: 'concurrent-game-2',
        homeTeam: 'Team C',
        awayTeam: 'Team D',
      };

      (typedStorageHelpers.saveTypedGame as jest.Mock).mockResolvedValue(true);
      (typedStorageHelpers.getTypedSavedGames as jest.Mock).mockResolvedValue({
        'concurrent-game-1': mockGameState1,
        'concurrent-game-2': mockGameState2
      });

      // Execute concurrent saves
      const [result1, result2] = await Promise.all([
        act(async () => result.current.saveGame('concurrent-game-1', mockGameState1)),
        act(async () => result.current.saveGame('concurrent-game-2', mockGameState2)),
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result.current.savedGames['concurrent-game-1']).toBeDefined();
      expect(result.current.savedGames['concurrent-game-2']).toBeDefined();
    });
  });
});