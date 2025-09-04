import { renderHook, waitFor } from '@testing-library/react';
import { useAppStateDetection } from '../useAppStateDetection';
import { getMasterRoster } from '@/utils/masterRosterManager';
import { getSavedGames, getMostRecentGameId } from '@/utils/savedGames';
import { getCurrentGameIdSetting } from '@/utils/appSettings';
import { authAwareStorageManager as storageManager } from '@/lib/storage';

// Mock all dependencies
jest.mock('@/utils/masterRosterManager');
jest.mock('@/utils/savedGames');
jest.mock('@/utils/appSettings');
jest.mock('@/lib/storage');
jest.mock('@/utils/logger');

const mockGetMasterRoster = getMasterRoster as jest.MockedFunction<typeof getMasterRoster>;
const mockGetSavedGames = getSavedGames as jest.MockedFunction<typeof getSavedGames>;
const mockGetMostRecentGameId = getMostRecentGameId as jest.MockedFunction<typeof getMostRecentGameId>;
const mockGetCurrentGameIdSetting = getCurrentGameIdSetting as jest.MockedFunction<typeof getCurrentGameIdSetting>;
const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;

describe('useAppStateDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks - empty state
    mockGetMasterRoster.mockResolvedValue([]);
    mockGetSavedGames.mockResolvedValue({});
    mockStorageManager.getSeasons.mockResolvedValue([]);
    mockStorageManager.getTournaments.mockResolvedValue([]);
    mockGetCurrentGameIdSetting.mockResolvedValue(null);
    mockGetMostRecentGameId.mockResolvedValue(null);
  });

  it('should start with loading state', () => {
    const { result } = renderHook(() => useAppStateDetection(null));
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasPlayers).toBe(false);
    expect(result.current.hasSavedGames).toBe(false);
    expect(result.current.hasSeasonsTournaments).toBe(false);
    expect(result.current.isFirstTimeUser).toBe(true);
    expect(result.current.canResume).toBe(false);
  });

  it('should detect first-time user (no players, no saved games)', async () => {
    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPlayers).toBe(false);
    expect(result.current.hasSavedGames).toBe(false);
    expect(result.current.hasSeasonsTournaments).toBe(false);
    expect(result.current.isFirstTimeUser).toBe(true);
    expect(result.current.canResume).toBe(false);
  });

  it('should detect user with players but no saved games', async () => {
    mockGetMasterRoster.mockResolvedValue([
      { id: '1', name: 'Player 1', position: 'Forward' } as any
    ]);

    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPlayers).toBe(true);
    expect(result.current.hasSavedGames).toBe(false);
    expect(result.current.isFirstTimeUser).toBe(true); // Still first-time because no saved games
    expect(result.current.canResume).toBe(false);
  });

  it('should detect user with saved games but no players', async () => {
    mockGetSavedGames.mockResolvedValue({
      'game1': { id: 'game1', name: 'Test Game' } as any
    });

    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPlayers).toBe(false);
    expect(result.current.hasSavedGames).toBe(true);
    expect(result.current.isFirstTimeUser).toBe(true); // Still first-time because no players
    expect(result.current.canResume).toBe(false);
  });

  it('should detect experienced user (both players and saved games)', async () => {
    mockGetMasterRoster.mockResolvedValue([
      { id: '1', name: 'Player 1', position: 'Forward' } as any
    ]);
    mockGetSavedGames.mockResolvedValue({
      'game1': { id: 'game1', name: 'Test Game' } as any
    });

    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPlayers).toBe(true);
    expect(result.current.hasSavedGames).toBe(true);
    expect(result.current.isFirstTimeUser).toBe(false);
    expect(result.current.canResume).toBe(false); // No current/recent game
  });

  it('should detect seasons and tournaments', async () => {
    mockStorageManager.getSeasons.mockResolvedValue([
      { id: '1', name: 'Season 1' } as any
    ]);
    mockStorageManager.getTournaments.mockResolvedValue([
      { id: '1', name: 'Tournament 1' } as any
    ]);

    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasSeasonsTournaments).toBe(true);
  });

  it('should detect resume capability with current game', async () => {
    const currentGameId = 'current-game';
    mockGetCurrentGameIdSetting.mockResolvedValue(currentGameId);
    mockGetSavedGames.mockResolvedValue({
      [currentGameId]: { id: currentGameId, name: 'Current Game' } as any
    });

    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canResume).toBe(true);
  });

  it('should detect resume capability with most recent game', async () => {
    const recentGameId = 'recent-game';
    mockGetMostRecentGameId.mockResolvedValue(recentGameId);
    mockGetSavedGames.mockResolvedValue({
      [recentGameId]: { id: recentGameId, name: 'Recent Game' } as any
    });

    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canResume).toBe(true);
  });

  it('should prioritize current game over recent game for resume', async () => {
    const currentGameId = 'current-game';
    const recentGameId = 'recent-game';
    
    mockGetCurrentGameIdSetting.mockResolvedValue(currentGameId);
    mockGetMostRecentGameId.mockResolvedValue(recentGameId);
    mockGetSavedGames.mockResolvedValue({
      [currentGameId]: { id: currentGameId, name: 'Current Game' } as any,
      [recentGameId]: { id: recentGameId, name: 'Recent Game' } as any
    });

    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canResume).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    mockGetMasterRoster.mockRejectedValue(new Error('Database error'));
    mockGetSavedGames.mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return safe defaults on error
    expect(result.current.hasPlayers).toBe(false);
    expect(result.current.hasSavedGames).toBe(false);
    expect(result.current.hasSeasonsTournaments).toBe(false);
    expect(result.current.isFirstTimeUser).toBe(true);
    expect(result.current.canResume).toBe(false);
  });

  it('should provide refresh functionality', async () => {
    mockGetMasterRoster.mockResolvedValueOnce([]);
    
    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPlayers).toBe(false);

    // Update mock to return players
    mockGetMasterRoster.mockResolvedValueOnce([
      { id: '1', name: 'Player 1', position: 'Forward' } as any
    ]);

    // Call refresh
    result.current.refreshDetection?.();

    await waitFor(() => {
      expect(result.current.hasPlayers).toBe(true);
    });
  });

  it('should re-run detection when user changes', async () => {
    const { result, rerender } = renderHook(
      ({ user }) => useAppStateDetection(user),
      { initialProps: { user: null } }
    );
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear the mock call count
    mockGetMasterRoster.mockClear();

    // Change user
    rerender({ user: { id: 'user1' } });

    await waitFor(() => {
      expect(mockGetMasterRoster).toHaveBeenCalled();
    });
  });

  it('should handle malformed saved games data', async () => {
    mockGetSavedGames.mockResolvedValue(null as any);

    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasSavedGames).toBe(false);
    expect(result.current.canResume).toBe(false);
  });

  it('should handle empty string game IDs', async () => {
    mockGetCurrentGameIdSetting.mockResolvedValue('');
    mockGetMostRecentGameId.mockResolvedValue('');

    const { result } = renderHook(() => useAppStateDetection(null));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canResume).toBe(false);
  });
});