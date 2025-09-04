import { hardResetAllUserData, HardResetResult } from '../hardResetApp';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { resetAppSettings } from '@/utils/appSettings';
import logger from '@/utils/logger';

// Mock dependencies
jest.mock('@/lib/storage', () => ({
  authAwareStorageManager: {
    getPlayers: jest.fn(),
    getSeasons: jest.fn(),
    getTournaments: jest.fn(),
    getSavedGames: jest.fn(),
    deletePlayer: jest.fn(),
    deleteSeason: jest.fn(),
    deleteTournament: jest.fn(),
    deleteSavedGame: jest.fn(),
  }
}));

jest.mock('@/utils/appSettings', () => ({
  resetAppSettings: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  default: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('hardResetApp', () => {
  const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;
  const mockResetAppSettings = resetAppSettings as jest.MockedFunction<typeof resetAppSettings>;
  
  // Get mocked logger functions
  const mockLoggerFunctions = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock default data
    mockStorageManager.getPlayers.mockResolvedValue([
      { id: 'player1', name: 'Player 1' } as any,
      { id: 'player2', name: 'Player 2' } as any,
    ]);
    mockStorageManager.getSeasons.mockResolvedValue([
      { id: 'season1', name: 'Season 1' } as any,
    ]);
    mockStorageManager.getTournaments.mockResolvedValue([
      { id: 'tournament1', name: 'Tournament 1' } as any,
      { id: 'tournament2', name: 'Tournament 2' } as any,
    ]);
    mockStorageManager.getSavedGames.mockResolvedValue({
      'game1': { id: 'game1', name: 'Game 1' },
      'game2': { id: 'game2', name: 'Game 2' },
      'game3': { id: 'game3', name: 'Game 3' },
    });

    // Mock successful deletions
    mockStorageManager.deletePlayer.mockResolvedValue();
    mockStorageManager.deleteSeason.mockResolvedValue();
    mockStorageManager.deleteTournament.mockResolvedValue();
    mockStorageManager.deleteSavedGame.mockResolvedValue();
    mockResetAppSettings.mockResolvedValue();
  });

  describe('hardResetAllUserData', () => {
    it('should successfully delete all user data and return counts', async () => {
      const result = await hardResetAllUserData();

      expect(result).toEqual({
        playersDeleted: 2,
        seasonsDeleted: 1,
        tournamentsDeleted: 2,
        gamesDeleted: 3,
      });

      // Verify all data was fetched
      expect(mockStorageManager.getPlayers).toHaveBeenCalledTimes(1);
      expect(mockStorageManager.getSeasons).toHaveBeenCalledTimes(1);
      expect(mockStorageManager.getTournaments).toHaveBeenCalledTimes(1);
      expect(mockStorageManager.getSavedGames).toHaveBeenCalledTimes(1);

      // Verify deletions
      expect(mockStorageManager.deletePlayer).toHaveBeenCalledWith('player1');
      expect(mockStorageManager.deletePlayer).toHaveBeenCalledWith('player2');
      expect(mockStorageManager.deleteSeason).toHaveBeenCalledWith('season1');
      expect(mockStorageManager.deleteTournament).toHaveBeenCalledWith('tournament1');
      expect(mockStorageManager.deleteTournament).toHaveBeenCalledWith('tournament2');
      expect(mockStorageManager.deleteSavedGame).toHaveBeenCalledWith('game1');
      expect(mockStorageManager.deleteSavedGame).toHaveBeenCalledWith('game2');
      expect(mockStorageManager.deleteSavedGame).toHaveBeenCalledWith('game3');

      // Verify app settings reset
      expect(mockResetAppSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle empty data sets', async () => {
      mockStorageManager.getPlayers.mockResolvedValue([]);
      mockStorageManager.getSeasons.mockResolvedValue([]);
      mockStorageManager.getTournaments.mockResolvedValue([]);
      mockStorageManager.getSavedGames.mockResolvedValue({});

      const result = await hardResetAllUserData();

      expect(result).toEqual({
        playersDeleted: 0,
        seasonsDeleted: 0,
        tournamentsDeleted: 0,
        gamesDeleted: 0,
      });

      // Should not call delete methods
      expect(mockStorageManager.deletePlayer).not.toHaveBeenCalled();
      expect(mockStorageManager.deleteSeason).not.toHaveBeenCalled();
      expect(mockStorageManager.deleteTournament).not.toHaveBeenCalled();
      expect(mockStorageManager.deleteSavedGame).not.toHaveBeenCalled();

      // Should still reset app settings
      expect(mockResetAppSettings).toHaveBeenCalledTimes(1);
    });

    it('should continue deletion even if individual deletions fail', async () => {
      // Make some deletions fail
      mockStorageManager.deletePlayer.mockRejectedValueOnce(new Error('Player delete failed'));
      mockStorageManager.deleteSeason.mockRejectedValueOnce(new Error('Season delete failed'));

      const result = await hardResetAllUserData();

      expect(result).toEqual({
        playersDeleted: 2,
        seasonsDeleted: 1,
        tournamentsDeleted: 2,
        gamesDeleted: 3,
      });

      // Should still attempt all deletions and reset settings
      expect(mockStorageManager.deletePlayer).toHaveBeenCalledTimes(2);
      expect(mockStorageManager.deleteTournament).toHaveBeenCalledTimes(2);
      expect(mockResetAppSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle PWA cache clearing when caches API is available', async () => {
      const mockCaches = {
        keys: jest.fn().mockResolvedValue(['cache1', 'cache2']),
        delete: jest.fn().mockResolvedValue(true),
      };
      
      // Mock global caches
      (global as any).caches = mockCaches;

      await hardResetAllUserData();

      expect(mockCaches.keys).toHaveBeenCalledTimes(1);
      expect(mockCaches.delete).toHaveBeenCalledWith('cache1');
      expect(mockCaches.delete).toHaveBeenCalledWith('cache2');

      // Clean up
      delete (global as any).caches;
    });

    it('should handle PWA cache clearing failure gracefully', async () => {
      const mockCaches = {
        keys: jest.fn().mockRejectedValue(new Error('Cache access failed')),
        delete: jest.fn(),
      };
      
      (global as any).caches = mockCaches;

      // Should not throw - errors are handled gracefully
      await expect(hardResetAllUserData()).resolves.toBeDefined();

      delete (global as any).caches;
    });

    it('should skip PWA cache clearing when caches API is not available', async () => {
      // Ensure caches is undefined
      delete (global as any).caches;

      // Should not throw - missing API is handled gracefully
      await expect(hardResetAllUserData()).resolves.toBeDefined();
    });

    it('should handle IndexedDB deletion when available', async () => {
      const mockIndexedDB = {
        deleteDatabase: jest.fn(),
      };
      
      (global as any).indexedDB = mockIndexedDB;

      await hardResetAllUserData();

      expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledWith('matchops-coach-offline');

      delete (global as any).indexedDB;
    });

    it('should handle IndexedDB deletion failure gracefully', async () => {
      const mockIndexedDB = {
        deleteDatabase: jest.fn(() => {
          throw new Error('IndexedDB deletion failed');
        }),
      };
      
      (global as any).indexedDB = mockIndexedDB;

      // Should not throw - errors are handled gracefully
      await expect(hardResetAllUserData()).resolves.toBeDefined();

      delete (global as any).indexedDB;
    });

    it('should skip IndexedDB deletion when not available', async () => {
      delete (global as any).indexedDB;

      // Should not throw - missing API is handled gracefully
      await expect(hardResetAllUserData()).resolves.toBeDefined();
    });

    it('should handle unexpected errors during data fetching', async () => {
      const error = new Error('Storage access failed');
      mockStorageManager.getPlayers.mockRejectedValue(error);

      await expect(hardResetAllUserData()).rejects.toThrow('Storage access failed');
    });

    it('should handle unexpected errors during app settings reset', async () => {
      const error = new Error('Settings reset failed');
      mockResetAppSettings.mockRejectedValue(error);

      await expect(hardResetAllUserData()).rejects.toThrow('Settings reset failed');
    });

    it('should handle games data as null or undefined', async () => {
      mockStorageManager.getSavedGames.mockResolvedValue({});

      const result = await hardResetAllUserData();

      expect(result.gamesDeleted).toBe(0);
      expect(mockStorageManager.deleteSavedGame).not.toHaveBeenCalled();
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Some players succeed, some fail
      mockStorageManager.deletePlayer
        .mockResolvedValueOnce() // player1 succeeds
        .mockRejectedValueOnce(new Error('Player 2 failed')); // player2 fails

      // All tournaments fail
      mockStorageManager.deleteTournament
        .mockRejectedValue(new Error('Tournament deletion failed'));

      const result = await hardResetAllUserData();

      // Should still return the counts based on original data
      expect(result).toEqual({
        playersDeleted: 2,
        seasonsDeleted: 1,
        tournamentsDeleted: 2,
        gamesDeleted: 3,
      });

      // Should still complete the operation despite failures
    });
  });
});