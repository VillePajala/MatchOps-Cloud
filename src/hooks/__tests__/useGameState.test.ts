import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';
import type { Player, Opponent, AppState } from '@/types';
import * as masterRosterManager from '@/utils/masterRosterManager';

// Mock dependencies
jest.mock('@/utils/masterRosterManager', () => ({
  updatePlayer: jest.fn(),
  getMasterRoster: jest.fn(),
  setGoalieStatus: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('useGameState', () => {
  const mockPlayer: Player = {
    id: 'p1',
    name: 'John Doe',
    nickname: 'John',
    color: '#FF0000',
    isGoalie: false,
    number: 10,
  };

  const mockOpponent: Opponent = {
    id: 'o1',
    name: 'Opponent 1',
    position: { x: 100, y: 200 },
    color: '#0000FF',
  };

  const mockInitialState: AppState = {
    gameId: 'test-game',
    teamName: 'Test Team',
    opponentName: 'Test Opponent',
    gamePhase: 'firstHalf',
    timeElapsedInSeconds: 0,
    currentPeriod: 1,
    gameStatus: 'active',
    homeScore: 0,
    awayScore: 0,
    gameEvents: [],
    gameNotes: '',
    selectedPlayerIds: [],
    isPlayed: false,
    playersOnField: [mockPlayer],
    opponents: [mockOpponent],
    drawings: [[{ x: 0, y: 0 }]],
    availablePlayers: [mockPlayer],
    tacticalDiscs: [],
    tacticalDrawings: [],
    tacticalBallPosition: { relX: 0.5, relY: 0.5 },
    completedIntervalDurations: [],
    lastSubConfirmationTimeSeconds: null,
    showPlayerNames: true,
  };

  const mockSaveStateToHistory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (masterRosterManager.getMasterRoster as jest.Mock).mockReturnValue([mockPlayer]);
  });

  it('should initialize with provided initial state', () => {
    const { result } = renderHook(() =>
      useGameState({
        initialState: mockInitialState,
        saveStateToHistory: mockSaveStateToHistory,
      })
    );

    expect(result.current.playersOnField).toEqual([mockPlayer]);
    expect(result.current.opponents).toEqual([mockOpponent]);
    expect(result.current.drawings).toEqual([[{ x: 0, y: 0 }]]);
    // Note: availablePlayers starts as empty array, populated by master roster
    expect(result.current.availablePlayers).toEqual([]);
  });

  it('should update players on field', () => {
    const { result } = renderHook(() =>
      useGameState({
        initialState: mockInitialState,
        saveStateToHistory: mockSaveStateToHistory,
      })
    );

    const newPlayer: Player = {
      ...mockPlayer,
      id: 'p2',
      name: 'Jane Doe',
    };

    act(() => {
      result.current.handlePlayerDrop(newPlayer, { relX: 0.5, relY: 0.5 });
    });

    expect(result.current.playersOnField).toContainEqual({...newPlayer, relX: 0.5, relY: 0.5});
    expect(mockSaveStateToHistory).toHaveBeenCalledWith({ playersOnField: expect.arrayContaining([expect.objectContaining({ id: 'p2' })]) });
  });

  it('should update opponents', () => {
    const { result } = renderHook(() =>
      useGameState({
        initialState: mockInitialState,
        saveStateToHistory: mockSaveStateToHistory,
      })
    );

    act(() => {
      result.current.handleAddOpponent();
    });

    expect(result.current.opponents.length).toBeGreaterThan(1);
    expect(mockSaveStateToHistory).toHaveBeenCalledWith({ opponents: expect.any(Array) });
  });

  it('should update drawings', () => {
    const { result } = renderHook(() =>
      useGameState({
        initialState: mockInitialState,
        saveStateToHistory: mockSaveStateToHistory,
      })
    );

    act(() => {
      result.current.handleDrawingStart({ x: 100, y: 100 });
    });

    expect(result.current.drawings.length).toBeGreaterThan(1);
    expect(mockSaveStateToHistory).toHaveBeenCalledWith({ drawings: expect.any(Array) });
  });

  it('should expose available players from internal state', () => {
    const { result } = renderHook(() =>
      useGameState({
        initialState: mockInitialState,
        saveStateToHistory: mockSaveStateToHistory,
      })
    );

    // Available players starts empty and is managed internally
    expect(result.current.availablePlayers).toEqual([]);
    expect(typeof result.current.setAvailablePlayers).toBe('function');
  });

  it('should handle player renames correctly', () => {
    const { result } = renderHook(() =>
      useGameState({
        initialState: mockInitialState,
        saveStateToHistory: mockSaveStateToHistory,
      })
    );

    act(() => {
      result.current.handleRenamePlayer('p1', { name: 'Updated Name', nickname: 'Updated' });
    });

    expect(masterRosterManager.updatePlayer).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Updated Name' }));
  });

  it('should handle goalie status changes', () => {
    const { result } = renderHook(() =>
      useGameState({
        initialState: mockInitialState,
        saveStateToHistory: mockSaveStateToHistory,
      })
    );

    act(() => {
      result.current.handleToggleGoalie('p1');
    });

    expect(masterRosterManager.setGoalieStatus).toHaveBeenCalledWith('p1', expect.any(Boolean));
  });

  it('should maintain state consistency across updates', () => {
    const { result } = renderHook(() =>
      useGameState({
        initialState: mockInitialState,
        saveStateToHistory: mockSaveStateToHistory,
      })
    );

    // Perform operations that trigger state updates and history saves
    act(() => {
      result.current.handleClearDrawings();
      result.current.handleAddOpponent();
      result.current.handlePlayerDrop(mockPlayer, { relX: 0.1, relY: 0.1 });
    });

    expect(result.current.drawings).toEqual([]);
    expect(result.current.opponents.length).toBeGreaterThan(1);
    expect(result.current.playersOnField.length).toBeGreaterThan(0);

    // Verify operations triggered history saves
    expect(mockSaveStateToHistory).toHaveBeenCalledTimes(3);
  });

  it('should handle empty initial state gracefully', () => {
    const emptyState: AppState = {
      ...mockInitialState,
      playersOnField: [],
      opponents: [],
      drawings: [],
      availablePlayers: [],
    };

    const { result } = renderHook(() =>
      useGameState({
        initialState: emptyState,
        saveStateToHistory: mockSaveStateToHistory,
      })
    );

    expect(result.current.playersOnField).toEqual([]);
    expect(result.current.opponents).toEqual([]);
    expect(result.current.drawings).toEqual([]);
    expect(result.current.availablePlayers).toEqual([]);
  });
});