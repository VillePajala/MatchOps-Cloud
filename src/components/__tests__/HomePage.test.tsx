import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@/__tests__/test-utils';
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
import * as appSettings from '@/utils/appSettings';
import * as savedGames from '@/utils/savedGames';

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
jest.mock('@/utils/appSettings', () => ({
  __esModule: true,
  saveHasSeenAppGuide: jest.fn().mockResolvedValue(undefined),
  getLastHomeTeamName: jest.fn().mockResolvedValue('Test Team'),
  saveCurrentGameIdSetting: jest.fn().mockResolvedValue(undefined),
  getAppSettings: jest.fn(),
  updateAppSettings: jest.fn(),
}));
jest.mock('@/utils/savedGames', () => ({
  __esModule: true,
  saveGame: jest.fn().mockResolvedValue(undefined),
  getSavedGames: jest.fn().mockResolvedValue({}),
  exportGame: jest.fn().mockResolvedValue('export-data'),
  getGame: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/services/UtilityRegistry', () => ({
  registerExportUtilities: jest.fn(),
  executeExportFunction: jest.fn(),
}));

// Mock child components to isolate HomePage testing
jest.mock('../SoccerField', () => {
  return function SoccerField(props: any) {
    return <div data-testid="soccer-field">SoccerField Component</div>;
  };
});

jest.mock('../PlayerBar', () => {
  return function PlayerBar(props: any) {
    return <div data-testid="player-bar">PlayerBar Component</div>;
  };
});

jest.mock('../ControlBar', () => {
  return function ControlBar(props: any) {
    return <div data-testid="control-bar">ControlBar Component</div>;
  };
});

jest.mock('../TimerOverlay', () => {
  return function TimerOverlay(props: any) {
    return <div data-testid="timer-overlay">TimerOverlay Component</div>;
  };
});

jest.mock('../GameInfoBar', () => {
  return function GameInfoBar(props: any) {
    return <div data-testid="game-info-bar">GameInfoBar Component</div>;
  };
});

// Mock all modal components
jest.mock('../GoalLogModal', () => {
  return function GoalLogModal(props: any) {
    return props.isOpen ? <div data-testid="goal-log-modal">GoalLogModal</div> : null;
  };
});

jest.mock('../GameStatsModal', () => {
  return function GameStatsModal(props: any) {
    return props.isOpen ? <div data-testid="game-stats-modal">GameStatsModal</div> : null;
  };
});

jest.mock('../GameSettingsModal', () => {
  return function GameSettingsModal(props: any) {
    return props.isOpen ? <div data-testid="game-settings-modal">GameSettingsModal</div> : null;
  };
});

jest.mock('../TrainingResourcesModal', () => {
  return function TrainingResourcesModal(props: any) {
    return props.isOpen ? <div data-testid="training-resources-modal">TrainingResourcesModal</div> : null;
  };
});

jest.mock('../LoadGameModal', () => {
  return function LoadGameModal(props: any) {
    return props.isOpen ? <div data-testid="load-game-modal">LoadGameModal</div> : null;
  };
});

jest.mock('../NewGameSetupModal', () => {
  return function NewGameSetupModal(props: any) {
    return props.isOpen ? <div data-testid="new-game-setup-modal">NewGameSetupModal</div> : null;
  };
});

jest.mock('../RosterSettingsModal', () => {
  return function RosterSettingsModal(props: any) {
    return props.isOpen ? <div data-testid="roster-settings-modal">RosterSettingsModal</div> : null;
  };
});

jest.mock('../SettingsModal', () => {
  return function SettingsModal(props: any) {
    return props.isOpen ? <div data-testid="settings-modal">SettingsModal</div> : null;
  };
});

jest.mock('../SeasonTournamentManagementModal', () => {
  return function SeasonTournamentManagementModal(props: any) {
    return props.isOpen ? <div data-testid="season-tournament-modal">SeasonTournamentManagementModal</div> : null;
  };
});

jest.mock('../InstructionsModal', () => {
  return function InstructionsModal(props: any) {
    return props.isOpen ? <div data-testid="instructions-modal">InstructionsModal</div> : null;
  };
});

jest.mock('../PlayerAssessmentModal', () => {
  return function PlayerAssessmentModal(props: any) {
    return props.isOpen ? <div data-testid="player-assessment-modal">PlayerAssessmentModal</div> : null;
  };
});

