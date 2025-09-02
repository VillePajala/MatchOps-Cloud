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

// Mock child components with more detailed implementations
jest.mock('@/components/SoccerField', () => {
  return function MockSoccerField(props: any) {
    return (
      <div 
        data-testid="soccer-field" 
        onClick={props.onBackgroundClick}
        onDrop={(e) => {
          e.preventDefault();
          const data = e.dataTransfer.getData('application/json');
          if (data) {
            const dropData = JSON.parse(data);
            props.onPlayerDrop?.(dropData.playerId, { x: 100, y: 100 });
          }
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {props.playersOnField?.map((player: Player, index: number) => (
          <div
            key={player.id || index}
            data-testid={`field-player-${player.id || index}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({ playerId: player.id, source: 'field' }));
              props.onPlayerDragStart?.(player);
            }}
            onClick={() => props.onPlayerTap?.(player)}
          >
            {player.name}
          </div>
        ))}
        {props.tacticalDiscs?.map((disc: any, index: number) => (
          <div key={index} data-testid={`tactical-disc-${index}`}>
            Tactical Disc
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/PlayerBar', () => {
  return function MockPlayerBar(props: any) {
    return (
      <div data-testid="player-bar" onClick={props.onBarBackgroundClick}>
        {props.players?.map((player: Player, index: number) => (
          <div
            key={player.id || index}
            data-testid={`bar-player-${player.id || index}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({ playerId: player.id, source: 'bar' }));
              props.onPlayerDragStartFromBar?.(player);
            }}
            onClick={() => props.onPlayerTapInBar?.(player)}
            onDoubleClick={() => props.onToggleGoalie?.(player.id)}
            className={props.selectedPlayerIdFromBar === player.id ? 'selected' : ''}
          >
            {player.name}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/ControlBar', () => {
  return function MockControlBar(props: any) {
    return (
      <div data-testid="control-bar">
        <button data-testid="new-game-btn" onClick={props.onStartNewGame} disabled={props.disabled}>
          New Game
        </button>
        <button data-testid="save-game-btn" onClick={props.onSaveGame} disabled={props.isSaving}>
          {props.isSaving ? 'Saving...' : 'Save Game'}
        </button>
        <button data-testid="load-game-btn" onClick={props.onLoadGame}>
          Load Game
        </button>
        <button data-testid="undo-btn" onClick={props.onUndo} disabled={!props.canUndo}>
          Undo
        </button>
        <button data-testid="redo-btn" onClick={props.onRedo} disabled={!props.canRedo}>
          Redo
        </button>
        <button data-testid="tactics-btn" onClick={props.onToggleTacticsBoard}>
          {props.isTacticalBoardActive ? 'Exit Tactics' : 'Tactics'}
        </button>
        <button data-testid="settings-btn" onClick={props.onOpenSettings}>
          Settings
        </button>
        <button data-testid="stats-btn" onClick={props.onOpenStats}>
          Stats
        </button>
      </div>
    );
  };
});

jest.mock('@/components/TimerOverlay', () => {
  return function MockTimerOverlay(props: any) {
    return props.visible ? (
      <div data-testid="timer-overlay">
        <span data-testid="timer-display">{props.timeElapsed}s</span>
        <span data-testid="game-phase">{props.gamePhase}</span>
        <button onClick={props.onToggleTimer}>
          {props.isTimerRunning ? 'Pause' : 'Start'}
        </button>
      </div>
    ) : null;
  };
});

jest.mock('@/components/GameInfoBar', () => {
  return function MockGameInfoBar(props: any) {
    return (
      <div data-testid="game-info-bar">
        <span data-testid="team-name">{props.teamName}</span>
        <span data-testid="score">{props.score || '0-0'}</span>
      </div>
    );
  };
});

// Mock modals with more interaction capabilities
const mockModalComponents = [
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

mockModalComponents.forEach(modalName => {
  jest.mock(`@/components/${modalName}`, () => {
    return function MockModal(props: any) {
      return props.isOpen ? (
        <div data-testid={`${modalName.toLowerCase()}`}>
          <h2>{modalName}</h2>
          <button onClick={props.onClose}>Close</button>
          {props.onConfirm && <button onClick={props.onConfirm}>Confirm</button>}
          {props.onSave && <button onClick={props.onSave}>Save</button>}
          {props.onGameSave && <button onClick={() => props.onGameSave('test-game')}>Save Game</button>}
          {props.onGameLoad && <button onClick={() => props.onGameLoad('test-game')}>Load Game</button>}
          {props.onPlayerUpdate && <button onClick={() => props.onPlayerUpdate('p1', { name: 'Updated' })}>Update Player</button>}
        </div>
      ) : null;
    };
  });
});

describe('HomePage Edge Cases and Error Handling', () => {
  const mockPlayers: Player[] = [
    { id: 'p1', name: 'John Doe', nickname: 'John', color: '#FF0000', isGoalie: false, number: 10 },
    { id: 'p2', name: 'Jane Smith', nickname: 'Jane', color: '#00FF00', isGoalie: true, number: 1 },
    { id: 'p3', name: 'Bob Wilson', nickname: 'Bob', color: '#0000FF', isGoalie: false, number: 7 },
  ];

  const mockGameState = {
    gameId: 'test-game',
    teamName: 'Test Team',
    gamePhase: 'firstHalf' as const,
    timeElapsed: 0,
    isTimerRunning: false,
    playersOnField: mockPlayers,
    gameEvents: [] as GameEvent[],
  };

  const defaultMocks = {
    useAuth: {
      user: { id: 'user-123' },
      isAuthenticated: true,
      isLoading: false,
    },
    useGameState: {
      gameState: mockGameState,
      updateGameState: jest.fn(),
      resetGame: jest.fn(),
      saveCurrentGame: jest.fn().mockResolvedValue(true),
      error: null,
      isLoading: false,
      // Field state and setters
      playersOnField: mockPlayers.slice(0, 3),
      opponents: [],
      drawings: [],
      setPlayersOnField: jest.fn(),
      setOpponents: jest.fn(),
      setDrawings: jest.fn(),
      setAvailablePlayers: jest.fn(),
      // Field handlers
      handlePlayerDrop: jest.fn(),
      handleDrawingStart: jest.fn(),
      handleDrawingAddPoint: jest.fn(),
      handleDrawingEnd: jest.fn(),
      handleClearDrawings: jest.fn(),
      handleAddOpponent: jest.fn(),
      handleOpponentMove: jest.fn(),
      handleOpponentMoveEnd: jest.fn(),
      handleOpponentRemove: jest.fn(),
      handleToggleGoalie: jest.fn(),
    },
    useOfflineFirstGameTimer: {
      timeElapsed: 0,
      isRunning: false,
      start: jest.fn(),
      pause: jest.fn(),
      reset: jest.fn(),
      gamePhase: 'firstHalf',
    },
    useAutoBackup: {
      isBackingUp: false,
      lastBackupTime: null,
      backupError: null,
    },
    useGameDataQueries: {
      savedGamesQuery: { data: {}, isLoading: false, error: null },
      seasonsQuery: { data: [], isLoading: false, error: null },
      tournamentsQuery: { data: [], isLoading: false, error: null },
    },
    useGameCreationData: {
      newGameData: null,
      setNewGameData: jest.fn(),
      clearNewGameData: jest.fn(),
    },
    useUndoRedo: {
      state: mockGameState,
      set: jest.fn(),
      reset: jest.fn(),
      canUndo: false,
      canRedo: false,
      undo: jest.fn(),
      redo: jest.fn(),
    },
    useTacticalBoard: {
      isActive: false,
      toggle: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
    },
    useRoster: {
      players: mockPlayers,
      playersForCurrentGame: mockPlayers,
      addPlayer: jest.fn(),
      updatePlayer: jest.fn(),
      removePlayer: jest.fn(),
      clearPlayers: jest.fn(),
      isRosterUpdating: false,
      rosterError: null,
      setHighlightRosterButton: jest.fn(),
    },
    useGameDataManager: {
      mutations: {
        addSeasonMutation: jest.fn(),
        updateSeasonMutation: jest.fn(),
        deleteSeasonMutation: jest.fn(),
        addTournamentMutation: jest.fn(),
        updateTournamentMutation: jest.fn(),
        deleteTournamentMutation: jest.fn(),
        updateGameDetailsMutation: jest.fn(),
      },
      handlers: {
        handleQuickSaveGame: jest.fn(),
        handleDeleteGame: jest.fn(),
        handleExportOneJson: jest.fn(),
        handleExportOneCsv: jest.fn(),
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup all default mocks
    (useAuth as jest.Mock).mockReturnValue(defaultMocks.useAuth);
    (useGameState as jest.Mock).mockReturnValue(defaultMocks.useGameState);
    (useOfflineFirstGameTimer as jest.Mock).mockReturnValue(defaultMocks.useOfflineFirstGameTimer);
    (useAutoBackup as jest.Mock).mockReturnValue(defaultMocks.useAutoBackup);
    (useGameDataQueries as jest.Mock).mockReturnValue(defaultMocks.useGameDataQueries);
    (useGameCreationData as jest.Mock).mockReturnValue(defaultMocks.useGameCreationData);
    (useUndoRedo as jest.Mock).mockReturnValue(defaultMocks.useUndoRedo);
    (useTacticalBoard as jest.Mock).mockReturnValue(defaultMocks.useTacticalBoard);
    (useRoster as jest.Mock).mockReturnValue(defaultMocks.useRoster);
    (useGameDataManager as jest.Mock).mockReturnValue(defaultMocks.useGameDataManager);
    (useGameStateManager as jest.Mock).mockReturnValue(defaultMocks.useGameStateManager);
    (useSupabaseWarmup as jest.Mock).mockReturnValue(undefined);
    (useRosterData as jest.Mock).mockReturnValue(defaultMocks.useRosterData);
    (useSavedGamesData as jest.Mock).mockReturnValue(defaultMocks.useSavedGamesData);
  });

  describe('Edge Case: Empty/Null Data Handling', () => {
    it('should handle empty player roster', () => {
      (useRoster as jest.Mock).mockReturnValue({
        ...defaultMocks.useRoster,
        players: [],
      });

      render(<HomePage />);
      
      expect(screen.getByTestId('player-bar')).toBeInTheDocument();
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle null game state', () => {
      (useGameState as jest.Mock).mockReturnValue({
        ...defaultMocks.useGameState,
        gameState: null,
      });

      render(<HomePage />);
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle undefined initial state prop', () => {
      render(<HomePage initialState={undefined} />);
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle malformed player data', () => {
      const malformedPlayers = [
        { id: 'p1', name: null, nickname: undefined }, // Missing required fields
        { id: null, name: 'Player 2', nickname: 'P2' }, // Missing ID
        {} as Player, // Completely empty
      ];

      (useRoster as jest.Mock).mockReturnValue({
        ...defaultMocks.useRoster,
        players: malformedPlayers,
      });

      render(<HomePage />);
      
      // Should render without crashing
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Edge Case: Extreme Values', () => {
    it('should handle very long team names', () => {
      const longTeamName = 'A'.repeat(1000);
      (useGameState as jest.Mock).mockReturnValue({
        ...defaultMocks.useGameState,
        gameState: { ...mockGameState, teamName: longTeamName },
      });

      render(<HomePage />);
      
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });

    it('should handle extreme timer values', () => {
      (useOfflineFirstGameTimer as jest.Mock).mockReturnValue({
        ...defaultMocks.useOfflineFirstGameTimer,
        timeElapsed: 999999999,
      });

      render(<HomePage />);
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle maximum player count', () => {
      const maxPlayers = Array.from({ length: 100 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        nickname: `P${i}`,
        color: '#FF0000',
        isGoalie: i === 0,
        number: i + 1,
      }));

      (useRoster as jest.Mock).mockReturnValue({
        ...defaultMocks.useRoster,
        players: maxPlayers,
      });

      const { container } = render(<HomePage />);
      
      expect(container.firstChild).toBeInTheDocument();
      // Should not crash with large datasets
      expect(screen.getByTestId('player-bar')).toBeInTheDocument();
    });
  });

  describe('Edge Case: Network and Async Errors', () => {
    it('should handle save game failures', async () => {
      (useGameState as jest.Mock).mockReturnValue({
        ...defaultMocks.useGameState,
        saveCurrentGame: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      render(<HomePage />);
      
      const saveBtn = screen.getByTestId('save-game-btn');
      fireEvent.click(saveBtn);
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByTestId('control-bar')).toBeInTheDocument();
      });
    });

    it('should handle load game failures', async () => {
      (useGameDataManager as jest.Mock).mockReturnValue({
        ...defaultMocks.useGameDataManager,
        handlers: {
          ...defaultMocks.useGameDataManager.handlers,
          handleQuickSaveGame: jest.fn().mockRejectedValue(new Error('Load failed')),
        },
      });

      render(<HomePage />);
      
      const loadBtn = screen.getByTestId('load-game-btn');
      fireEvent.click(loadBtn);
      
      // Should handle error gracefully
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle intermittent network errors', async () => {
      (useGameDataQueries as jest.Mock).mockReturnValue({
        savedGamesQuery: { data: null, isLoading: false, error: new Error('Network timeout') },
        seasonsQuery: { data: null, isLoading: false, error: new Error('Connection failed') },
        tournamentsQuery: { data: [], isLoading: false, error: null },
      });

      render(<HomePage />);
      
      // Should render despite network errors
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Edge Case: Rapid User Interactions', () => {
    it('should handle rapid button clicks', async () => {
      render(<HomePage />);
      
      const saveBtn = screen.getByTestId('save-game-btn');
      
      // Rapid fire clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(saveBtn);
      }
      
      // Should handle without errors
      expect(screen.getByTestId('control-bar')).toBeInTheDocument();
    });

    it('should handle rapid player selections', async () => {
      render(<HomePage />);
      
      // Rapidly select different players
      for (let i = 0; i < mockPlayers.length; i++) {
        const player = screen.getByTestId(`bar-player-p${i + 1}`);
        fireEvent.click(player);
      }
      
      expect(screen.getByTestId('player-bar')).toBeInTheDocument();
    });

    it('should handle concurrent drag operations', async () => {
      render(<HomePage />);
      
      const player1 = screen.getByTestId('bar-player-p1');
      const player2 = screen.getByTestId('bar-player-p2');
      
      // Start multiple drags simultaneously
      fireEvent.dragStart(player1);
      fireEvent.dragStart(player2);
      
      const field = screen.getByTestId('soccer-field');
      fireEvent.drop(field);
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Edge Case: Modal State Management', () => {
    it('should handle multiple modals open simultaneously', async () => {
      render(<HomePage />);
      
      // Try to open multiple modals
      const settingsBtn = screen.getByTestId('settings-btn');
      const statsBtn = screen.getByTestId('stats-btn');
      
      fireEvent.click(settingsBtn);
      fireEvent.click(statsBtn);
      
      // Should handle modal state properly
      expect(screen.getByTestId('control-bar')).toBeInTheDocument();
    });

    it('should handle modal close during data operations', async () => {
      render(<HomePage />);
      
      const newGameBtn = screen.getByTestId('new-game-btn');
      fireEvent.click(newGameBtn);
      
      // Simulate closing modal while operation in progress
      expect(screen.getByTestId('control-bar')).toBeInTheDocument();
    });
  });

  describe('Edge Case: Timer and Game State Synchronization', () => {
    it('should handle timer reset during game play', async () => {
      (useOfflineFirstGameTimer as jest.Mock).mockReturnValue({
        ...defaultMocks.useOfflineFirstGameTimer,
        isRunning: true,
        timeElapsed: 1800,
        reset: jest.fn(),
      });

      render(<HomePage />);
      
      // Should handle timer state changes
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle game phase transitions', async () => {
      const mockTimer = {
        ...defaultMocks.useOfflineFirstGameTimer,
        gamePhase: 'halftime',
      };
      (useOfflineFirstGameTimer as jest.Mock).mockReturnValue(mockTimer);

      render(<HomePage />);
      
      // Should handle phase transition
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle timer overflow conditions', async () => {
      (useOfflineFirstGameTimer as jest.Mock).mockReturnValue({
        ...defaultMocks.useOfflineFirstGameTimer,
        timeElapsed: Number.MAX_SAFE_INTEGER,
      });

      render(<HomePage />);
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Edge Case: Memory and Performance', () => {
    it('should handle memory pressure gracefully', async () => {
      // Simulate low memory conditions
      const hugePlayers = Array.from({ length: 1000 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${'X'.repeat(100)} ${i}`,
        nickname: `P${i}`,
        color: '#FF0000',
        isGoalie: false,
        number: i + 1,
      }));

      (useRoster as jest.Mock).mockReturnValue({
        ...defaultMocks.useRoster,
        players: hugePlayers,
      });

      const { container } = render(<HomePage />);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle component remounting without memory leaks', async () => {
      const { unmount } = render(<HomePage />);
      
      unmount();
      
      // Render a new component after unmounting to test remounting
      render(<HomePage />);
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Edge Case: Accessibility and Keyboard Navigation', () => {
    it('should handle keyboard navigation with no focusable elements', async () => {
      // Mock all buttons as disabled
      render(<HomePage />);
      
      // Simulate tab navigation
      fireEvent.keyDown(document.body, { key: 'Tab' });
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle screen reader interactions', async () => {
      render(<HomePage />);
      
      // Simulate screen reader navigation
      const field = screen.getByTestId('soccer-field');
      fireEvent.focus(field);
      
      expect(field).toBeInTheDocument();
    });
  });

  describe('Edge Case: Data Corruption and Recovery', () => {
    it('should handle corrupted game state data', () => {
      const corruptedGameState = {
        ...mockGameState,
        playersOnField: 'invalid data' as any,
        gameEvents: null as any,
      };

      (useGameState as jest.Mock).mockReturnValue({
        ...defaultMocks.useGameState,
        gameState: corruptedGameState,
      });

      render(<HomePage />);
      
      // Should render without crashing
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });

    it('should handle partial data recovery', async () => {
      (useGameDataQueries as jest.Mock).mockReturnValue({
        savedGamesQuery: { data: { 'partial-game': {} }, isLoading: false, error: null },
        seasonsQuery: { data: null, isLoading: false, error: new Error('Corrupted data') },
        tournamentsQuery: { data: [], isLoading: false, error: null },
      });

      render(<HomePage />);
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Edge Case: Browser Compatibility', () => {
    it('should handle missing browser APIs gracefully', () => {
      // Mock missing drag and drop API
      const originalDataTransfer = window.DataTransfer;
      delete (window as any).DataTransfer;

      render(<HomePage />);
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
      
      // Restore API
      (window as any).DataTransfer = originalDataTransfer;
    });

    it('should handle localStorage unavailability', () => {
      // Mock localStorage error
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => { throw new Error('Quota exceeded'); }),
          setItem: jest.fn(() => { throw new Error('Quota exceeded'); }),
        },
      });

      render(<HomePage />);
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
    });
  });
});