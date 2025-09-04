import { QueryClient } from '@tanstack/react-query';
import { CacheManager, useCacheManager } from '../cacheUtils';
import { queryKeys } from '@/config/queryKeys';
import logger from '@/utils/logger';

// Mock logger
const mockLogger = {
  warn: jest.fn(),
};
jest.mock('@/utils/logger', () => mockLogger);

// Mock query keys
jest.mock('@/config/queryKeys', () => ({
  queryKeys: {
    masterRoster: ['master-roster'],
    seasons: ['seasons'],
    tournaments: ['tournaments'],
    savedGames: ['saved-games'],
    appSettingsCurrentGameId: ['app-settings', 'current-game-id'],
  },
}));

describe('cacheUtils', () => {
  let queryClient: QueryClient;
  let cacheManager: CacheManager;
  let mockInvalidateQueries: jest.Mock;
  let mockSetQueryData: jest.Mock;
  let mockPrefetchQuery: jest.Mock;
  let mockGetQueryData: jest.Mock;
  let mockRefetchQueries: jest.Mock;
  let mockGetQueryCache: jest.Mock;

  beforeEach(() => {
    mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
    mockSetQueryData = jest.fn();
    mockPrefetchQuery = jest.fn().mockResolvedValue(undefined);
    mockGetQueryData = jest.fn().mockReturnValue(null);
    mockRefetchQueries = jest.fn().mockResolvedValue(undefined);
    mockGetQueryCache = jest.fn();

    queryClient = {
      invalidateQueries: mockInvalidateQueries,
      setQueryData: mockSetQueryData,
      prefetchQuery: mockPrefetchQuery,
      getQueryData: mockGetQueryData,
      refetchQueries: mockRefetchQueries,
      getQueryCache: mockGetQueryCache,
    } as unknown as QueryClient;

    cacheManager = new CacheManager(queryClient);
    jest.clearAllMocks();
  });

  describe('CacheManager', () => {
    describe('invalidateSelectively', () => {
      it('should invalidate master roster when specified', async () => {
        await cacheManager.invalidateSelectively({ masterRoster: true });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.masterRoster,
        });
      });

      it('should invalidate seasons when specified', async () => {
        await cacheManager.invalidateSelectively({ seasons: true });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.seasons,
        });
      });

      it('should invalidate tournaments when specified', async () => {
        await cacheManager.invalidateSelectively({ tournaments: true });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.tournaments,
        });
      });

      it('should invalidate saved games when specified as true', async () => {
        await cacheManager.invalidateSelectively({ savedGames: true });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.savedGames,
        });
      });

      it('should invalidate saved games list only when specified as list-only', async () => {
        await cacheManager.invalidateSelectively({ savedGames: 'list-only' });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.savedGames,
        });
      });

      it('should invalidate current game ID when specified', async () => {
        await cacheManager.invalidateSelectively({ currentGameId: true });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.appSettingsCurrentGameId,
        });
      });

      it('should invalidate multiple caches when specified', async () => {
        await cacheManager.invalidateSelectively({
          masterRoster: true,
          seasons: true,
          tournaments: true,
        });

        expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.masterRoster,
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.seasons,
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.tournaments,
        });
      });

      it('should not invalidate when no updates specified', async () => {
        await cacheManager.invalidateSelectively({});

        expect(mockInvalidateQueries).not.toHaveBeenCalled();
      });

      it('should handle invalidation errors gracefully', async () => {
        mockInvalidateQueries.mockRejectedValueOnce(new Error('Network error'));

        await expect(
          cacheManager.invalidateSelectively({ masterRoster: true })
        ).rejects.toThrow('Network error');
      });
    });

    describe('updateCacheData', () => {
      it('should update cache data with provided updater function', () => {
        const queryKey = ['test-key'];
        const updater = jest.fn().mockReturnValue('new-data');

        cacheManager.updateCacheData(queryKey, updater);

        expect(mockSetQueryData).toHaveBeenCalledWith(queryKey, updater);
      });

      it('should pass through any data type', () => {
        const queryKey = ['complex-key'];
        const updater = (old: any) => ({ ...old, updated: true });

        cacheManager.updateCacheData(queryKey, updater);

        expect(mockSetQueryData).toHaveBeenCalledWith(queryKey, updater);
      });
    });

    describe('updateMasterRosterCache', () => {
      it('should update master roster cache with provided updater', () => {
        const updater = jest.fn().mockReturnValue([]);
        const oldData = [{ id: '1', name: 'Player 1' }];

        // Mock setQueryData to call the callback
        mockSetQueryData.mockImplementation((key, callback) => {
          callback(oldData);
        });

        cacheManager.updateMasterRosterCache(updater);

        expect(mockSetQueryData).toHaveBeenCalledWith(
          queryKeys.masterRoster,
          expect.any(Function)
        );
        expect(updater).toHaveBeenCalledWith(oldData);
      });

      it('should handle undefined old data', () => {
        const updater = jest.fn();

        mockSetQueryData.mockImplementation((key, callback) => {
          const result = callback(undefined);
          expect(result).toBeUndefined();
        });

        cacheManager.updateMasterRosterCache(updater);

        expect(mockSetQueryData).toHaveBeenCalledWith(
          queryKeys.masterRoster,
          expect.any(Function)
        );
        expect(updater).not.toHaveBeenCalled();
      });
    });

    describe('updateSavedGamesCache', () => {
      it('should update saved games cache with provided updater', () => {
        const updater = jest.fn().mockReturnValue({});
        const oldData = { game1: { id: 'game1' } };

        mockSetQueryData.mockImplementation((key, callback) => {
          callback(oldData);
        });

        cacheManager.updateSavedGamesCache(updater);

        expect(mockSetQueryData).toHaveBeenCalledWith(
          queryKeys.savedGames,
          expect.any(Function)
        );
        expect(updater).toHaveBeenCalledWith(oldData);
      });

      it('should handle null/undefined old data', () => {
        const updater = jest.fn().mockReturnValue(null);

        mockSetQueryData.mockImplementation((key, callback) => {
          callback(undefined);
        });

        cacheManager.updateSavedGamesCache(updater);

        expect(updater).toHaveBeenCalledWith(null);
      });
    });

    describe('prefetchRelatedData', () => {
      it('should prefetch seasons and tournaments for game-creation', async () => {
        await cacheManager.prefetchRelatedData('game-creation');

        expect(mockPrefetchQuery).toHaveBeenCalledTimes(2);
        expect(mockPrefetchQuery).toHaveBeenCalledWith({
          queryKey: queryKeys.seasons,
          staleTime: 5 * 60 * 1000,
        });
        expect(mockPrefetchQuery).toHaveBeenCalledWith({
          queryKey: queryKeys.tournaments,
          staleTime: 5 * 60 * 1000,
        });
      });

      it('should prefetch saved games for game-loading', async () => {
        await cacheManager.prefetchRelatedData('game-loading');

        expect(mockPrefetchQuery).toHaveBeenCalledTimes(1);
        expect(mockPrefetchQuery).toHaveBeenCalledWith({
          queryKey: queryKeys.savedGames,
          staleTime: 30 * 1000,
        });
      });

      it('should prefetch master roster for roster-management', async () => {
        await cacheManager.prefetchRelatedData('roster-management');

        expect(mockPrefetchQuery).toHaveBeenCalledTimes(1);
        expect(mockPrefetchQuery).toHaveBeenCalledWith({
          queryKey: queryKeys.masterRoster,
          staleTime: 2 * 60 * 1000,
        });
      });

      it('should handle prefetch failures', async () => {
        mockPrefetchQuery.mockRejectedValueOnce(new Error('Prefetch failed'));

        await expect(
          cacheManager.prefetchRelatedData('game-creation')
        ).rejects.toThrow('Prefetch failed');
      });

      it('should handle unknown action types', async () => {
        await cacheManager.prefetchRelatedData('unknown' as any);

        expect(mockPrefetchQuery).not.toHaveBeenCalled();
      });
    });

    describe('refreshStaleData', () => {
      it('should refresh master roster when data exists', async () => {
        mockGetQueryData.mockReturnValueOnce(['existing-data']); // master roster
        mockGetQueryData.mockReturnValueOnce(null); // saved games

        await cacheManager.refreshStaleData();

        expect(mockRefetchQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.masterRoster,
          type: 'active',
        });
      });

      it('should refresh saved games when data exists', async () => {
        mockGetQueryData.mockReturnValueOnce(null); // master roster
        mockGetQueryData.mockReturnValueOnce({ game1: {} }); // saved games

        await cacheManager.refreshStaleData();

        expect(mockRefetchQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.savedGames,
          type: 'active',
        });
      });

      it('should refresh both when both have data', async () => {
        mockGetQueryData.mockReturnValueOnce(['existing-data']); // master roster
        mockGetQueryData.mockReturnValueOnce({ game1: {} }); // saved games

        await cacheManager.refreshStaleData();

        expect(mockRefetchQueries).toHaveBeenCalledTimes(2);
      });

      it('should not refresh when no data exists', async () => {
        mockGetQueryData.mockReturnValue(null);

        await cacheManager.refreshStaleData();

        expect(mockRefetchQueries).not.toHaveBeenCalled();
      });

      it('should handle refresh failures gracefully', async () => {
        mockGetQueryData.mockReturnValueOnce(['existing-data']);
        mockRefetchQueries.mockRejectedValueOnce(new Error('Refresh failed'));

        // Should not throw - failures are handled in background
        await expect(cacheManager.refreshStaleData()).resolves.toBeUndefined();
      });
    });

    describe('getCacheStats', () => {
      it('should return cache statistics', () => {
        const mockQueries = [
          { isStale: () => true, state: { status: 'success' } },
          { isStale: () => false, state: { status: 'pending' } },
          { isStale: () => false, state: { status: 'error' } },
          { isStale: () => true, state: { status: 'success' } },
        ];

        const mockCache = {
          getAll: () => mockQueries,
        };

        mockGetQueryCache.mockReturnValue(mockCache);

        const stats = cacheManager.getCacheStats();

        expect(stats).toEqual({
          totalQueries: 4,
          staleQueries: 2,
          loadingQueries: 1,
          errorQueries: 1,
          successQueries: 2,
        });
      });

      it('should handle empty cache', () => {
        const mockCache = {
          getAll: () => [],
        };

        mockGetQueryCache.mockReturnValue(mockCache);

        const stats = cacheManager.getCacheStats();

        expect(stats).toEqual({
          totalQueries: 0,
          staleQueries: 0,
          loadingQueries: 0,
          errorQueries: 0,
          successQueries: 0,
        });
      });

      it('should handle queries with different statuses', () => {
        const mockQueries = [
          { isStale: () => false, state: { status: 'idle' } },
          { isStale: () => false, state: { status: 'pending' } },
          { isStale: () => false, state: { status: 'error' } },
          { isStale: () => false, state: { status: 'success' } },
        ];

        const mockCache = {
          getAll: () => mockQueries,
        };

        mockGetQueryCache.mockReturnValue(mockCache);

        const stats = cacheManager.getCacheStats();

        expect(stats).toEqual({
          totalQueries: 4,
          staleQueries: 0,
          loadingQueries: 1,
          errorQueries: 1,
          successQueries: 1,
        });
      });
    });
  });

  describe('useCacheManager', () => {
    it('should return a CacheManager instance', () => {
      const manager = useCacheManager(queryClient);

      expect(manager).toBeInstanceOf(CacheManager);
    });

    it('should use the provided query client', () => {
      const manager = useCacheManager(queryClient);

      // Test that it uses the query client by calling a method
      manager.updateCacheData(['test'], (old) => old);

      expect(mockSetQueryData).toHaveBeenCalled();
    });

    it('should create new instance each time', () => {
      const manager1 = useCacheManager(queryClient);
      const manager2 = useCacheManager(queryClient);

      expect(manager1).not.toBe(manager2);
      expect(manager1).toBeInstanceOf(CacheManager);
      expect(manager2).toBeInstanceOf(CacheManager);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex cache invalidation scenario', async () => {
      // Simulate a game save operation that affects multiple caches
      await cacheManager.invalidateSelectively({
        savedGames: 'list-only',
        currentGameId: true,
        masterRoster: false, // explicitly false
      });

      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.savedGames,
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.appSettingsCurrentGameId,
      });
    });

    it('should handle optimistic update followed by background refresh', async () => {
      // Simulate optimistic update
      const updater = (players: any[]) => [...players, { id: 'new', name: 'New Player' }];
      cacheManager.updateMasterRosterCache(updater);

      // Simulate background refresh
      mockGetQueryData.mockReturnValueOnce(['existing-data']);
      await cacheManager.refreshStaleData();

      expect(mockSetQueryData).toHaveBeenCalled();
      expect(mockRefetchQueries).toHaveBeenCalled();
    });

    it('should handle prefetch before invalidation', async () => {
      // Prefetch data
      await cacheManager.prefetchRelatedData('game-creation');
      
      // Then invalidate
      await cacheManager.invalidateSelectively({
        seasons: true,
        tournaments: true,
      });

      expect(mockPrefetchQuery).toHaveBeenCalledTimes(2);
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle query client errors gracefully', async () => {
      mockInvalidateQueries.mockRejectedValue(new Error('Query client error'));

      await expect(
        cacheManager.invalidateSelectively({ masterRoster: true })
      ).rejects.toThrow('Query client error');
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        cacheManager.invalidateSelectively({ masterRoster: true }),
        cacheManager.prefetchRelatedData('game-creation'),
        cacheManager.refreshStaleData(),
      ];

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should handle malformed cache data', () => {
      mockGetQueryCache.mockReturnValue({
        getAll: () => [
          { isStale: () => { throw new Error('Stale check failed'); }, state: { status: 'success' } },
          { isStale: () => false, state: null },
          null,
        ],
      });

      expect(() => cacheManager.getCacheStats()).toThrow();
    });
  });
});