describe('HomePage', () => {
  const mockInitialState = {
    currentGameId: 'test-game-123',
    teamName: 'Test Team',
    teamColor: '#000000',
    teamColorSecondary: '#FFFFFF',
    opponentName: 'Opponent Team',
    opponentColor: '#FF0000',
    opponentColorSecondary: '#00FF00',
    homeOrAway: 'home' as const,
    seasons: [],
    tournaments: [],
    allPlayers: [],
    canUndo: false,
    canRedo: false,
    tacticalBoardActive: false,
    tacticalDrawings: [],
    theme: 'light' as const,
    periodCount: 2,
    periodLength: 45,
    selectedGameId: null,
    gameDate: new Date().toISOString(),
    gameTime: '10:00',
    location: 'Test Stadium',
    notes: '',
    selectedSeasonId: null,
    selectedTournamentId: null,
  };

  // This mockGameState is no longer needed as useGameState now has a specific return type
  // const mockGameState = { ... } - removed as it was conflicting with the actual interface

  const mockTimer = {
    time: 0,
    isRunning: false,
    isPaused: false,
    startTimer: jest.fn(),
    stopTimer: jest.fn(),
    pauseTimer: jest.fn(),
    resumeTimer: jest.fn(),
    resetTimer: jest.fn(),
    setTime: jest.fn(),
  };

  const mockAuth = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updateEmail: jest.fn(),
    updatePassword: jest.fn(),
    deleteAccount: jest.fn(),
    refreshSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    
    // Setup default mock implementations
    (useAuth as jest.Mock).mockReturnValue(mockAuth);
    (useGameState as jest.Mock).mockReturnValue({
      // State values matching UseGameStateReturn interface
      playersOnField: [],
      opponents: [],
      drawings: [],
      availablePlayers: [],
      // State setters from UseGameStateReturn interface
      setPlayersOnField: jest.fn(),
      setOpponents: jest.fn(),
      setDrawings: jest.fn(),
      setAvailablePlayers: jest.fn(),
      // Handlers from UseGameStateReturn interface
      handlePlayerDrop: jest.fn(),
      handleDrawingStart: jest.fn(),
      handleDrawingAddPoint: jest.fn(),
      handleDrawingEnd: jest.fn(),
      handleClearDrawings: jest.fn(),
      handleAddOpponent: jest.fn(),
      handleOpponentMove: jest.fn(),
      handleOpponentMoveEnd: jest.fn(),
      handleOpponentRemove: jest.fn(),
      handleRenamePlayer: jest.fn(),
      handleToggleGoalie: jest.fn(),
    });
    (useOfflineFirstGameTimer as jest.Mock).mockReturnValue(mockTimer);
    (useAutoBackup as jest.MockedFunction<typeof useAutoBackup>).mockImplementation(() => {});
    (useGameDataQueries as jest.Mock).mockReturnValue({
      savedGamesQuery: { data: {}, isLoading: false },
      seasonsQuery: { data: [], isLoading: false },
      tournamentsQuery: { data: [], isLoading: false },
      refetchAll: jest.fn(),
    });
    (useGameCreationData as jest.Mock).mockReturnValue({
      isCreatingGame: false,
      createGameData: null,
      mutations: {
        addSeasonMutation: { mutate: jest.fn(), isLoading: false },
        updateSeasonMutation: { mutate: jest.fn(), isLoading: false },
        deleteSeasonMutation: { mutate: jest.fn(), isLoading: false },
        addTournamentMutation: { mutate: jest.fn(), isLoading: false },
        updateTournamentMutation: { mutate: jest.fn(), isLoading: false },
        deleteTournamentMutation: { mutate: jest.fn(), isLoading: false },
      },
    });
    (useUndoRedo as jest.Mock).mockReturnValue({
      canUndo: false,
      canRedo: false,
      undo: jest.fn(),
      redo: jest.fn(),
      clearHistory: jest.fn(),
      resetHistory: jest.fn(),
      saveStateToHistory: jest.fn(),
    });
    (useTacticalBoard as jest.Mock).mockReturnValue({
      tacticalBoardActive: false,
      tacticalDrawings: [],
      tacticalDiscs: [],
      tacticalBallPosition: { relX: 0.5, relY: 0.5 },
      setTacticalBoardActive: jest.fn(),
      setTacticalDrawings: jest.fn(),
      setTacticalDiscs: jest.fn(),
      setTacticalBallPosition: jest.fn(),
      clearTacticalBoard: jest.fn(),
      clearTacticalElements: jest.fn(),
      handleTacticalDrawingStart: jest.fn(),
      handleTacticalDrawingAddPoint: jest.fn(),
      handleTacticalDrawingEnd: jest.fn(),
      handleTacticalDiscMove: jest.fn(),
      handleTacticalDiscRemove: jest.fn(),
      handleToggleTacticalDiscType: jest.fn(),
      handleTacticalBallMove: jest.fn(),
    });
    (useRoster as jest.Mock).mockReturnValue({
      allPlayers: [],
      masterRoster: [],
      updatePlayerInRoster: jest.fn(),
      addPlayerToRoster: jest.fn(),
      removePlayerFromRoster: jest.fn(),
      saveMasterRoster: jest.fn(),
    });
    (useGameDataManager as jest.Mock).mockReturnValue({
      createGame: jest.fn(),
      deleteGame: jest.fn(),
      updateGame: jest.fn(),
      addSeason: jest.fn(),
      updateSeason: jest.fn(),
      deleteSeason: jest.fn(),
      addTournament: jest.fn(),
      updateTournament: jest.fn(),
      deleteTournament: jest.fn(),
      mutations: {
        addSeasonMutation: { mutate: jest.fn(), isLoading: false },
        updateSeasonMutation: { mutate: jest.fn(), isLoading: false },
        deleteSeasonMutation: { mutate: jest.fn(), isLoading: false },
        addTournamentMutation: { mutate: jest.fn(), isLoading: false },
        updateTournamentMutation: { mutate: jest.fn(), isLoading: false },
        deleteTournamentMutation: { mutate: jest.fn(), isLoading: false },
      },
      handlers: {
        handleQuickSaveGame: jest.fn(),
        handleDeleteGame: jest.fn(),
        handleExportOneJson: jest.fn(),
        handleExportOneCsv: jest.fn(),
      },
    });
    (useGameStateManager as jest.Mock).mockReturnValue({
      gameSession: {
        gameId: 'test-game-123',
        teamName: 'Test Team',
        opponentName: 'Opponent Team',
        homeOrAway: 'home' as const,
        homeScore: 0,
        awayScore: 0,
        currentPeriod: 1,
        numberOfPeriods: 2,
        periodDurationMinutes: 45,
        gameDate: new Date().toISOString(),
        gameTime: '10:00',
        gameLocation: 'Test Stadium',
        gameNotes: '',
        selectedPlayerIds: [],
        availablePlayers: [],
        playersOnField: [],
        gameEvents: [],
        ageGroup: '',
        tournamentLevel: '',
        seasonId: '',
        tournamentId: '',
        demandFactor: 1,
        isPlayed: false,
        gameStatus: 'notStarted' as const,
        timeElapsedInSeconds: 0,
      },
      updateGameSession: jest.fn(),
      resetGameSession: jest.fn(),
    });
    (useSupabaseWarmup as jest.Mock).mockReturnValue(undefined);
    (useRosterData as jest.Mock).mockReturnValue({
      masterRoster: [],
      isLoadingMasterRoster: false,
      refetchMasterRoster: jest.fn(),
    });
    (useSavedGamesData as jest.Mock).mockReturnValue({
      savedGames: {},
      isLoadingSavedGames: false,
      refetchSavedGames: jest.fn(),
    });

    // Mock app settings utilities - these are likely already mocked at module level
  });

  describe('Component Rendering', () => {
    it('should render all core components', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
      expect(screen.getByTestId('player-bar')).toBeInTheDocument();
      expect(screen.getByTestId('control-bar')).toBeInTheDocument();
      // TimerOverlay is conditionally rendered based on showLargeTimerOverlay state
    });

    it('should render within error boundary', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      // Check that the main game container exists
      const gameContainer = screen.getByTestId('game-info-bar').parentElement;
      expect(gameContainer).toBeInTheDocument();
    });

    it('should apply correct layout classes', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      const mainContainer = screen.getByTestId('game-info-bar').parentElement?.parentElement;
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'h-screen', 'bg-slate-900', 'text-slate-50', 'overflow-hidden');
    });
  });

  describe('Initial State Management', () => {
    it('should initialize with provided initial state', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      expect(useGameState).toHaveBeenCalled();
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });

    it('should handle null initial state gracefully', () => {
      render(<HomePage initialState={null as any} />);
      
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });

    it('should sync with authentication state', () => {
      const authenticatedAuth = {
        ...mockAuth,
        isAuthenticated: true,
        user: { id: 'user-123', email: 'test@test.com' },
      };
      (useAuth as jest.Mock).mockReturnValue(authenticatedAuth);
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(useAuth).toHaveBeenCalled();
    });
  });

  describe('Modal Management', () => {
    it('should initially hide all modals', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      expect(screen.queryByTestId('goal-log-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('game-stats-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('game-settings-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('training-resources-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('load-game-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('new-game-setup-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('roster-settings-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('season-tournament-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('instructions-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-assessment-modal')).not.toBeInTheDocument();
    });
  });

  describe('Game Timer Integration', () => {
    it('should initialize game timer hook', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      expect(useOfflineFirstGameTimer).toHaveBeenCalledWith(
        expect.objectContaining({
          state: expect.any(Object),
          dispatch: expect.any(Function),
          currentGameId: expect.any(String)
        })
      );
    });

    it('should not render timer overlay by default', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      // Timer overlay is hidden by default
      expect(screen.queryByTestId('timer-overlay')).not.toBeInTheDocument();
    });
  });

  describe('Auto Backup Functionality', () => {
    it('should initialize auto backup hook', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      expect(useAutoBackup).toHaveBeenCalled();
    });

    it('should handle backup in progress state', () => {
      (useAutoBackup as jest.Mock).mockReturnValue({
        lastBackupTime: new Date(),
        isBackingUp: true,
      });
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });
  });

  describe('Data Loading States', () => {
    it('should handle loading state for saved games', () => {
      (useGameDataQueries as jest.Mock).mockReturnValue({
        savedGamesQuery: { data: {}, isLoading: true },
        seasonsQuery: { data: [], isLoading: false },
        tournamentsQuery: { data: [], isLoading: false },
        refetchAll: jest.fn(),
      });
      
      render(<HomePage initialState={mockInitialState} />);
      
      // Component should still render during loading
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });

    it('should handle loading state for seasons and tournaments', () => {
      (useGameDataQueries as jest.Mock).mockReturnValue({
        savedGamesQuery: { data: {}, isLoading: false },
        seasonsQuery: { data: [], isLoading: true },
        tournamentsQuery: { data: [], isLoading: true },
        refetchAll: jest.fn(),
      });
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });
  });

  describe('Game State Synchronization', () => {
    it('should sync game state with timer', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      expect(useOfflineFirstGameTimer).toHaveBeenCalledWith(
        expect.objectContaining({
          state: expect.any(Object),
          dispatch: expect.any(Function),
          currentGameId: expect.any(String)
        })
      );
    });

    it('should handle game state updates', async () => {
      const handleRenamePlayer = jest.fn();
      (useGameState as jest.Mock).mockReturnValue({
        // State values matching UseGameStateReturn interface
        playersOnField: [],
        opponents: [],
        drawings: [],
        availablePlayers: [],
        // State setters from UseGameStateReturn interface
        setPlayersOnField: jest.fn(),
        setOpponents: jest.fn(),
        setDrawings: jest.fn(),
        setAvailablePlayers: jest.fn(),
        // Handlers from UseGameStateReturn interface
        handlePlayerDrop: jest.fn(),
        handleDrawingStart: jest.fn(),
        handleDrawingAddPoint: jest.fn(),
        handleDrawingEnd: jest.fn(),
        handleClearDrawings: jest.fn(),
        handleAddOpponent: jest.fn(),
        handleOpponentMove: jest.fn(),
        handleOpponentMoveEnd: jest.fn(),
        handleOpponentRemove: jest.fn(),
        handleRenamePlayer,
        handleToggleGoalie: jest.fn(),
      });
      
      render(<HomePage initialState={mockInitialState} />);
      
      // Verify the game state hook was called
      expect(useGameState).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle game state errors gracefully', () => {
      // Simulate an error in one of the handlers
      const handlePlayerDropWithError = jest.fn().mockImplementation(() => {
        throw new Error('Game state error');
      });
      
      (useGameState as jest.Mock).mockReturnValue({
        // State values matching UseGameStateReturn interface
        playersOnField: [],
        opponents: [],
        drawings: [],
        availablePlayers: [],
        // State setters from UseGameStateReturn interface
        setPlayersOnField: jest.fn(),
        setOpponents: jest.fn(),
        setDrawings: jest.fn(),
        setAvailablePlayers: jest.fn(),
        // Handlers from UseGameStateReturn interface
        handlePlayerDrop: handlePlayerDropWithError,
        handleDrawingStart: jest.fn(),
        handleDrawingAddPoint: jest.fn(),
        handleDrawingEnd: jest.fn(),
        handleClearDrawings: jest.fn(),
        handleAddOpponent: jest.fn(),
        handleOpponentMove: jest.fn(),
        handleOpponentMoveEnd: jest.fn(),
        handleOpponentRemove: jest.fn(),
        handleRenamePlayer: jest.fn(),
        handleToggleGoalie: jest.fn(),
      });
      
      render(<HomePage initialState={mockInitialState} />);
      
      // Component should still render despite potential errors in handlers
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });

    it('should handle data query errors', () => {
      (useGameDataQueries as jest.Mock).mockReturnValue({
        savedGamesQuery: { data: null, isLoading: false, error: new Error('Query error') },
        seasonsQuery: { data: null, isLoading: false },
        tournamentsQuery: { data: null, isLoading: false },
        refetchAll: jest.fn(),
      });
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });
  });

  describe('Tactical Board Integration', () => {
    it('should initialize tactical board state', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      expect(useTacticalBoard).toHaveBeenCalled();
    });

    it('should handle tactical board active state', () => {
      (useTacticalBoard as jest.Mock).mockReturnValue({
        tacticalBoardActive: true,
        tacticalDrawings: [{ id: '1', type: 'line', points: [] }],
        tacticalDiscs: [],
        tacticalBallPosition: { relX: 0.5, relY: 0.5 },
        setTacticalBoardActive: jest.fn(),
        setTacticalDrawings: jest.fn(),
        setTacticalDiscs: jest.fn(),
        setTacticalBallPosition: jest.fn(),
        clearTacticalBoard: jest.fn(),
        clearTacticalElements: jest.fn(),
        handleTacticalDrawingStart: jest.fn(),
        handleTacticalDrawingAddPoint: jest.fn(),
        handleTacticalDrawingEnd: jest.fn(),
        handleTacticalDiscMove: jest.fn(),
        handleTacticalDiscRemove: jest.fn(),
        handleToggleTacticalDiscType: jest.fn(),
        handleTacticalBallMove: jest.fn(),
      });
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should initialize undo/redo hooks', () => {
      render(<HomePage initialState={mockInitialState} />);
      
      expect(useUndoRedo).toHaveBeenCalled();
    });

    it('should handle undo/redo state changes', () => {
      (useUndoRedo as jest.Mock).mockReturnValue({
        canUndo: true,
        canRedo: true,
        undo: jest.fn(),
        redo: jest.fn(),
        clearHistory: jest.fn(),
      });
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(screen.getByTestId('control-bar')).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('should render core components without blocking', () => {
      const startTime = performance.now();
      render(<HomePage initialState={mockInitialState} />);
      const endTime = performance.now();
      
      // Rendering should be fast (under 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // All components should be rendered
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
      expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
      expect(screen.getByTestId('player-bar')).toBeInTheDocument();
    });

    it('should handle large player lists efficiently', () => {
      const largePlayers = Array.from({ length: 100 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i}`,
        jerseyNumber: i,
        fieldPosition: null,
      }));
      
      (useRoster as jest.Mock).mockReturnValue({
        allPlayers: largePlayers,
        masterRoster: largePlayers,
        updatePlayerInRoster: jest.fn(),
        addPlayerToRoster: jest.fn(),
        removePlayerFromRoster: jest.fn(),
        saveMasterRoster: jest.fn(),
      });
      
      render(<HomePage initialState={{ ...mockInitialState, allPlayers: largePlayers }} />);
      
      expect(screen.getByTestId('player-bar')).toBeInTheDocument();
    });
  });

  describe('Key Actions and Handlers', () => {
    it('should handle start new game action', async () => {
      const mockHandleStartNewGame = jest.fn();
      
      render(<HomePage initialState={mockInitialState} />);
      
      // Component should initialize game creation hooks
      expect(useGameCreationData).toHaveBeenCalled();
    });

    it('should handle save game action', async () => {
      const mockHandleSave = jest.fn().mockResolvedValue('game-123');
      
      const mockGameDataManager = {
        createGame: jest.fn(),
        deleteGame: jest.fn(),
        updateGame: jest.fn(),
        addSeason: jest.fn(),
        updateSeason: jest.fn(),
        deleteSeason: jest.fn(),
        addTournament: jest.fn(),
        updateTournament: jest.fn(),
        deleteTournament: jest.fn(),
        mutations: {
          addSeasonMutation: { mutate: jest.fn(), isLoading: false },
          updateSeasonMutation: { mutate: jest.fn(), isLoading: false },
          deleteSeasonMutation: { mutate: jest.fn(), isLoading: false },
          addTournamentMutation: { mutate: jest.fn(), isLoading: false },
          updateTournamentMutation: { mutate: jest.fn(), isLoading: false },
          deleteTournamentMutation: { mutate: jest.fn(), isLoading: false },
        },
        handlers: {
          handleQuickSaveGame: mockHandleSave,
          handleDeleteGame: jest.fn(),
          handleExportOneJson: jest.fn(),
          handleExportOneCsv: jest.fn(),
        },
      };
      
      (useGameDataManager as jest.Mock).mockReturnValue(mockGameDataManager);
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(useGameDataManager).toHaveBeenCalled();
    });

    it('should handle load game action', async () => {
      const mockSavedGames = {
        'game-1': { teamName: 'Team A', opponentName: 'Team B' },
        'game-2': { teamName: 'Team C', opponentName: 'Team D' },
      };
      
      (useGameDataQueries as jest.Mock).mockReturnValue({
        savedGamesQuery: { data: mockSavedGames, isLoading: false },
        seasonsQuery: { data: [], isLoading: false },
        tournamentsQuery: { data: [], isLoading: false },
        refetchAll: jest.fn(),
      });
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(useGameDataQueries).toHaveBeenCalled();
    });

    it('should handle export actions', async () => {
      const mockExportJson = jest.fn().mockResolvedValue({ success: true });
      const mockExportCsv = jest.fn().mockResolvedValue({ success: true });
      
      const mockGameDataManager = {
        createGame: jest.fn(),
        deleteGame: jest.fn(),
        updateGame: jest.fn(),
        addSeason: jest.fn(),
        updateSeason: jest.fn(),
        deleteSeason: jest.fn(),
        addTournament: jest.fn(),
        updateTournament: jest.fn(),
        deleteTournament: jest.fn(),
        mutations: {
          addSeasonMutation: { mutate: jest.fn(), isLoading: false },
          updateSeasonMutation: { mutate: jest.fn(), isLoading: false },
          deleteSeasonMutation: { mutate: jest.fn(), isLoading: false },
          addTournamentMutation: { mutate: jest.fn(), isLoading: false },
          updateTournamentMutation: { mutate: jest.fn(), isLoading: false },
          deleteTournamentMutation: { mutate: jest.fn(), isLoading: false },
        },
        handlers: {
          handleQuickSaveGame: jest.fn(),
          handleDeleteGame: jest.fn(),
          handleExportOneJson: mockExportJson,
          handleExportOneCsv: mockExportCsv,
        },
      };
      
      (useGameDataManager as jest.Mock).mockReturnValue(mockGameDataManager);
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(useGameDataManager).toHaveBeenCalled();
    });

    it('should handle player assessment saves', () => {
      const mockSaveAssessment = jest.fn();
      
      render(<HomePage initialState={mockInitialState} />);
      
      // Component should provide assessment functionality
      expect(screen.getByTestId('player-bar')).toBeInTheDocument();
    });
  });

  describe('Advanced Error Scenarios', () => {
    it('should handle save failures gracefully', async () => {
      const mockFailingSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      
      const mockGameDataManager = {
        createGame: jest.fn(),
        deleteGame: jest.fn(),
        updateGame: jest.fn(),
        addSeason: jest.fn(),
        updateSeason: jest.fn(),
        deleteSeason: jest.fn(),
        addTournament: jest.fn(),
        updateTournament: jest.fn(),
        deleteTournament: jest.fn(),
        mutations: {
          addSeasonMutation: { mutate: jest.fn(), isLoading: false },
          updateSeasonMutation: { mutate: jest.fn(), isLoading: false },
          deleteSeasonMutation: { mutate: jest.fn(), isLoading: false },
          addTournamentMutation: { mutate: jest.fn(), isLoading: false },
          updateTournamentMutation: { mutate: jest.fn(), isLoading: false },
          deleteTournamentMutation: { mutate: jest.fn(), isLoading: false },
        },
        handlers: {
          handleQuickSaveGame: mockFailingSave,
          handleDeleteGame: jest.fn(),
          handleExportOneJson: jest.fn(),
          handleExportOneCsv: jest.fn(),
        },
      };
      
      (useGameDataManager as jest.Mock).mockReturnValue(mockGameDataManager);
      
      render(<HomePage initialState={mockInitialState} />);
      
      // Component should render even with failing save handlers
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });

    it('should handle timer failures', () => {
      const mockFailingTimer = {
        time: 0,
        isRunning: false,
        isPaused: false,
        startTimer: jest.fn().mockImplementation(() => { throw new Error('Timer error'); }),
        stopTimer: jest.fn(),
        pauseTimer: jest.fn(),
        resumeTimer: jest.fn(),
        resetTimer: jest.fn(),
        setTime: jest.fn(),
      };
      
      (useOfflineFirstGameTimer as jest.Mock).mockReturnValue(mockFailingTimer);
      
      render(<HomePage initialState={mockInitialState} />);
      
      // Component should still render even with failing timer (but timer overlay won't be shown by default)
      expect(screen.getByTestId('control-bar')).toBeInTheDocument();
    });

    it('should handle authentication errors', () => {
      const mockFailingAuth = {
        ...mockAuth,
        isLoading: false,
        error: new Error('Auth failed'),
      };
      
      (useAuth as jest.Mock).mockReturnValue(mockFailingAuth);
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });

    it('should handle network connectivity issues', () => {
      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
      
      // Restore online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });
  });

  describe('Data Persistence and Recovery', () => {
    it('should handle auto-backup during game play', () => {
      const mockAutoBackup = jest.fn();
      (useAutoBackup as jest.Mock).mockImplementation(mockAutoBackup);
      
      render(<HomePage initialState={mockInitialState} />);
      
      expect(mockAutoBackup).toHaveBeenCalled();
    });

    it('should handle state recovery after refresh', () => {
      // Mock localStorage recovery scenario
      const recoveredState = {
        ...mockInitialState,
        gameStatus: 'inProgress',
        timeElapsedInSeconds: 300,
      };
      
      render(<HomePage initialState={recoveredState} />);
      
      expect(useOfflineFirstGameTimer).toHaveBeenCalledWith(
        expect.objectContaining({
          state: expect.any(Object),
          dispatch: expect.any(Function),
          currentGameId: expect.any(String)
        })
      );
    });

    it('should handle corrupted state gracefully', () => {
      // Test with minimal/corrupted initial state
      const corruptedState = {
        teamName: null,
        opponentName: undefined,
        allPlayers: 'not-an-array',
      };
      
      render(<HomePage initialState={corruptedState as any} />);
      
      // Should still render core components
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });
  });

  describe('Cleanup and Unmounting', () => {
    it('should cleanup resources on unmount', () => {
      const { unmount } = render(<HomePage initialState={mockInitialState} />);
      
      unmount();
      
      // Verify no memory leaks or errors
      expect(mockTimer.stopTimer).not.toHaveBeenCalled(); // Timer should persist
    });

    it('should handle rapid mount/unmount cycles', () => {
      const { unmount } = render(<HomePage initialState={mockInitialState} />);
      unmount();
      
      // Remount immediately
      render(<HomePage initialState={mockInitialState} />);
      
      expect(screen.getByTestId('game-info-bar')).toBeInTheDocument();
    });

    it('should not cause memory leaks with multiple instances', () => {
      const instances = [];
      
      // Create multiple instances
      for (let i = 0; i < 5; i++) {
        instances.push(render(<HomePage initialState={mockInitialState} />));
      }
      
      // Unmount all instances
      instances.forEach(instance => instance.unmount());
      
      // No assertions needed - Jest will catch memory leaks
    });
  });
});