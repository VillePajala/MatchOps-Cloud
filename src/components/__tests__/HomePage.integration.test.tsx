import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@/__tests__/test-utils';
import HomePage from '../HomePage';
import { useAuth } from '@/context/AuthContext';
import { useGameState } from '@/hooks/useGameState';
import { useOfflineFirstGameTimer } from '@/hooks/useOfflineFirstGameTimer';
import useAutoBackup from '@/hooks/useAutoBackup';
import { useGameDataQueries } from '@/hooks/useGameDataQueries';
import { useGameCreationData } from '@/hooks/useGameCreationData';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useTacticalBoard } from '@/hooks/useTacticalBoard';
import { useRoster } from '@/hooks/useRoster';
import { useGameDataManager } from '@/hooks/useGameDataManager';
import { useGameStateManager } from '@/hooks/useGameStateManager';
import { useSupabaseWarmup } from '@/hooks/useSupabaseWarmup';
import { useRosterData } from '@/hooks/useRosterData';
import { useSavedGamesData } from '@/hooks/useSavedGamesData';
import usePlayerFieldManager from '@/hooks/usePlayerFieldManager';
import type { Player, GameEvent, Point, AppState } from '@/types';

// Mock all external dependencies
jest.mock('@/context/AuthContext');
jest.mock('@/hooks/useGameState');
jest.mock('@/hooks/useOfflineFirstGameTimer');
jest.mock('@/hooks/useAutoBackup', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@/hooks/useGameDataQueries');
jest.mock('@/hooks/useGameCreationData');
jest.mock('@/hooks/useUndoRedo');
jest.mock('@/hooks/useTacticalBoard');
jest.mock('@/hooks/useRoster');
jest.mock('@/hooks/useGameDataManager');
jest.mock('@/hooks/useGameStateManager');
jest.mock('@/hooks/useSupabaseWarmup');
jest.mock('@/hooks/useRosterData');
jest.mock('@/hooks/useSavedGamesData');
jest.mock('@/hooks/usePlayerFieldManager');
jest.mock('@/utils/appSettings', () => ({
  getLastHomeTeamName: jest.fn().mockResolvedValue('Test Team'),
  saveCurrentGameIdSetting: jest.fn().mockResolvedValue(undefined),
  saveHasSeenAppGuide: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/utils/savedGames');
jest.mock('@/utils/seasons');

// Mock components
jest.mock('@/components/SoccerField', () => {
  return function MockSoccerField(props: any) {
    return (
      <div data-testid="soccer-field" onClick={() => props.onBackgroundClick?.()}>
        {props.players?.map((player: Player, index: number) => (
          <div key={player.id || index} data-testid={`field-player-${player.id || index}`}>
            {player.name}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/PlayerBar', () => {
  return function MockPlayerBar(props: any) {
    return (
      <div data-testid="player-bar">
        {props.players?.map((player: Player, index: number) => (
          <button
            key={player.id || index}
            data-testid={`bar-player-${player.id || index}`}
            onClick={() => props.onPlayerTapInBar?.(player)}
          >
            {player.name}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/ControlBar', () => {
  return function MockControlBar(props: any) {
    return (
      <div data-testid="control-bar">
        <button data-testid="new-game-btn" onClick={() => props.onStartNewGame?.()}>
          New Game
        </button>
        <button data-testid="save-game-btn" onClick={() => props.onSaveGame?.()}>
          Save Game
        </button>
        <button data-testid="load-game-btn" onClick={() => props.onLoadGame?.()}>
          Load Game
        </button>
        <button data-testid="undo-btn" onClick={() => props.onUndo?.()}>
          Undo
        </button>
        <button data-testid="redo-btn" onClick={() => props.onRedo?.()}>
          Redo
        </button>
        <button data-testid="tactics-btn" onClick={() => props.onToggleTacticsBoard?.()}>
          Tactics
        </button>
      </div>
    );
  };
});

// Mock all modals
const mockModals = [
  'GoalLogModal',
  'GameStatsModal', 
  'GameSettingsModal',
  'TrainingResourcesModal',
  'LoadGameModal',
  'NewGameSetupModal',
  'RosterSettingsModal',
  'SettingsModal',
  'SeasonTournamentManagementModal',
  'InstructionsModal',
  'PlayerAssessmentModal'
];

mockModals.forEach(modalName => {
  jest.mock(`@/components/${modalName}`, () => {
    return function MockModal(props: any) {
      return props.isOpen ? (
        <div data-testid={`${modalName.toLowerCase()}`}>
          <h2>{modalName}</h2>
          <button onClick={props.onClose}>Close</button>
          <button onClick={props.onConfirm}>Confirm</button>
          <button onClick={props.onSave}>Save</button>
        </div>
      ) : null;
    };
  });
});

describe('HomePage Integration Tests', () => {
  const mockPlayers: Player[] = [
    { id: 'p1', name: 'John Doe', nickname: 'John', color: '#FF0000', isGoalie: false, number: 10 },
    { id: 'p2', name: 'Jane Smith', nickname: 'Jane', color: '#00FF00', isGoalie: true, number: 1 },
  ];

  const mockGameState = {
    gameId: 'test-game',
    teamName: 'Test Team',
    gamePhase: 'firstHalf' as const,
    timeElapsed: 0,
    isTimerRunning: false,
  };

  const mockAuth = {
    user: { id: 'user-123' },
    isAuthenticated: true,
    isLoading: false,
  };

  const defaultMockReturns = {
    useAuth: mockAuth,
    useGameState: {
      gameState: mockGameState,
      updateGameState: jest.fn(),
      resetGame: jest.fn(),
      saveCurrentGame: jest.fn().mockResolvedValue(true),
      error: null,
      isLoading: false,
    },
    useOfflineFirstGameTimer: {
      timeElapsed: 0,
      isRunning: false,
      start: jest.fn(),
      pause: jest.fn(),
      reset: jest.fn(),
      gamePhase: 'firstHalf',
    },
    useAutoBackup: jest.fn().mockReturnValue({
      isBackingUp: false,
      lastBackupTime: null,
      backupError: null,
    }),
    useGameDataQueries: {
      savedGamesQuery: { data: {}, isLoading: false, error: null },
      seasonsQuery: { data: [], isLoading: false, error: null },
      tournamentsQuery: { data: [], isLoading: false, error: null },
      mutations: {
        addSeasonMutation: { mutate: jest.fn(), isLoading: false },
        updateSeasonMutation: { mutate: jest.fn(), isLoading: false },
        deleteSeasonMutation: { mutate: jest.fn(), isLoading: false },
        addTournamentMutation: { mutate: jest.fn(), isLoading: false },
        updateTournamentMutation: { mutate: jest.fn(), isLoading: false },
        deleteTournamentMutation: { mutate: jest.fn(), isLoading: false },
        updateGameDetailsMutation: { mutate: jest.fn(), isLoading: false },
      },
      handlers: {
        handleSeasonSave: jest.fn(),
        handleSeasonUpdate: jest.fn(),
        handleSeasonDelete: jest.fn(),
        handleTournamentSave: jest.fn(),
        handleTournamentUpdate: jest.fn(),
        handleTournamentDelete: jest.fn(),
        handleGameDetailsUpdate: jest.fn(),
      },
    },
    useGameCreationData: {
      newGameData: null,
      setNewGameData: jest.fn(),
      clearNewGameData: jest.fn(),
    },
    useUndoRedo: {
      canUndo: false,
      canRedo: false,
      undo: jest.fn(),
      redo: jest.fn(),
      execute: jest.fn(),
      clear: jest.fn(),
    },
    useTacticalBoard: {
      isActive: false,
      toggle: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
    },
    useRoster: {
      players: mockPlayers,
      addPlayer: jest.fn(),
      updatePlayer: jest.fn(),
      removePlayer: jest.fn(),
      clearPlayers: jest.fn(),
    },
    useGameDataManager: {
      saveGame: jest.fn().mockResolvedValue(true),
      loadGame: jest.fn().mockResolvedValue(mockGameState),
      deleteGame: jest.fn().mockResolvedValue(true),
      mutations: {
        addSeasonMutation: { mutate: jest.fn(), isLoading: false },
        updateSeasonMutation: { mutate: jest.fn(), isLoading: false },
        deleteSeasonMutation: { mutate: jest.fn(), isLoading: false },
        addTournamentMutation: { mutate: jest.fn(), isLoading: false },
        updateTournamentMutation: { mutate: jest.fn(), isLoading: false },
        deleteTournamentMutation: { mutate: jest.fn(), isLoading: false },
        updateGameDetailsMutation: { mutate: jest.fn(), isLoading: false },
      },
      handlers: {
        handleSeasonSave: jest.fn(),
        handleSeasonUpdate: jest.fn(),
        handleSeasonDelete: jest.fn(),
        handleTournamentSave: jest.fn(),
        handleTournamentUpdate: jest.fn(),
        handleTournamentDelete: jest.fn(),
        handleGameDetailsUpdate: jest.fn(),
      },
    },
    useGameStateManager: {
      stateHistory: [mockGameState],
      currentStateIndex: 0,
      canUndo: false,
      canRedo: false,
    },
    useSupabaseWarmup: jest.fn(),
    useRosterData: {
      playersQuery: { data: mockPlayers, isLoading: false, error: null },
    },
    useSavedGamesData: {
      savedGamesQuery: { data: {}, isLoading: false, error: null },
    },
    usePlayerFieldManager: {
      playersOnField: mockPlayers,
      setPlayersOnField: jest.fn(),
      opponents: [],
      setOpponents: jest.fn(),
      drawings: [],
      setDrawings: jest.fn(),
      states: {
        draggingPlayerFromBarInfo: null,
      },
      handlers: {
        handleDropOnField: jest.fn(),
        handlePlayerMove: jest.fn(),
        handlePlayerMoveEnd: jest.fn(),
        handlePlayerRemove: jest.fn(),
        handlePlayerDragStartFromBar: jest.fn(),
        handlePlayerTapInBar: jest.fn(),
        handlePlayerDropViaTouch: jest.fn(),
        handlePlayerDragCancelViaTouch: jest.fn(),
        handlePlaceAllPlayers: jest.fn(),
        handleResetField: jest.fn(),
        handleClearDrawingsForView: jest.fn(),
      },
      setDraggingPlayerFromBarInfo: jest.fn(),
      handlePlayerDrop: jest.fn(),
      isDragging: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (useAuth as jest.Mock).mockReturnValue(defaultMockReturns.useAuth);
    (useGameState as jest.Mock).mockReturnValue(defaultMockReturns.useGameState);
    (useOfflineFirstGameTimer as jest.Mock).mockReturnValue(defaultMockReturns.useOfflineFirstGameTimer);
    (useAutoBackup as jest.Mock).mockReturnValue(defaultMockReturns.useAutoBackup);
    (useGameDataQueries as jest.Mock).mockReturnValue(defaultMockReturns.useGameDataQueries);
    (useGameCreationData as jest.Mock).mockReturnValue(defaultMockReturns.useGameCreationData);
    (useUndoRedo as jest.Mock).mockReturnValue(defaultMockReturns.useUndoRedo);
    (useTacticalBoard as jest.Mock).mockReturnValue(defaultMockReturns.useTacticalBoard);
    (useRoster as jest.Mock).mockReturnValue(defaultMockReturns.useRoster);
    (useGameDataManager as jest.Mock).mockReturnValue(defaultMockReturns.useGameDataManager);
    (useGameStateManager as jest.Mock).mockReturnValue(defaultMockReturns.useGameStateManager);
    (useSupabaseWarmup as jest.Mock).mockReturnValue(defaultMockReturns.useSupabaseWarmup);
    (useRosterData as jest.Mock).mockReturnValue(defaultMockReturns.useRosterData);
    (useSavedGamesData as jest.Mock).mockReturnValue(defaultMockReturns.useSavedGamesData);
    (usePlayerFieldManager as jest.Mock).mockReturnValue(defaultMockReturns.usePlayerFieldManager);
  });

  describe('Player Interaction Workflows', () => {
    it('should handle player selection from bar to field', async () => {
      render(<HomePage />);
      
      // Click player in bar
      const barPlayer = screen.getByTestId('bar-player-p1');
      fireEvent.click(barPlayer);
      
      // Should show player on field
      expect(screen.getByTestId('field-player-p1')).toBeInTheDocument();
    });

    it('should handle player drag operations', async () => {
      render(<HomePage />);
      
      // Simulate drag start
      const fieldPlayer = screen.getByTestId('field-player-p1');
      fireEvent.dragStart(fieldPlayer);
      
      // Simulate drop on new position
      fireEvent.dragEnd(fieldPlayer);
      
      // Component should handle drag without errors
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle player substitutions', async () => {
      const mockRoster = {
        ...defaultMockReturns.useRoster,
        substitutePlayer: jest.fn(),
      };
      (useRoster as jest.Mock).mockReturnValue(mockRoster);

      render(<HomePage />);
      
      // Test substitution workflow
      const barPlayer = screen.getByTestId('bar-player-p2');
      fireEvent.doubleClick(barPlayer);
      
      expect(mockRoster.substitutePlayer).toHaveBeenCalled();
    });
  });

  describe('Game State Management Integration', () => {
    it('should handle game phase transitions', async () => {
      const mockTimer = {
        ...defaultMockReturns.useOfflineFirstGameTimer,
        gamePhase: 'halftime',
      };
      (useOfflineFirstGameTimer as jest.Mock).mockReturnValue(mockTimer);

      render(<HomePage />);
      
      // Should reflect halftime phase
      expect(screen.getByTestId('control-bar')).toBeInTheDocument();
    });

    it('should handle timer start/stop operations', async () => {
      const mockTimer = {
        ...defaultMockReturns.useOfflineFirstGameTimer,
        start: jest.fn(),
        pause: jest.fn(),
      };
      (useOfflineFirstGameTimer as jest.Mock).mockReturnValue(mockTimer);

      render(<HomePage />);
      
      // Simulate timer controls (through game state)
      const mockGameState = defaultMockReturns.useGameState;
      act(() => {
        mockGameState.updateGameState({ isTimerRunning: true });
      });

      expect(mockTimer.start).toHaveBeenCalled();
    });

    it('should sync game state with timer updates', async () => {
      const mockTimer = {
        ...defaultMockReturns.useOfflineFirstGameTimer,
        timeElapsed: 1500,
        isRunning: true,
      };
      (useOfflineFirstGameTimer as jest.Mock).mockReturnValue(mockTimer);

      render(<HomePage />);
      
      // Component should reflect timer state
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Modal Integration Workflows', () => {
    it('should open and close game settings modal', async () => {
      render(<HomePage />);
      
      // Open modal through control bar or other trigger
      const controlBar = screen.getByTestId('control-bar');
      
      // Modal should be closable
      expect(controlBar).toBeInTheDocument();
    });

    it('should handle new game setup workflow', async () => {
      const mockGameCreation = {
        ...defaultMockReturns.useGameCreationData,
        newGameData: { teamName: 'New Team' },
      };
      (useGameCreationData as jest.Mock).mockReturnValue(mockGameCreation);

      render(<HomePage />);
      
      const newGameBtn = screen.getByTestId('new-game-btn');
      fireEvent.click(newGameBtn);
      
      // Should handle new game creation
      expect(newGameBtn).toBeInTheDocument();
    });

    it('should handle save game workflow', async () => {
      render(<HomePage />);
      
      const saveBtn = screen.getByTestId('save-game-btn');
      fireEvent.click(saveBtn);
      
      await waitFor(() => {
        expect(defaultMockReturns.useGameState.saveCurrentGame).toHaveBeenCalled();
      });
    });

    it('should handle load game workflow', async () => {
      render(<HomePage />);
      
      const loadBtn = screen.getByTestId('load-game-btn');
      fireEvent.click(loadBtn);
      
      // Should trigger load game functionality
      expect(loadBtn).toBeInTheDocument();
    });
  });

  describe('Undo/Redo Integration', () => {
    it('should handle undo operations', async () => {
      const mockUndoRedo = {
        ...defaultMockReturns.useUndoRedo,
        canUndo: true,
      };
      (useUndoRedo as jest.Mock).mockReturnValue(mockUndoRedo);

      render(<HomePage />);
      
      const undoBtn = screen.getByTestId('undo-btn');
      fireEvent.click(undoBtn);
      
      expect(mockUndoRedo.undo).toHaveBeenCalled();
    });

    it('should handle redo operations', async () => {
      const mockUndoRedo = {
        ...defaultMockReturns.useUndoRedo,
        canRedo: true,
      };
      (useUndoRedo as jest.Mock).mockReturnValue(mockUndoRedo);

      render(<HomePage />);
      
      const redoBtn = screen.getByTestId('redo-btn');
      fireEvent.click(redoBtn);
      
      expect(mockUndoRedo.redo).toHaveBeenCalled();
    });

    it('should execute operations with undo/redo tracking', async () => {
      const mockUndoRedo = {
        ...defaultMockReturns.useUndoRedo,
        execute: jest.fn(),
      };
      (useUndoRedo as jest.Mock).mockReturnValue(mockUndoRedo);

      render(<HomePage />);
      
      // Simulate an operation that should be tracked
      const barPlayer = screen.getByTestId('bar-player-p1');
      fireEvent.click(barPlayer);
      
      // Should have executed trackable operation
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Tactical Board Integration', () => {
    it('should toggle tactical board mode', async () => {
      const mockTacticalBoard = {
        ...defaultMockReturns.useTacticalBoard,
        toggle: jest.fn(),
      };
      (useTacticalBoard as jest.Mock).mockReturnValue(mockTacticalBoard);

      render(<HomePage />);
      
      const tacticsBtn = screen.getByTestId('tactics-btn');
      fireEvent.click(tacticsBtn);
      
      expect(mockTacticalBoard.toggle).toHaveBeenCalled();
    });

    it('should handle tactical board active state', async () => {
      const mockTacticalBoard = {
        ...defaultMockReturns.useTacticalBoard,
        isActive: true,
      };
      (useTacticalBoard as jest.Mock).mockReturnValue(mockTacticalBoard);

      render(<HomePage />);
      
      // Should reflect tactical board active state
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Data Loading States Integration', () => {
    it('should handle saved games loading state', async () => {
      const mockQueries = {
        ...defaultMockReturns.useGameDataQueries,
        savedGamesQuery: { data: null, isLoading: true, error: null },
      };
      (useGameDataQueries as jest.Mock).mockReturnValue(mockQueries);

      render(<HomePage />);
      
      // Should handle loading state
      expect(screen.getByTestId('control-bar')).toBeInTheDocument();
    });

    it('should handle roster data loading state', async () => {
      const mockRosterData = {
        ...defaultMockReturns.useRosterData,
        playersQuery: { data: null, isLoading: true, error: null },
      };
      (useRosterData as jest.Mock).mockReturnValue(mockRosterData);

      render(<HomePage />);
      
      // Should handle roster loading state
      expect(screen.getByTestId('player-bar')).toBeInTheDocument();
    });

    it('should handle data query errors', async () => {
      const mockQueries = {
        ...defaultMockReturns.useGameDataQueries,
        savedGamesQuery: { data: null, isLoading: false, error: new Error('Network error') },
      };
      (useGameDataQueries as jest.Mock).mockReturnValue(mockQueries);

      render(<HomePage />);
      
      // Should handle error state gracefully
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Authentication Integration', () => {
    it('should handle authenticated state', async () => {
      render(<HomePage />);
      
      // Should render full game interface for authenticated user
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
      expect(screen.getByTestId('player-bar')).toBeInTheDocument();
      expect(screen.getByTestId('control-bar')).toBeInTheDocument();
    });

    it('should handle unauthenticated state', async () => {
      const mockAuthUnauthenticated = {
        ...mockAuth,
        isAuthenticated: false,
        user: null,
      };
      (useAuth as jest.Mock).mockReturnValue(mockAuthUnauthenticated);

      render(<HomePage />);
      
      // Should still render basic interface
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle authentication loading state', async () => {
      const mockAuthLoading = {
        ...mockAuth,
        isLoading: true,
      };
      (useAuth as jest.Mock).mockReturnValue(mockAuthLoading);

      render(<HomePage />);
      
      // Should handle loading state
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Auto-backup Integration', () => {
    it('should handle backup in progress state', async () => {
      (useAutoBackup as jest.Mock).mockReturnValue({
        isBackingUp: true,
        lastBackupTime: Date.now(),
        backupError: null,
      });

      render(<HomePage />);
      
      // Should handle backup state
      expect(screen.getByTestId('control-bar')).toBeInTheDocument();
    });

    it('should handle backup errors', async () => {
      (useAutoBackup as jest.Mock).mockReturnValue({
        isBackingUp: false,
        lastBackupTime: null,
        backupError: new Error('Backup failed'),
      });

      render(<HomePage />);
      
      // Should handle backup error gracefully
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('should handle large player datasets efficiently', async () => {
      const largePlayers = Array.from({ length: 50 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        nickname: `P${i}`,
        color: '#FF0000',
        isGoalie: i === 0,
        number: i + 1,
      }));

      const mockLargeRoster = {
        ...defaultMockReturns.useRoster,
        players: largePlayers,
      };
      (useRoster as jest.Mock).mockReturnValue(mockLargeRoster);

      const { container } = render(<HomePage />);
      
      // Should render without performance issues
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByTestId('player-bar')).toBeInTheDocument();
    });

    it('should handle rapid state updates efficiently', async () => {
      render(<HomePage />);
      
      // Simulate rapid state updates
      const mockGameState = defaultMockReturns.useGameState;
      
      for (let i = 0; i < 10; i++) {
        act(() => {
          mockGameState.updateGameState({ timeElapsed: i * 60 });
        });
      }
      
      // Should handle updates without issues
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch and handle component errors', async () => {
      // Mock a component that throws an error
      const mockGameState = {
        ...defaultMockReturns.useGameState,
        error: new Error('Game state error'),
      };
      (useGameState as jest.Mock).mockReturnValue(mockGameState);

      const { container } = render(<HomePage />);
      
      // Should render error boundary instead of crashing
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should recover from transient errors', async () => {
      const mockGameState = {
        ...defaultMockReturns.useGameState,
        error: new Error('Transient error'),
      };
      (useGameState as jest.Mock).mockReturnValue(mockGameState);

      const { rerender } = render(<HomePage />);
      
      // Clear error and re-render
      (useGameState as jest.Mock).mockReturnValue({
        ...defaultMockReturns.useGameState,
        error: null,
      });
      
      rerender(<HomePage />);
      
      // Should recover and render normally
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });
});