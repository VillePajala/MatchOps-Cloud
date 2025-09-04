'use client';

import React, { useState, useEffect, useCallback, useReducer, useRef, useMemo, startTransition } from 'react';
// PHASE 2: Import unstable_batchedUpdates for performance optimization
import { unstable_batchedUpdates } from 'react-dom';
import { GameErrorBoundary } from './GameErrorBoundary';
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';
import TimerOverlay from '@/components/TimerOverlay';
// 🔥 FLICKERING FIX: Use direct imports instead of lazy loading to eliminate loading delays
import GoalLogModal from '@/components/GoalLogModal';
import GameStatsModal from '@/components/GameStatsModal';
import GameSettingsModal from '@/components/GameSettingsModal';
import TrainingResourcesModal from '@/components/TrainingResourcesModal';
import LoadGameModal from '@/components/LoadGameModal';
import NewGameSetupModal from '@/components/NewGameSetupModal';
import RosterSettingsModal from '@/components/RosterSettingsModal';
import SettingsModal from '@/components/SettingsModal';
import SeasonTournamentManagementModal from '@/components/SeasonTournamentManagementModal';
import InstructionsModal from '@/components/InstructionsModal';
import PlayerAssessmentModal from '@/components/PlayerAssessmentModal';
// PHASE 2: Progressive rendering components  
import { GameLoadingSkeleton } from '@/components/Skeleton';

// Utility registry for export functions
import { registerExportUtilities, executeExportFunction } from '@/services/UtilityRegistry';
registerExportUtilities();
import usePlayerRosterManager from '@/hooks/usePlayerRosterManager';
import usePlayerFieldManager from '@/hooks/usePlayerFieldManager';
import useGameEventsManager from '@/hooks/useGameEventsManager';
import useAppSettingsManager from '@/hooks/useAppSettingsManager';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useGameState, UseGameStateReturn } from '@/hooks/useGameState';
import GameInfoBar from '@/components/GameInfoBar';
import { useOfflineFirstGameTimer } from '@/hooks/useOfflineFirstGameTimer';
import useAutoBackup from '@/hooks/useAutoBackup';
// Import the new game session reducer and related types
import {
  gameSessionReducer,
  GameSessionState,
  // initialGameSessionStatePlaceholder // We will derive initial state from page.tsx's initialState
} from '@/hooks/useGameSessionReducer';
// Import roster utility functions
// roster mutations now managed inside useRoster hook

// Removed unused import of utilGetMasterRoster

// Import utility functions for seasons and tournaments
import { saveGame as utilSaveGame } from '@/utils/savedGames';
// PHASE 2: Loading registry for timeout handling
import { loadingRegistry } from '@/utils/loadingRegistry';
// PHASE 3: Operation priority system
import { operationQueue, OperationPriority } from '@/utils/operationQueue';
// PHASE 4: Immer for efficient immutable updates
import { produce } from 'immer';
// Removed - now handled by useGameDataManager: deleteGame, getLatestGameId, createGame
import {
  saveCurrentGameIdSetting as utilSaveCurrentGameIdSetting,
  // getHasSeenAppGuide, // Unused - app guide disabled
  saveHasSeenAppGuide,
  getLastHomeTeamName as utilGetLastHomeTeamName,
} from '@/utils/appSettings';
// Removed - now handled by useGameDataManager:
// import { deleteSeason as utilDeleteSeason, updateSeason as utilUpdateSeason, addSeason as utilAddSeason } from '@/utils/seasons';
// import { deleteTournament as utilDeleteTournament, updateTournament as utilUpdateTournament, addTournament as utilAddTournament } from '@/utils/tournaments';
// Import Player from types directory
import { Player, Season, Tournament } from '@/types';
import type { AppStateDetection } from '@/hooks/useAppStateDetection';
// Import saveMasterRoster utility
import type { AppState, SavedGamesCollection } from "@/types";
// Removed - now handled by useGameDataManager: 
// import { useQueryClient } from '@tanstack/react-query';
import { useGameDataQueries } from '@/hooks/useGameDataQueries';
import { useGameCreationData } from '@/hooks/useGameCreationData';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useTacticalBoard } from '@/hooks/useTacticalBoard';
import { useRoster } from '@/hooks/useRoster';
import { useGameDataManager } from '@/hooks/useGameDataManager';
import { useGameStateManager } from '@/hooks/useGameStateManager';
import { useGameSettingsModalWithHandlers } from '@/hooks/useGameSettingsModalState';
import { useGameStatsModalWithHandlers } from '@/hooks/useGameStatsModalState';
import { useAuthStorage } from '@/hooks/useAuthStorage';
import { useRosterSettingsModalWithHandlers } from '@/hooks/useRosterSettingsModalState';
import { useLoadGameModalWithHandlers } from '@/hooks/useLoadGameModalState';
import { useNewGameSetupModalWithHandlers } from '@/hooks/useNewGameSetupModalState';
import { useSeasonTournamentModalWithHandlers } from '@/hooks/useSeasonTournamentModalState';
import { useTrainingResourcesModalWithHandlers } from '@/hooks/useTrainingResourcesModalState';
import { useGoalLogModalWithHandlers } from '@/hooks/useGoalLogModalState';
import { useSettingsModalWithHandlers } from '@/hooks/useSettingsModalState';
import { usePlayerAssessmentModalWithHandlers } from '@/hooks/usePlayerAssessmentModalState';
import { useSupabaseWarmup } from '@/hooks/useSupabaseWarmup';
import { useRosterData } from '@/hooks/useRosterData';
import { useSavedGamesData } from '@/hooks/useSavedGamesData';
// Import skeleton components - removed unused skeletons
// import { GameStatsModalSkeleton, LoadGameModalSkeleton, RosterModalSkeleton, ModalSkeleton } from '@/components/ui/ModalSkeleton';
import { AppLoadingSkeleton } from '@/components/ui/AppSkeleton';
// Note: localStorage utilities removed - using offline-first storage instead
// Removed - now handled by useGameDataManager: 
// import { queryKeys } from '@/config/queryKeys';
// Also import addSeason and addTournament for the new mutations
// Removed - now handled by useGameDataManager:
// import { updateGameDetails as utilUpdateGameDetails } from '@/utils/savedGames';
import { DEFAULT_GAME_ID } from '@/config/constants';
// Storage keys no longer needed - using offline-first storage
// Removed static import of export utilities - now using dynamic imports for better bundle splitting
// Removed - now handled by useGameDataManager: exportJson, exportCsv
import { useToast } from '@/contexts/ToastProvider';
import logger from '@/utils/logger';
import { perfMark, perfMeasure, PERF_MARKS } from '@/utils/performance';
// Prefetch helpers for reference data
import { getSeasons as utilGetSeasons } from '@/utils/seasons';
import { getTournaments as utilGetTournaments } from '@/utils/tournaments';


// Placeholder data - Initialize new fields
const initialAvailablePlayersData: Player[] = [];

const initialState: AppState = {
  playersOnField: [], // Start with no players on field
  opponents: [], // Start with no opponents
  drawings: [],
  availablePlayers: initialAvailablePlayersData, // <<< ADD: Use initial data here
  showPlayerNames: true,
  teamName: "My Team",
  gameEvents: [], // Initialize game events as empty array
  // Initialize game info
  opponentName: "Opponent",
  gameDate: new Date().toISOString().split('T')[0], // Default to today's date YYYY-MM-DD
  homeScore: 0,
  awayScore: 0,
  gameNotes: '', // Initialize game notes as empty string
  homeOrAway: 'home', // <<< Step 1: Initialize field
  // Initialize game structure
  numberOfPeriods: 2,
  periodDurationMinutes: 10, // Default to 10 minutes
  currentPeriod: 1,
  gameStatus: 'notStarted', // Initialize game status
  demandFactor: 1,
  // Initialize selectedPlayerIds with all players from initial data
  selectedPlayerIds: [],
  // gameType: 'season', // REMOVED
  seasonId: '', // Initialize season ID
  tournamentId: '', // Initialize tournament ID
  ageGroup: '',
  tournamentLevel: '',
  gameLocation: '', // Initialize optional fields
  gameTime: '', // Initialize optional fields
  // Timer related state
  subIntervalMinutes: 5, // Add sub interval with default
  completedIntervalDurations: [], // Initialize completed interval logs
  lastSubConfirmationTimeSeconds: 0, // Initialize last substitution confirmation time
  tacticalDiscs: [],
  tacticalDrawings: [],
  tacticalBallPosition: { relX: 0.5, relY: 0.5 },
  timeElapsedInSeconds: 0,
};

interface HomePageProps {
  initialAction?: 'newGame' | 'loadGame' | 'resumeGame' | 'season' | 'stats';
  skipInitialSetup?: boolean;
  appStateDetection?: AppStateDetection;
}

function HomePage({ initialAction, skipInitialSetup = false, appStateDetection }: HomePageProps) {
  const { t } = useTranslation(); // Get translation function
  const { signOut, user } = useAuth();
  // Removed - now handled by useGameDataManager: 
  // const queryClient = useQueryClient(); // Get query client instance

  // CRITICAL FIX: Sync auth state with storage manager
  useAuthStorage();

  // Warm up Supabase connection after auth to avoid cold-start penalties
  useSupabaseWarmup(!!user);



  // --- Initialize Game Session Reducer ---
  // Map necessary fields from page.tsx's initialState to GameSessionState
  const initialGameSessionData: GameSessionState = useMemo(() => ({
    teamName: initialState.teamName,
    opponentName: initialState.opponentName,
    gameDate: initialState.gameDate,
    homeScore: initialState.homeScore,
    awayScore: initialState.awayScore,
    gameNotes: initialState.gameNotes,
    homeOrAway: initialState.homeOrAway,
    numberOfPeriods: initialState.numberOfPeriods,
    periodDurationMinutes: initialState.periodDurationMinutes,
    currentPeriod: initialState.currentPeriod,
    gameStatus: initialState.gameStatus,
    demandFactor: initialState.demandFactor ?? 1,
    selectedPlayerIds: initialState.selectedPlayerIds,
    seasonId: initialState.seasonId,
    tournamentId: initialState.tournamentId,
    ageGroup: initialState.ageGroup,
    tournamentLevel: initialState.tournamentLevel,
    gameLocation: initialState.gameLocation,
    gameTime: initialState.gameTime,
    gameEvents: initialState.gameEvents,
    timeElapsedInSeconds: 0, // Initial timer state should be 0
    isTimerRunning: false,    // Initial timer state
    subIntervalMinutes: initialState.subIntervalMinutes ?? 5,
    nextSubDueTimeSeconds: (initialState.subIntervalMinutes ?? 5) * 60,
    subAlertLevel: 'none',
    lastSubConfirmationTimeSeconds: 0,
    completedIntervalDurations: initialState.completedIntervalDurations || [],
    showPlayerNames: initialState.showPlayerNames,
    startTimestamp: null,
  }), []);

  const [gameSessionState, dispatchGameSession] = useReducer(gameSessionReducer, initialGameSessionData);



  // --- History Management ---
  const {
    state: currentHistoryState,
    set: pushHistoryState,
    reset: resetHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useUndoRedo<AppState>(initialState);

  const saveStateToHistory = useCallback((newState: Partial<AppState>) => {
    if (!currentHistoryState) return; // Should not happen

    // If newState includes seasonId, ensure tournamentId is cleared if seasonId is truthy
    // This mirrors the reducer logic for SET_SEASON_ID.
    // Similarly, if newState includes tournamentId, ensure seasonId is cleared if tournamentId is truthy.
    const adjustedNewState: Partial<AppState> = {
      ...newState,
      ...(newState.seasonId && newState.tournamentId === undefined
        ? { tournamentId: '' }
        : {}),
      ...(newState.tournamentId && newState.seasonId === undefined
        ? { seasonId: '' }
        : {}),
    };

    const nextState: AppState = { ...currentHistoryState, ...adjustedNewState };

    if (JSON.stringify(nextState) === JSON.stringify(currentHistoryState)) {
      return; // Don't save if nothing changed
    }

    pushHistoryState(nextState);

  }, [currentHistoryState, pushHistoryState]);

  // --- Effect to save gameSessionState changes to history ---
  useEffect(() => {
    // This effect runs after gameSessionState has been updated by the reducer.
    // It constructs the relevant slice of AppState from the new gameSessionState
    // and saves it to the history.
    const gameSessionHistorySlice: Partial<AppState> = {
      teamName: gameSessionState.teamName,
      opponentName: gameSessionState.opponentName,
      gameDate: gameSessionState.gameDate,
      homeScore: gameSessionState.homeScore,
      awayScore: gameSessionState.awayScore,
      gameNotes: gameSessionState.gameNotes,
      homeOrAway: gameSessionState.homeOrAway,
      numberOfPeriods: gameSessionState.numberOfPeriods,
      periodDurationMinutes: gameSessionState.periodDurationMinutes,
      currentPeriod: gameSessionState.currentPeriod,
      gameStatus: gameSessionState.gameStatus,
      selectedPlayerIds: gameSessionState.selectedPlayerIds,
      seasonId: gameSessionState.seasonId,
      tournamentId: gameSessionState.tournamentId,
      gameLocation: gameSessionState.gameLocation,
      gameTime: gameSessionState.gameTime,
      gameEvents: gameSessionState.gameEvents,
      subIntervalMinutes: gameSessionState.subIntervalMinutes,
      completedIntervalDurations: gameSessionState.completedIntervalDurations,
      lastSubConfirmationTimeSeconds: gameSessionState.lastSubConfirmationTimeSeconds,
      showPlayerNames: gameSessionState.showPlayerNames,
      // Ensure any other fields from GameSessionState that are part of AppState history are included
    };
    // saveStateToHistory will merge this with other non-gameSessionState parts of AppState
    // (like playersOnField, opponents, drawings) that are handled elsewhere.
    saveStateToHistory(gameSessionHistorySlice);
  }, [gameSessionState, saveStateToHistory]);
  // END --- Effect to save gameSessionState changes to history ---

  // --- Load game data via hook --- (moved below modal definitions)

  // --- Core Game State (Managed by Hook) ---
  const {
    playersOnField,
    opponents,
    drawings, // State from hook
    setPlayersOnField,
    setOpponents,
    setDrawings,
    setAvailablePlayers: setAvailablePlayersFromGameState,
    handlePlayerDrop,
    // Destructure drawing handlers from hook
    handleDrawingStart,
    handleDrawingAddPoint,
    handleDrawingEnd,
    handleClearDrawings,
    // Get opponent handlers from hook
    handleAddOpponent,
    handleOpponentMove,
    handleOpponentMoveEnd,
    handleOpponentRemove,
    // handleRenamePlayer, // This is the one from useGameState, will be passed to PlayerBar
    handleToggleGoalie,
  }: UseGameStateReturn = useGameState({
    initialState,
    saveStateToHistory,
    // masterRosterKey: MASTER_ROSTER_KEY, // Removed as no longer used by useGameState
  });

  // Keep a snapshot of the last non-empty field state to avoid accidental clears during sync
  const lastNonEmptyPlayersOnFieldRef = useRef<Player[]>([]);
  useEffect(() => {
    if (playersOnField && playersOnField.length > 0) {
      lastNonEmptyPlayersOnFieldRef.current = playersOnField;
    }
  }, [playersOnField]);

  // Debounce timer for roster→field sync
  const rosterFieldSyncTimerRef = useRef<number | null>(null);

  const handlePlayerIdUpdated = useCallback(
    (oldId: string, newId: string) => {
      setPlayersOnField(prev => prev.map(p => (p.id === oldId ? { ...p, id: newId } : p)));

      dispatchGameSession({
        type: 'SET_SELECTED_PLAYER_IDS',
        payload: gameSessionState.selectedPlayerIds.map(id => (id === oldId ? newId : id)),
      });

      gameSessionState.gameEvents.forEach(event => {
        if (event.type === 'goal') {
          // Goal events have scorerId (required) and assisterId (optional)
          if (event.scorerId === oldId || event.assisterId === oldId) {
            const updatedEvent = {
              ...event,
              scorerId: event.scorerId === oldId ? newId : event.scorerId,
              assisterId: event.assisterId === oldId ? newId : event.assisterId,
            };
            dispatchGameSession({ type: 'UPDATE_GAME_EVENT', payload: updatedEvent });
          }
        }
      });
    },
    [setPlayersOnField, dispatchGameSession, gameSessionState.selectedPlayerIds, gameSessionState.gameEvents]
  );

  const roster = useRoster({
    initialPlayers: initialState.availablePlayers,
    selectedPlayerIds: gameSessionState.selectedPlayerIds,
    onPlayerIdUpdated: handlePlayerIdUpdated,
    onFieldPlayersUpdate: setPlayersOnField,
  });
  const {
    availablePlayers,
    setAvailablePlayers,
    highlightRosterButton,
    setHighlightRosterButton,
    isRosterUpdating,
    rosterError,
    playersForCurrentGame,
  } = roster;

  // Sync roster availablePlayers with useGameState availablePlayers
  useEffect(() => {
    if (availablePlayers && availablePlayers.length > 0) {
      setAvailablePlayersFromGameState(availablePlayers);
    }
  }, [availablePlayers, setAvailablePlayersFromGameState]);

  // --- State Management (Remaining in Home component) ---
  // const [showPlayerNames, setShowPlayerNames] = useState<boolean>(initialState.showPlayerNames); // REMOVE - Migrated to gameSessionState
  // const [gameEvents, setGameEvents] = useState<GameEvent[]>(initialState.gameEvents); // REMOVE - Migrated to gameSessionState
  // const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialState.selectedPlayerIds); // REMOVE - Migrated to gameSessionState
  // const [seasonId, setSeasonId] = useState<string>(initialState.seasonId); // REMOVE - Migrate to gameSessionState
  // const [tournamentId, setTournamentId] = useState<string>(initialState.tournamentId); // REMOVE - Migrate to gameSessionState
  // Add state for location and time
  // const [gameLocation, setGameLocation] = useState<string>(initialState.gameLocation || ''); // REMOVE - Migrate to gameSessionState
  // const [gameTime, setGameTime] = useState<string>(initialState.gameTime || ''); // REMOVE - Migrate to gameSessionState
  // ... Timer state ...
  // ... Modal states ...
  // ... UI/Interaction states ...
  // Persistence state
  const [savedGames, setSavedGames] = useState<SavedGamesCollection>({});
  const [currentGameId, setCurrentGameId] = useState<string | null>(DEFAULT_GAME_ID);
  const [isPlayed, setIsPlayed] = useState<boolean>(true);
  // Cache seasons/tournaments for modals to avoid re-fetch cost on first open
  const [_prefetchedSeasons, setPrefetchedSeasons] = useState<Season[] | null>(null);
  const [_prefetchedTournaments, setPrefetchedTournaments] = useState<Tournament[] | null>(null);

  // This ref needs to be declared after currentGameId
  const gameIdRef = useRef(currentGameId);

  useEffect(() => { gameIdRef.current = currentGameId; }, [currentGameId]);


  const {
    timeElapsedInSeconds,
    isTimerRunning,
    subAlertLevel,
    lastSubConfirmationTimeSeconds,
    startPause: handleStartPauseTimer,
    reset: handleResetTimer,
    ackSubstitution: handleSubstitutionMade,
    setSubInterval: handleSetSubInterval,
  } = useOfflineFirstGameTimer({ state: gameSessionState, dispatch: dispatchGameSession, currentGameId: currentGameId || '' });

  // ADD State for seasons/tournaments lists
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  // <<< ADD: State for home/away status >>>
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [hasSkippedInitialSetup, setHasSkippedInitialSetup] = useState<boolean>(skipInitialSetup);

  useAutoBackup();
  const { showToast } = useToast();


  // Use Zustand-based modal states
  const gameSettingsModal = useGameSettingsModalWithHandlers();
  const gameStatsModal = useGameStatsModalWithHandlers();
  const rosterSettingsModal = useRosterSettingsModalWithHandlers();
  const loadGameModal = useLoadGameModalWithHandlers();
  const newGameSetupModal = useNewGameSetupModalWithHandlers();
  const seasonTournamentModal = useSeasonTournamentModalWithHandlers();
  const trainingResourcesModal = useTrainingResourcesModalWithHandlers();
  const goalLogModal = useGoalLogModalWithHandlers();
  const settingsModal = useSettingsModalWithHandlers();
  const playerAssessmentModal = usePlayerAssessmentModalWithHandlers();

  // --- Load game data via hook ---
  const {
    masterRoster: masterRosterQueryResultData,
    seasons: seasonsQueryResultData,
    tournaments: tournamentsQueryResultData,
    savedGames: allSavedGamesQueryResultData,
    currentGameId: currentGameIdSettingQueryResultData,
    loading: isGameDataLoading,
    error: gameDataError,
  } = useGameDataQueries({
    pauseRefetch: loadGameModal.isOpen || newGameSetupModal.isOpen // Pause refetch when modals are open
  });

  // Pre-warm game creation data after auth
  const gameCreationData = useGameCreationData({
    pauseRefetch: newGameSetupModal.isOpen
  });

  // Pre-warm roster data after auth
  const _rosterData = useRosterData({
    pauseRefetch: rosterSettingsModal.isOpen
  });

  // Pre-warm saved games data after auth
  const savedGamesData = useSavedGamesData({
    pauseRefetch: loadGameModal.isOpen
  });

  const isMasterRosterQueryLoading = isGameDataLoading;
  const areSeasonsQueryLoading = isGameDataLoading;
  const areTournamentsQueryLoading = isGameDataLoading;
  const isAllSavedGamesQueryLoading = isGameDataLoading;
  const isCurrentGameIdSettingQueryLoading = isGameDataLoading;

  const isMasterRosterQueryError = !!gameDataError;
  const isSeasonsQueryError = !!gameDataError;
  const isTournamentsQueryError = !!gameDataError;
  const isAllSavedGamesQueryError = !!gameDataError;
  const masterRosterQueryErrorData = gameDataError;
  const seasonsQueryErrorData = gameDataError;
  const tournamentsQueryErrorData = gameDataError;
  const allSavedGamesQueryErrorData = gameDataError;

  const {
    playerAssessments,
    handleRenamePlayerForModal,
    handleSetJerseyNumberForModal,
    handleSetPlayerNotesForModal,
    handleRemovePlayerForModal,
    handleAddPlayerForModal,
    handleTogglePlayerSelection,
    handleUpdateSelectedPlayers,
    handleSavePlayerAssessment,
    handleDeletePlayerAssessment,
  } = usePlayerRosterManager({
    roster,
    masterRosterPlayers: masterRosterQueryResultData,
    selectedPlayerIds: gameSessionState.selectedPlayerIds,
    dispatchGameSession,
    currentGameId,
    completedIntervals: gameSessionState.completedIntervalDurations || [],
    setSavedGames,
  });

  // All modal states now migrated to Zustand!
  // Removed - now handled by useGameDataManager:
  // const { showToast } = useToast();
  // const [isPlayerStatsModalOpen, setIsPlayerStatsModalOpen] = useState(false);
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<Player | null>(null);

  // --- Timer State (Still needed here) ---
  const [showLargeTimerOverlay, setShowLargeTimerOverlay] = useState<boolean>(false); // State for overlay visibility
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState<boolean>(false);

  // Helper function to validate new game creation
  const validateNewGameCreation = useCallback((): boolean => {
    // If no detection data available, allow creation (fallback behavior)
    if (!appStateDetection) return true;
    
    // Check if user has players
    if (!appStateDetection.hasPlayers) {
      const shouldOpenRoster = window.confirm(
        t('controlBar.noPlayersForNewGame', 
          'You need at least one player in your roster to create a game. Would you like to add players now?')
      );
      
      if (shouldOpenRoster) {
        rosterSettingsModal.open();
      }
      return false; // Block game creation
    }
    
    return true; // Allow game creation
  }, [appStateDetection, t, rosterSettingsModal]);

  const hasHandledInitialActionRef = useRef(false);
  useEffect(() => {
    if (!initialAction || hasHandledInitialActionRef.current) return;
    hasHandledInitialActionRef.current = true;
    switch (initialAction) {
      case 'newGame':
        if (validateNewGameCreation()) {
          newGameSetupModal.open();
        }
        break;
      case 'loadGame':
        loadGameModal.open();
        break;
      case 'resumeGame':
        // Resume game is handled by the initialization effect
        // which automatically loads the most recent game
        break;
      case 'season':
        seasonTournamentModal.open();
        break;
      case 'stats':
        gameStatsModal.open();
        break;
      default:
        break;
    }
  }, [
    initialAction,
    newGameSetupModal,
    loadGameModal,
    seasonTournamentModal,
    gameStatsModal
  ]);

  // --- Modal States handled via context ---

  // <<< ADD State to hold player IDs for the next new game >>>
  const [playerIdsForNewGame, setPlayerIdsForNewGame] = useState<string[] | null>(null);
  const [newGameDemandFactor, setNewGameDemandFactor] = useState(1);
  const [isCreatingNewGame, setIsCreatingNewGame] = useState<boolean>(false);
  const wasCreatingNewGameRef = useRef(false);
  // <<< ADD State for the roster prompt toast >>>
  // const [showRosterPrompt, setShowRosterPrompt] = useState<boolean>(false);

  // State for game saving error (loading state is from saveGameMutation.isLoading)

  // NEW: States for LoadGameModal operations
  const [isLoadingGamesList, setIsLoadingGamesList] = useState(false);
  const [loadGamesListError, setLoadGamesListError] = useState<string | null>(null);
  const [isGameLoading, setIsGameLoading] = useState(false); // For loading a specific game
  const [gameLoadError, setGameLoadError] = useState<string | null>(null);
  // Removed: isStateSynchronizing - no longer using synchronization locks for better performance

  // Note: Removed synchronization hooks as they caused performance bottlenecks
  // Synchronization removed for better performance

  // Removed - now handled by useGameDataManager:
  // const [isGameDeleting, setIsGameDeleting] = useState(false); // For deleting a specific game
  // const [gameDeleteError, setGameDeleteError] = useState<string | null>(null);
  // Game-specific loading states instead of single processing game ID
  const [gameLoadingStates, setGameLoadingStates] = useState<Record<string, { loading: boolean; error: string | null }>>({});
  // PHASE 2: Progressive rendering state - show skeleton during game transitions
  const [showGameSkeleton, setShowGameSkeleton] = useState(false);
  const {
    isTacticsBoardView,
    tacticalDiscs,
    setTacticalDiscs,
    tacticalDrawings,
    setTacticalDrawings,
    tacticalBallPosition,
    setTacticalBallPosition,
    handleToggleTacticsBoard,
    handleAddTacticalDisc,
    handleTacticalDiscMove,
    handleTacticalDiscRemove,
    handleToggleTacticalDiscType,
    handleTacticalBallMove,
    handleTacticalDrawingStart,
    handleTacticalDrawingAddPoint,
    handleTacticalDrawingEnd,
    clearTacticalElements,
  } = useTacticalBoard({
    initialDiscs: initialState.tacticalDiscs,
    initialDrawings: initialState.tacticalDrawings,
    initialBallPosition: initialState.tacticalBallPosition,
    saveStateToHistory,
  });

  // --- Data Management (Extracted to useGameDataManager hook) ---
  const {
    mutations: {
      addSeasonMutation,
      updateSeasonMutation,
      deleteSeasonMutation,
      addTournamentMutation,
      updateTournamentMutation,
      deleteTournamentMutation,
      updateGameDetailsMutation,
    },
    handlers: {
      handleQuickSaveGame,
      handleDeleteGame,
      handleExportOneJson: handleExportOneJsonRaw,
      handleExportOneCsv: handleExportOneCsvRaw,
    },
  } = useGameDataManager({
    currentGameId,
    savedGames,
    setSavedGames,
    setCurrentGameId,
    gameSessionState,
    availablePlayers,
    playersOnField,
    opponents,
    drawings,
    tacticalDiscs,
    tacticalDrawings,
    tacticalBallPosition,
  });

  useEffect(() => {
    if (wasCreatingNewGameRef.current && !isCreatingNewGame && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      Promise.resolve().then(() => handleQuickSaveGame(currentGameId));
    }
    wasCreatingNewGameRef.current = isCreatingNewGame;
  }, [isCreatingNewGame, currentGameId, handleQuickSaveGame]);

  // --- Game State Management (Extracted to useGameStateManager hook) ---
  const {
    handleTeamNameChange,
    handleOpponentNameChange,
    handleGameDateChange,
    handleGameLocationChange,
    handleGameTimeChange,
    handleSetNumberOfPeriods,
    handleSetPeriodDuration,
    handleSetDemandFactor,
    handleSetHomeOrAway,
    handleSetSeasonId,
    handleSetTournamentId,
    handleSetAgeGroup,
    handleSetTournamentLevel,
    applyHistoryState,
  } = useGameStateManager({
    dispatchGameSession,
    initialGameSessionData,
    setPlayersOnField,
    setOpponents,
    setDrawings,
    setIsPlayed,
  });

  const {
    states: { draggingPlayerFromBarInfo },
    handlers: {
      handleDropOnField,
      handlePlayerMove,
      handlePlayerMoveEnd,
      handlePlayerRemove,
      handlePlayerDragStartFromBar,
      handlePlayerTapInBar,
      handlePlayerDropViaTouch,
      handlePlayerDragCancelViaTouch,
      handlePlaceAllPlayers,
      handleResetField,
      handleClearDrawingsForView,
    },
    setDraggingPlayerFromBarInfo,
  } = usePlayerFieldManager({
    playersOnField,
    setPlayersOnField,
    setOpponents,
    setDrawings,
    setTacticalDrawings,
    availablePlayers,
    selectedPlayerIds: gameSessionState.selectedPlayerIds,
    handlePlayerDrop,
    saveStateToHistory,
    handleClearDrawings,
    clearTacticalElements,
    isTacticsBoardView,
  });

  // --- Game Events Manager ---
  const {
    handleAddGoalEvent,
    handleLogOpponentGoal,
    handleUpdateGameEvent,
    handleDeleteGameEvent,
    handleAwardFairPlayCard,
  } = useGameEventsManager({
    dispatchGameSession,
    gameSessionState,
    availablePlayers,
    setAvailablePlayers,
    playersOnField,
    setPlayersOnField,
    masterRosterQueryResultData,
    currentGameId,
    saveStateToHistory,
    setIsGoalLogModalOpen: (open: boolean) => open ? goalLogModal.open() : goalLogModal.close()
  });

  // --- App Settings Manager ---
  const {
    appLanguage,
    defaultTeamNameSetting,
    setDefaultTeamNameSetting,
    handleShowAppGuide,
    handleHardResetApp,
    handleLanguageChange,
    handleDefaultTeamNameChange,
  } = useAppSettingsManager({
    setIsSettingsModalOpen: settingsModal.open,
    setIsInstructionsModalOpen,
  });

  // --- Settings Initialization Effects ---
  // Combine both effects and use a single ref to track initialization
  const settingsInitializedRef = useRef(false);

  useEffect(() => {
    if (!settingsInitializedRef.current) {
      settingsInitializedRef.current = true;

      // Load last home team name
      utilGetLastHomeTeamName().then((name) => setDefaultTeamNameSetting(name));
    }
  }, [
    setDefaultTeamNameSetting
  ]);

  // --- Export Wrapper Functions ---
  const handleExportOneJsonWrapper = useCallback((gameId: string) => {
    handleExportOneJsonRaw(gameId, seasons, tournaments);
  }, [handleExportOneJsonRaw, seasons, tournaments]);

  const handleExportOneCsvWrapper = useCallback((gameId: string) => {
    handleExportOneCsvRaw(gameId, availablePlayers, seasons, tournaments);
  }, [handleExportOneCsvRaw, availablePlayers, seasons, tournaments]);
  // Use a ref to track the last synced data to prevent loops
  const lastSyncedRosterRef = useRef<string>('');

  // Memoized roster data key for performance optimization
  const rosterDataKey = useMemo(() => {
    if (!masterRosterQueryResultData || isMasterRosterQueryLoading) return null;
    return JSON.stringify(masterRosterQueryResultData.map(p => ({ id: p.id, name: p.name })));
  }, [masterRosterQueryResultData, isMasterRosterQueryLoading]);

  // Memoized sorted games for performance optimization
  const sortedGamesByDate = useMemo(() => {
    const currentSavedGames = allSavedGamesQueryResultData || {};
    const gameIds = Object.keys(currentSavedGames);

    if (gameIds.length === 0) return [];

    return gameIds
      .map(id => ({ id, game: currentSavedGames[id] }))
      .filter(({ game }) => game && typeof game.gameDate === 'string' && game.gameDate.trim().length > 0)
      .sort((a, b) => {
        const aDateStr = `${a.game.gameDate} ${a.game.gameTime || '00:00'}`.trim();
        const bDateStr = `${b.game.gameDate} ${b.game.gameTime || '00:00'}`.trim();
        const dateA = Number.isFinite(Date.parse(aDateStr)) ? new Date(aDateStr) : new Date(a.game.gameDate);
        const dateB = Number.isFinite(Date.parse(bDateStr)) ? new Date(bDateStr) : new Date(b.game.gameDate);
        const aTime = Number.isFinite(dateA.getTime()) ? dateA.getTime() : 0;
        const bTime = Number.isFinite(dateB.getTime()) ? dateB.getTime() : 0;
        return bTime - aTime;
      });
  }, [allSavedGamesQueryResultData]);

  useEffect(() => {
    if (isMasterRosterQueryLoading) {
      logger.debug('[TanStack Query] Master Roster is loading...');
    }
    if (masterRosterQueryResultData && !isMasterRosterQueryLoading && rosterDataKey) {
      // Only update if this is different from what we last synced
      if (rosterDataKey !== lastSyncedRosterRef.current) {
        lastSyncedRosterRef.current = rosterDataKey;
        logger.debug('[HomePage] Syncing roster from React Query:', masterRosterQueryResultData.length, 'players');
        setAvailablePlayers(masterRosterQueryResultData);
      }
    }
    if (isMasterRosterQueryError) {
      logger.error('[TanStack Query] Error loading master roster:', masterRosterQueryErrorData);
      setAvailablePlayers([]);
    }
  }, [masterRosterQueryResultData, isMasterRosterQueryLoading, isMasterRosterQueryError, masterRosterQueryErrorData, setAvailablePlayers, rosterDataKey]);

  // --- Effect to update seasons from useQuery ---
  useEffect(() => {
    if (areSeasonsQueryLoading) {
      logger.debug('[TanStack Query] Seasons are loading...');
    }
    if (seasonsQueryResultData) {
      setSeasons(Array.isArray(seasonsQueryResultData) ? seasonsQueryResultData : []);
    }
    if (isSeasonsQueryError) {
      logger.error('[TanStack Query] Error loading seasons:', seasonsQueryErrorData);
      setSeasons([]);
    }
  }, [seasonsQueryResultData, areSeasonsQueryLoading, isSeasonsQueryError, seasonsQueryErrorData]);

  // --- Effect to update tournaments from useQuery ---
  useEffect(() => {
    if (areTournamentsQueryLoading) {
      logger.debug('[TanStack Query] Tournaments are loading...');
    }
    if (tournamentsQueryResultData) {
      setTournaments(Array.isArray(tournamentsQueryResultData) ? tournamentsQueryResultData : []);
    }
    if (isTournamentsQueryError) {
      logger.error('[TanStack Query] Error loading tournaments:', tournamentsQueryErrorData);
      setTournaments([]);
    }
  }, [tournamentsQueryResultData, areTournamentsQueryLoading, isTournamentsQueryError, tournamentsQueryErrorData]);

  // --- Effect to sync playersOnField details with availablePlayers changes ---
  useEffect(() => {
    if (!availablePlayers || availablePlayers.length === 0) return;

    // Debounce to end-of-tick so optimistic updates settle first
    if (rosterFieldSyncTimerRef.current) {
      window.clearTimeout(rosterFieldSyncTimerRef.current);
      rosterFieldSyncTimerRef.current = null;
    }
    rosterFieldSyncTimerRef.current = window.setTimeout(() => {
      setPlayersOnField(prevPlayersOnField => {
        // REMOVED: "last non-empty" fallback that caused formation reversion
        if (!prevPlayersOnField || prevPlayersOnField.length === 0) {
          return prevPlayersOnField; // Don't restore old formations
        }

        // Only sync if all field players exist in roster (avoid structural changes during place-all)
        const allPresent = prevPlayersOnField.every(fp => availablePlayers.some(ap => ap.id === fp.id));
        if (!allPresent) return prevPlayersOnField;

        let didChange = false;
        const nextPlayersOnField = prevPlayersOnField.map(fieldPlayer => {
          const rosterPlayer = availablePlayers.find(ap => ap.id === fieldPlayer.id);
          if (!rosterPlayer) return fieldPlayer;

          const needsUpdate = (
            fieldPlayer.name !== rosterPlayer.name ||
            fieldPlayer.jerseyNumber !== rosterPlayer.jerseyNumber ||
            // REMOVED: isGoalie sync - field is authoritative for goalie status
            fieldPlayer.nickname !== rosterPlayer.nickname ||
            fieldPlayer.notes !== rosterPlayer.notes ||
            (rosterPlayer.receivedFairPlayCard !== undefined && fieldPlayer.receivedFairPlayCard !== rosterPlayer.receivedFairPlayCard)
          );

          if (!needsUpdate) return fieldPlayer;
          didChange = true;
          return {
            ...fieldPlayer, // Preserve relX/relY AND isGoalie (field is authoritative)
            name: rosterPlayer.name,
            jerseyNumber: rosterPlayer.jerseyNumber,
            // REMOVED: isGoalie writeback - field keeps its authoritative goalie status
            nickname: rosterPlayer.nickname,
            notes: rosterPlayer.notes,
            receivedFairPlayCard: rosterPlayer.receivedFairPlayCard !== undefined ? rosterPlayer.receivedFairPlayCard : fieldPlayer.receivedFairPlayCard,
          };
        });

        return didChange ? nextPlayersOnField : prevPlayersOnField;
      });
    }, 0);

    return () => {
      if (rosterFieldSyncTimerRef.current) {
        window.clearTimeout(rosterFieldSyncTimerRef.current);
        rosterFieldSyncTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePlayers]);
  // Note: We don't want setPlayersOnField in deps if it causes loops.
  // saveStateToHistory is also a dependency as it's used inside.

  // One-time migration effect - only runs once
  // Data migration is now handled by offline-first storage system

  // Handle saved games loading state
  useEffect(() => {
    if (isAllSavedGamesQueryLoading) {
      logger.debug('[EFFECT savedGames] Setting games list loading to true');
      setIsLoadingGamesList(true);
    }
  }, [isAllSavedGamesQueryLoading]);

  // Handle saved games data updates
  useEffect(() => {
    if (allSavedGamesQueryResultData) {
      logger.debug('[HomePage] Received saved games data:', Object.keys(allSavedGamesQueryResultData).length, 'games');
      setSavedGames(allSavedGamesQueryResultData || {});
      setIsLoadingGamesList(false);
    }
  }, [allSavedGamesQueryResultData]);

  // Handle saved games errors
  useEffect(() => {
    if (isAllSavedGamesQueryError) {
      logger.error('[EFFECT savedGames] Error loading saved games:', allSavedGamesQueryErrorData);
      logger.error('[HomePage] Error loading games:', allSavedGamesQueryErrorData);
      setLoadGamesListError(t('loadGameModal.errors.listLoadFailed', 'Failed to load saved games list.'));
      setSavedGames({});
      setIsLoadingGamesList(false);
    }
  }, [isAllSavedGamesQueryError, allSavedGamesQueryErrorData, t]);

  // Main initialization effect - runs once when all loading states become false
  useEffect(() => {
    const initializeApp = async () => {
      if (initialLoadComplete) {
        return;
      }

      // Wait for all queries to complete
      const allQueriesComplete = !isMasterRosterQueryLoading &&
        !areSeasonsQueryLoading &&
        !areTournamentsQueryLoading &&
        !isAllSavedGamesQueryLoading &&
        !isCurrentGameIdSettingQueryLoading;

      if (!allQueriesComplete) {
        return;
      }

      logger.debug('[EFFECT init] All queries complete, initializing app...');

      // Set current game ID based on saved settings
      const lastGameIdSetting = currentGameIdSettingQueryResultData;
      const currentSavedGames = allSavedGamesQueryResultData || {};

      if (lastGameIdSetting && lastGameIdSetting !== DEFAULT_GAME_ID && currentSavedGames[lastGameIdSetting]) {
        logger.debug(`[EFFECT init] Restoring last saved game: ${lastGameIdSetting}`);
        setCurrentGameId(lastGameIdSetting);
        setHasSkippedInitialSetup(true);
      } else {
        // If the saved game ID doesn't exist, try to find the most recent game
        if (sortedGamesByDate.length > 0) {
          const mostRecentId = sortedGamesByDate[0].id;
          logger.debug(`[EFFECT init] Found most recent game to restore: ${mostRecentId}`);
          setCurrentGameId(mostRecentId);
          setHasSkippedInitialSetup(true);
        } else {
          if (lastGameIdSetting && lastGameIdSetting !== DEFAULT_GAME_ID) {
            logger.warn(`[EFFECT init] Last game ID ${lastGameIdSetting} not found in saved games. Loading default.`);
          }
          setCurrentGameId(DEFAULT_GAME_ID);
        }
      }

      // Timer restoration is now handled by useOfflineFirstGameTimer hook

      // App guide/tutorial popup has been disabled per user request

      setInitialLoadComplete(true);
      logger.debug('[EFFECT init] Initial application data coordination complete.');
    };

    initializeApp();
  }, [
    isMasterRosterQueryLoading,
    areSeasonsQueryLoading,
    areTournamentsQueryLoading,
    isAllSavedGamesQueryLoading,
    isCurrentGameIdSettingQueryLoading,
    initialLoadComplete,
    allSavedGamesQueryResultData,
    currentGameIdSettingQueryResultData,
    sortedGamesByDate
  ]);

  // Prefetch seasons/tournaments once after initial render to warm caches for modals
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, t] = await Promise.all([
          utilGetSeasons().catch(() => []),
          utilGetTournaments().catch(() => []),
        ]);
        if (!cancelled) {
          setPrefetchedSeasons(Array.isArray(s) ? s : []);
          setPrefetchedTournaments(Array.isArray(t) ? t : []);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []); // Only run once on mount

  // Add a timeout for mobile loading issues
  useEffect(() => {
    if (isLoadingGamesList) {
      const timeout = setTimeout(() => {
        logger.error('[HomePage] Loading games timeout - forcing completion');
        setIsLoadingGamesList(false);
        setLoadGamesListError('Loading timed out. Please try again.');
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoadingGamesList]);

  // --- NEW: Robust Visibility Change Handling ---
  // --- Wake Lock Effect ---
  useEffect(() => {
    // This effect is now replaced by the direct call in the main timer effect
    // to avoid race conditions.
  }, []);

  // AbortController ref for canceling in-flight load operations
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup AbortController, loading registry, and operation queue on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      // PHASE 2: Clear all loading timeouts to prevent memory leaks
      loadingRegistry.clearAll();
      // PHASE 3: Clear operation queue to prevent memory leaks
      operationQueue.clear();
    };
  }, []);

  // Helper function to load game state from game data with optimistic updates
  const loadGameStateFromData = useCallback(async (gameData: AppState | null, isInitialDefaultLoad = false, signal?: AbortSignal) => {
    // Direct async loading without synchronization locks

    // Check if operation was cancelled
    if (signal?.aborted) {
      return;
    }

    // Use startTransition to batch all state updates together to prevent UI inconsistencies
    startTransition(() => {
      if (gameData) {
        // gameData is AppState, map its fields directly to GameSessionState partial payload
        const payload: Partial<GameSessionState> = {
          teamName: gameData.teamName,
          opponentName: gameData.opponentName,
          gameDate: gameData.gameDate,
          homeScore: gameData.homeScore,
          awayScore: gameData.awayScore,
          gameNotes: gameData.gameNotes,
          homeOrAway: gameData.homeOrAway,
          numberOfPeriods: gameData.numberOfPeriods,
          periodDurationMinutes: gameData.periodDurationMinutes,
          currentPeriod: gameData.currentPeriod,
          gameStatus: gameData.gameStatus,
          selectedPlayerIds: gameData.selectedPlayerIds,
          seasonId: gameData.seasonId ?? undefined,
          tournamentId: gameData.tournamentId ?? undefined,
          gameLocation: gameData.gameLocation,
          gameTime: gameData.gameTime,
          demandFactor: gameData.demandFactor,
          gameEvents: gameData.gameEvents,
          subIntervalMinutes: gameData.subIntervalMinutes,
          completedIntervalDurations: gameData.completedIntervalDurations,
          lastSubConfirmationTimeSeconds: gameData.lastSubConfirmationTimeSeconds,
          showPlayerNames: gameData.showPlayerNames,
          timeElapsedInSeconds: gameData.timeElapsedInSeconds,
        };
        dispatchGameSession({ type: 'LOAD_PERSISTED_GAME_DATA', payload });
      } else {
        dispatchGameSession({ type: 'RESET_TO_INITIAL_STATE', payload: initialGameSessionData });
        setIsPlayed(true);
      }

      // PHASE 2: Batch all remaining state updates into a single React batch
      // Update non-reducer states (these will eventually be migrated or handled differently)
      // For fields not yet in gameSessionState but are in GameData, update their local states if needed.
      unstable_batchedUpdates(() => {
        setPlayersOnField(gameData?.playersOnField || (isInitialDefaultLoad ? initialState.playersOnField : []));
        setOpponents(gameData?.opponents || (isInitialDefaultLoad ? initialState.opponents : []));
        setDrawings(gameData?.drawings || (isInitialDefaultLoad ? initialState.drawings : []));
        // Safely call tactical setters with null checks
        if (setTacticalDiscs) {
          setTacticalDiscs(gameData?.tacticalDiscs || (isInitialDefaultLoad ? initialState.tacticalDiscs : []));
        }
        if (setTacticalDrawings) {
          setTacticalDrawings(gameData?.tacticalDrawings || (isInitialDefaultLoad ? initialState.tacticalDrawings : []));
        }
        if (setTacticalBallPosition) {
          setTacticalBallPosition(gameData?.tacticalBallPosition || { relX: 0.5, relY: 0.5 });
        }
        setIsPlayed(gameData?.isPlayed === false ? false : true);
      });
    });

    // Update gameEvents from gameData if present, otherwise from initial state if it's an initial default load
    // setGameEvents(gameData?.events || (isInitialDefaultLoad ? initialState.gameEvents : [])); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA in reducer

    // Update selectedPlayerIds, seasonId, tournamentId, gameLocation, gameTime from gameData
    // These are also part of gameSessionState now, but local states might still be used by some components directly.
    // Prefer sourcing from gameSessionState once components are updated.
    // setSelectedPlayerIds(gameData?.selectedPlayerIds || (isInitialDefaultLoad ? initialState.selectedPlayerIds : [])); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA
    // setSeasonId(gameData?.seasonId || (isInitialDefaultLoad ? initialState.seasonId : '')); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA
    // setTournamentId(gameData?.tournamentId || (isInitialDefaultLoad ? initialState.tournamentId : '')); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA
    // setShowPlayerNames(gameData?.showPlayerNames === undefined ? (isInitialDefaultLoad ? initialState.showPlayerNames : true) : gameData.showPlayerNames); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA in reducer


    // History state should be based on the new gameSessionState + other states
    // For simplicity, we'll form history state AFTER the reducer has processed the load.
    // This requires a slight delay or a way to access the state post-dispatch if saveStateToHistory is called immediately.
    // For now, let's assume gameSessionState is updated for the next render cycle.
    // A more robust way would be to have LOAD_PERSISTED_GAME_DATA return the new state or use a useEffect.

    // PHASE 4: Use Immer for efficient immutable state updates instead of full reconstruction
    const newGameSessionState = produce(initialGameSessionData, draft => {
      // Only update fields that have changed from the loaded game data
      if (gameData) {
        // Update only fields that exist in gameData and are different
        if (gameData.teamName !== undefined) draft.teamName = gameData.teamName;
        if (gameData.opponentName !== undefined) draft.opponentName = gameData.opponentName;
        if (gameData.gameDate !== undefined) draft.gameDate = gameData.gameDate;
        if (gameData.homeScore !== undefined) draft.homeScore = gameData.homeScore;
        if (gameData.awayScore !== undefined) draft.awayScore = gameData.awayScore;
        if (gameData.gameNotes !== undefined) draft.gameNotes = gameData.gameNotes;
        if (gameData.homeOrAway !== undefined) draft.homeOrAway = gameData.homeOrAway;
        if (gameData.numberOfPeriods !== undefined) draft.numberOfPeriods = gameData.numberOfPeriods;
        if (gameData.periodDurationMinutes !== undefined) draft.periodDurationMinutes = gameData.periodDurationMinutes;
        if (gameData.currentPeriod !== undefined) draft.currentPeriod = gameData.currentPeriod;
        if (gameData.gameStatus !== undefined) draft.gameStatus = gameData.gameStatus;
        if (gameData.seasonId !== undefined) draft.seasonId = gameData.seasonId;
        if (gameData.tournamentId !== undefined) draft.tournamentId = gameData.tournamentId;
        if (gameData.gameLocation !== undefined) draft.gameLocation = gameData.gameLocation;
        if (gameData.gameTime !== undefined) draft.gameTime = gameData.gameTime;
        if (gameData.demandFactor !== undefined) draft.demandFactor = gameData.demandFactor;
        if (gameData.subIntervalMinutes !== undefined) draft.subIntervalMinutes = gameData.subIntervalMinutes;
        if (gameData.completedIntervalDurations !== undefined) draft.completedIntervalDurations = gameData.completedIntervalDurations;
        if (gameData.lastSubConfirmationTimeSeconds !== undefined) draft.lastSubConfirmationTimeSeconds = gameData.lastSubConfirmationTimeSeconds;
        if (gameData.showPlayerNames !== undefined) draft.showPlayerNames = gameData.showPlayerNames;
        if (gameData.selectedPlayerIds !== undefined) draft.selectedPlayerIds = gameData.selectedPlayerIds;
        if (gameData.gameEvents !== undefined) draft.gameEvents = gameData.gameEvents;

      }
    });

    // Convert GameSessionState to AppState for history 
    const newHistoryState: AppState = {
      ...newGameSessionState,
      playersOnField: gameData?.playersOnField || initialState.playersOnField,
      opponents: gameData?.opponents || initialState.opponents,
      drawings: gameData?.drawings || initialState.drawings,
      tacticalDiscs: gameData?.tacticalDiscs || [],
      tacticalDrawings: gameData?.tacticalDrawings || [],
      tacticalBallPosition: gameData?.tacticalBallPosition || { relX: 0.5, relY: 0.5 },
      availablePlayers: masterRosterQueryResultData || availablePlayers,
    };

    resetHistory(newHistoryState);

    // Check for cancellation before final state update
    if (signal?.aborted) {
      return;
    }
  }, [
    availablePlayers,
    initialGameSessionData,
    masterRosterQueryResultData,
    resetHistory,
    setDrawings,
    setOpponents,
    setPlayersOnField,
    setTacticalBallPosition,
    setTacticalDiscs,
    setTacticalDrawings,
    dispatchGameSession
    // Removed setIsStateSynchronizing dependency
  ]);

  // --- Effect to load game state when currentGameId changes or savedGames updates ---
  useEffect(() => {
    if (!initialLoadComplete) {
      return;
    }

    let gameToLoad: AppState | null = null; // Ensure this is AppState
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID && savedGames[currentGameId]) {
      gameToLoad = savedGames[currentGameId] as AppState; // Cast to AppState
    } else {
    }
    loadGameStateFromData(gameToLoad).catch(error => {
      logger.error('[useEffect] Failed to load game state:', error);
    });

  }, [currentGameId, savedGames, initialLoadComplete, loadGameStateFromData]); // IMPORTANT: initialLoadComplete ensures this runs after master roster is loaded.

  // --- Auto-save state using offline-first storage ---
  const autosaveTimeoutRef = useRef<number | null>(null);
  const lastSaveContentHashRef = useRef<string>('');
  const saveLatencyHistoryRef = useRef<number[]>([]);
  const consecutiveFailuresRef = useRef<number>(0);
  const lastFailureTimeRef = useRef<number>(0);

  // Adaptive timeout calculation based on recent latency
  const getAdaptiveTimeout = useCallback(() => {
    const history = saveLatencyHistoryRef.current;
    if (history.length === 0) return 15000; // Default 15s - increased for reliability

    // Calculate P95 latency
    const sorted = [...history].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95Latency = sorted[p95Index] || sorted[sorted.length - 1];

    // Adaptive timeout: P95 × 4, clamped between 8s and 20s - more generous
    return Math.max(8000, Math.min(20000, p95Latency * 4));
  }, []);

  // Content-based deduplication
  const hashGameState = useCallback((state: {
    homeScore: number;
    awayScore: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gameEvents: any[];
    currentPeriod: number;
    gameStatus: string;
    gameNotes: string;
    selectedPlayerIds: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    playersOnField: any[];
  }) => {
    const criticalFields = {
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      // Expand tracked fields for game events so edits (e.g., scorer/assister) trigger saves
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gameEvents: state.gameEvents?.map((e: any) => ({
        id: e.id,
        type: e.type,
        time: e.time,
        scorerId: 'scorerId' in e ? e.scorerId : undefined,
        assisterId: 'assisterId' in e ? e.assisterId : undefined,
        playerId: 'playerId' in e ? e.playerId : undefined,
        team: 'team' in e ? e.team : undefined,
        period: 'period' in e ? e.period : undefined,
        note: 'note' in e ? e.note : undefined,
      })) || [],
      currentPeriod: state.currentPeriod,
      gameStatus: state.gameStatus,
      gameNotes: state.gameNotes,
      selectedPlayerIds: state.selectedPlayerIds || [],
      playersOnFieldCount: state.playersOnField?.length || 0
    };
    return JSON.stringify(criticalFields);
  }, []);

  // PHASE 3: Enhanced auto-save with operation queue and debouncing
  const scheduleAutosave = useCallback((fn: () => Promise<void>, critical = false) => {
    // Circuit breaker: If we have too many consecutive failures, back off
    const consecutiveFailures = consecutiveFailuresRef.current;
    const lastFailureTime = lastFailureTimeRef.current;
    const timeSinceLastFailure = Date.now() - lastFailureTime;

    if (consecutiveFailures >= 3 && timeSinceLastFailure < 30000) { // 30s cooldown after 3 failures
      console.debug('[AUTO-SAVE] Circuit breaker active - too many consecutive failures, skipping save');
      return;
    }

    const debounceTime = critical ? 500 : 5000; // Increased: 500ms for critical, 5s for normal

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    autosaveTimeoutRef.current = window.setTimeout(async () => {
      // Skip (but reschedule) auto-save if there are critical operations running (except for critical saves)
      const queueStats = operationQueue.getStats() as Record<string, number>;
      if (!critical && (queueStats.priority_1 > 0 || queueStats.running >= 1)) { // Reduced to 1 concurrent write
        console.debug('[AUTO-SAVE] Skipping auto-save due to queue congestion; rescheduling in 1000ms');
        // Re-schedule a retry to avoid dropping saves during busy periods
        autosaveTimeoutRef.current = window.setTimeout(() => {
          scheduleAutosave(fn, critical);
        }, 1000);
        return;
      }

      const startTime = Date.now();

      // Use operation queue with appropriate priority
      await operationQueue.add({
        id: `autosave_${currentGameId}_${Date.now()}`,
        name: critical ? 'Critical Auto-save Game' : 'Auto-save Game',
        priority: critical ? OperationPriority.HIGH : OperationPriority.MEDIUM,
        execute: async () => {
          try {
            const result = await fn();

            // Track success - reset failure counter
            consecutiveFailuresRef.current = 0;

            // Track latency for adaptive timeout
            const latency = Date.now() - startTime;
            saveLatencyHistoryRef.current.push(latency);
            // Keep only last 10 measurements
            if (saveLatencyHistoryRef.current.length > 10) {
              saveLatencyHistoryRef.current.shift();
            }

            console.debug(`[AUTO-SAVE] ✅ Success in ${latency}ms`);
            return result;
          } catch (error) {
            // Track failure
            consecutiveFailuresRef.current += 1;
            lastFailureTimeRef.current = Date.now();

            console.error(`[AUTO-SAVE] ❌ Failed (${consecutiveFailuresRef.current} consecutive):`, error);

            // Fallback: Save to localStorage as emergency backup
            if (critical && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
              try {
                const fallbackData = {
                  gameId: currentGameId,
                  timestamp: Date.now(),
                  gameState: {
                    homeScore: gameSessionState.homeScore,
                    awayScore: gameSessionState.awayScore,
                    currentPeriod: gameSessionState.currentPeriod,
                    gameStatus: gameSessionState.gameStatus,
                    gameEvents: gameSessionState.gameEvents,
                    timeElapsed: gameSessionState.timeElapsedInSeconds
                  }
                };
                localStorage.setItem(`fallback_save_${currentGameId}`, JSON.stringify(fallbackData));
                console.warn(`[AUTO-SAVE] 💾 Emergency fallback save to localStorage completed`);
              } catch (fallbackError) {
                console.error(`[AUTO-SAVE] ❌ Fallback save also failed:`, fallbackError);
              }
            }

            throw error;
          }
        },
        timeout: getAdaptiveTimeout(),
        maxRetries: critical ? 3 : 1, // More retries for critical saves
        retryCount: 0,
        createdAt: Date.now()
      });
    }, debounceTime);
  }, [currentGameId, getAdaptiveTimeout, gameSessionState.homeScore, gameSessionState.awayScore,
    gameSessionState.currentPeriod, gameSessionState.gameStatus, gameSessionState.gameEvents,
    gameSessionState.timeElapsedInSeconds]);

  // Extract complex expression for useEffect dependency array
  const playersOnFieldCount = playersOnField?.length || 0;

  useEffect(() => {
    // Skip autosave during new game creation
    if (isCreatingNewGame) return;

    if (initialLoadComplete && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      // Create current game state snapshot for deduplication
      const currentGameSnapshot = {
        homeScore: gameSessionState.homeScore,
        awayScore: gameSessionState.awayScore,
        gameEvents: gameSessionState.gameEvents,
        currentPeriod: gameSessionState.currentPeriod,
        gameStatus: gameSessionState.gameStatus,
        gameNotes: gameSessionState.gameNotes,
        selectedPlayerIds: gameSessionState.selectedPlayerIds,
        playersOnField,
      };

      const currentContentHash = hashGameState(currentGameSnapshot);

      // Skip save if content hasn't changed
      if (currentContentHash === lastSaveContentHashRef.current) {
        console.debug('[AUTO-SAVE] Skipping save - content unchanged');
        return;
      }

      scheduleAutosave(async () => {
        try {
          // Update hash before save attempt
          lastSaveContentHashRef.current = currentContentHash;

          const assistEvents = gameSessionState.gameEvents.filter(event => event.type === 'goal' && 'assisterId' in event && event.assisterId);
          logger.log(`[AUTO-SAVE] Starting auto-save for game ${currentGameId}`);
          if (assistEvents.length > 0) {
            logger.log(`[AUTO-SAVE] Assist events details:`, assistEvents.map(e => ({ id: e.id, type: e.type })));
          }
          const currentSnapshot: AppState = {
            teamName: gameSessionState.teamName,
            opponentName: gameSessionState.opponentName,
            gameDate: gameSessionState.gameDate,
            homeScore: gameSessionState.homeScore,
            awayScore: gameSessionState.awayScore,
            gameNotes: gameSessionState.gameNotes,
            homeOrAway: gameSessionState.homeOrAway,
            isPlayed,
            numberOfPeriods: gameSessionState.numberOfPeriods,
            periodDurationMinutes: gameSessionState.periodDurationMinutes,
            currentPeriod: gameSessionState.currentPeriod,
            gameStatus: gameSessionState.gameStatus,
            seasonId: gameSessionState.seasonId,
            tournamentId: gameSessionState.tournamentId,
            gameLocation: gameSessionState.gameLocation,
            gameTime: gameSessionState.gameTime,
            demandFactor: gameSessionState.demandFactor,
            subIntervalMinutes: gameSessionState.subIntervalMinutes,
            completedIntervalDurations: gameSessionState.completedIntervalDurations,
            lastSubConfirmationTimeSeconds: gameSessionState.lastSubConfirmationTimeSeconds,
            showPlayerNames: gameSessionState.showPlayerNames,
            selectedPlayerIds: gameSessionState.selectedPlayerIds,
            timeElapsedInSeconds: gameSessionState.timeElapsedInSeconds,
            gameEvents: gameSessionState.gameEvents,
            assessments: playerAssessments,
            playersOnField,
            opponents,
            drawings,
            tacticalDiscs,
            tacticalDrawings,
            tacticalBallPosition,
            availablePlayers: masterRosterQueryResultData || availablePlayers,
          };

          const savedResult = await utilSaveGame(currentGameId, currentSnapshot as AppState);
          const newGameId = (savedResult as AppState & { id?: string }).id;
          if (newGameId && newGameId !== currentGameId) {
            setCurrentGameId(newGameId);
            await utilSaveCurrentGameIdSetting(newGameId);
          } else {
            await utilSaveCurrentGameIdSetting(currentGameId);
          }

          // Ensure saved games list reflects latest state for cards without requiring manual quick save
          try {
            // Optimistically update local savedGames fallback state
            const idToUpdate = newGameId || currentGameId;
            if (idToUpdate) {
              setSavedGames(prev => ({
                ...prev,
                [idToUpdate]: {
                  ...(prev[idToUpdate] || {}),
                  ...currentSnapshot,
                },
              }));
            }
            // Trigger saved games refetch if available (preferred source for LoadGameModal list)
            if (savedGamesData && typeof savedGamesData.refetch === 'function') {
              savedGamesData.refetch();
            }
          } catch (refreshError) {
            logger.warn('[AUTO-SAVE] Post-save refresh failed (non-fatal):', refreshError);
          }
        } catch (error) {
          logger.error('[AUTO-SAVE] Failed to auto-save state:', error);
        }
      });
    }
  }, [
    initialLoadComplete, currentGameId, isCreatingNewGame,
    // Only trigger auto-save on meaningful game state changes:
    gameSessionState.homeScore, gameSessionState.awayScore, // Score changes
    gameSessionState.gameEvents, // New events (goals, subs, etc.)
    gameSessionState.currentPeriod, gameSessionState.gameStatus, // Period/status changes
    gameSessionState.selectedPlayerIds, // FIXED: Player roster selection changes
    playersOnFieldCount, // Player changes on field (not positions)
    gameSessionState.gameNotes, // Notes changes
    scheduleAutosave, hashGameState,
    // Include dependencies needed by the auto-save function but don't trigger on them
    gameSessionState.teamName, gameSessionState.opponentName, gameSessionState.gameDate,
    gameSessionState.homeOrAway, gameSessionState.numberOfPeriods, gameSessionState.periodDurationMinutes,
    gameSessionState.seasonId, gameSessionState.tournamentId, gameSessionState.gameLocation,
    gameSessionState.gameTime, gameSessionState.demandFactor, gameSessionState.subIntervalMinutes,
    gameSessionState.completedIntervalDurations, gameSessionState.lastSubConfirmationTimeSeconds,
    gameSessionState.showPlayerNames, gameSessionState.timeElapsedInSeconds,
    availablePlayers, opponents, drawings, tacticalDiscs, tacticalDrawings, tacticalBallPosition,
    isPlayed, masterRosterQueryResultData, playerAssessments, playersOnField,
    savedGamesData, // FIXED: Added missing dependency used in auto-save effect
  ]);

  // Force save on critical events (page unload, visibility change)
  useEffect(() => {
    if (!initialLoadComplete || !currentGameId || currentGameId === DEFAULT_GAME_ID) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page becoming hidden - force immediate save
        const currentGameSnapshot = {
          homeScore: gameSessionState.homeScore,
          awayScore: gameSessionState.awayScore,
          gameEvents: gameSessionState.gameEvents,
          currentPeriod: gameSessionState.currentPeriod,
          gameStatus: gameSessionState.gameStatus,
          gameNotes: gameSessionState.gameNotes,
          selectedPlayerIds: gameSessionState.selectedPlayerIds,
          playersOnField,
        };

        const currentContentHash = hashGameState(currentGameSnapshot);
        if (currentContentHash !== lastSaveContentHashRef.current) {
          scheduleAutosave(async () => {
            lastSaveContentHashRef.current = currentContentHash;
            logger.log(`[CRITICAL-SAVE] Force saving due to visibility change`);

            await handleQuickSaveGame(currentGameId || DEFAULT_GAME_ID);
          }, true); // Mark as critical
        }
      }
    };

    const handleBeforeUnload = () => {
      // Force immediate save on page unload - use sendBeacon for reliability
      const currentGameSnapshot = {
        homeScore: gameSessionState.homeScore,
        awayScore: gameSessionState.awayScore,
        gameEvents: gameSessionState.gameEvents,
        currentPeriod: gameSessionState.currentPeriod,
        gameStatus: gameSessionState.gameStatus,
        gameNotes: gameSessionState.gameNotes,
        selectedPlayerIds: gameSessionState.selectedPlayerIds,
        playersOnField,
      };

      const currentContentHash = hashGameState(currentGameSnapshot);
      if (currentContentHash !== lastSaveContentHashRef.current) {
        logger.log(`[CRITICAL-SAVE] Force saving due to page unload`);
        // Note: In a real implementation, you'd want to use sendBeacon or similar
        // for reliable data transmission during page unload
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    initialLoadComplete, currentGameId, gameSessionState.homeScore, gameSessionState.awayScore,
    gameSessionState.gameEvents, gameSessionState.currentPeriod, gameSessionState.gameStatus,
    gameSessionState.gameNotes, playersOnField, hashGameState, scheduleAutosave,
    gameSessionState, availablePlayers, opponents, drawings, tacticalDiscs,
    tacticalDrawings, tacticalBallPosition, isPlayed, handleQuickSaveGame
  ]);

  // **** ADDED: Effect to prompt for setup if default game ID is loaded ****
  useEffect(() => {
    // Guard: ensure we only prompt after initial load completes and not when skipping
    if (!initialLoadComplete || hasSkippedInitialSetup) return;
    if (currentGameId === DEFAULT_GAME_ID) {
      newGameSetupModal.open();
    }
  }, [initialLoadComplete, hasSkippedInitialSetup, currentGameId, newGameSetupModal]);

  // --- Player Management Handlers moved to usePlayerFieldManager ---



  // --- Team Name Handler ---


  const handleUndo = () => {
    const prevState = undoHistory();
    if (prevState) {
      logger.log('Undoing...');
      applyHistoryState(prevState);
    } else {
      logger.log('Cannot undo: at beginning of history');
    }
  };

  const handleRedo = () => {
    const nextState = redoHistory();
    if (nextState) {
      logger.log('Redoing...');
      applyHistoryState(nextState);
    } else {
      logger.log('Cannot redo: at end of history');
    }
  };

  // --- Timer Handlers provided by useGameTimer ---

  const handleToggleLargeTimerOverlay = () => {
    setShowLargeTimerOverlay(!showLargeTimerOverlay);
  };


  // Handler to specifically deselect player when bar background is clicked
  const handleDeselectPlayer = () => {
    if (draggingPlayerFromBarInfo) { // Only log if there was a selection
      logger.log("Deselecting player by clicking bar background.");
      setDraggingPlayerFromBarInfo(null);
    }
  };


  // Handler to open/close the goal log modal
  const handleToggleGoalLogModal = () => {
    goalLogModal.toggle();
  };




  // --- Button/Action Handlers ---

  // RENAMED & UPDATED Handler: Just opens the setup modal after confirmation


  // NEW: Handler to actually reset state and set opponent/date/type from modal
  // Update signature to accept seasonId/tournamentId from the modal
  // Update signature to accept seasonId/tournamentId from the modal

  // NEW: Handler to cancel the new game setup
  // const handleCancelNewGameSetup = useCallback(() => { // REMOVED this line
  //   logger.log("Cancelling new game setup.");
  //   setIsNewGameSetupModalOpen(false);
  // }, []);

  // Handler to open/close the stats modal (Now using Zustand)
  const handleToggleGameStatsModal = useCallback(() => {
    // If the modal is currently open, we are about to close it.
    if (gameStatsModal.isOpen) {
      // Clear the selected player so it doesn't open to the same player next time.
      setSelectedPlayerForStats(null);
    }
    gameStatsModal.toggle();
  }, [gameStatsModal, setSelectedPlayerForStats]);

  // Placeholder handlers for updating game info (will be passed to modal)
  // const handleHomeScoreChange = (newScore: number) => {
  //   dispatchGameSession({ type: 'SET_HOME_SCORE', payload: newScore });
  // };
  // const handleAwayScoreChange = (newScore: number) => {
  //   dispatchGameSession({ type: 'SET_AWAY_SCORE', payload: newScore });
  // };

  // --- Handlers for Game Structure ---


  // Training Resources Modal
  const handleToggleTrainingResources = () => {
    trainingResourcesModal.toggle();
  };

  const handleToggleInstructionsModal = () => {
    if (isInstructionsModalOpen) {
      saveHasSeenAppGuide(true);
    }
    setIsInstructionsModalOpen(!isInstructionsModalOpen);
  };





  // Placeholder handlers for Save/Load Modals

  const handleOpenLoadGameModal = () => {
    logger.log("Opening Load Game Modal...");
    perfMark(PERF_MARKS.MODAL_OPEN_START, { modal: 'LoadGameModal' });
    loadGameModal.open();
    // Measure when modal becomes interactive
    requestAnimationFrame(() => {
      perfMeasure('LoadGameModal:open', PERF_MARKS.MODAL_OPEN_START);
    });
  };

  const handleCloseLoadGameModal = () => {
    loadGameModal.close();
  };

  const handleOpenSeasonTournamentModal = () => {
    seasonTournamentModal.open();
  };

  // const handleCloseSeasonTournamentModal = () => {
  //   seasonTournamentModal.close();
  // };


  // Function to handle loading a selected game
  const handleLoadGame = async (gameId: string) => {
    logger.log(`[handleLoadGame] Attempting to load game: ${gameId}`);
    perfMark(PERF_MARKS.GAME_LOAD_START, { gameId });

    // Cancel any previous load operation
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // PHASE 2: Use loading registry with auto-timeout
    const handleLoadTimeout = (id: string) => {
      setGameLoadingStates(prev => ({
        ...prev,
        [id]: { loading: false, error: 'Operation timed out. Please try again.' }
      }));
      setIsGameLoading(false);
    };

    // Register loading operation with timeout
    loadingRegistry.setLoading(gameId, true, handleLoadTimeout, 15000, 'game_load');

    // Clear any existing processing states and set current game as loading
    setGameLoadingStates(prev => ({
      ...prev,
      [gameId]: { loading: true, error: null }
    }));
    setIsGameLoading(true);
    setGameLoadError(null);

    // PHASE 2: Show skeleton during game transition
    setShowGameSkeleton(true);

    const gameDataToLoad = savedGames[gameId] as AppState | undefined; // Ensure this is AppState

    if (gameDataToLoad) {
      try {
        // Close modal immediately for optimistic UX
        handleCloseLoadGameModal();

        // Update current game ID for immediate UI feedback
        setCurrentGameId(gameId);
        perfMeasure('Game:load', PERF_MARKS.GAME_LOAD_START);

        // PHASE 3: Use operation queue for critical game loading
        await operationQueue.add({
          id: `load_game_${gameId}_${Date.now()}`,
          name: `Load Game ${gameId}`,
          priority: OperationPriority.CRITICAL,
          execute: async () => {
            await loadGameStateFromData(gameDataToLoad, false, signal);
          },
          timeout: 10000,
          createdAt: Date.now()
        });

        // Check if operation was cancelled before persistence
        if (signal.aborted) {
          return;
        }

        // Persist setting in background for non-critical work
        setTimeout(async () => {
          await utilSaveCurrentGameIdSetting(gameId);
          logger.log(`Game ${gameId} setting persisted to storage`);
        }, 0);

      } catch (error) {
        // Don't show error if operation was simply aborted
        if (error instanceof Error && error.name === 'AbortError') {
          logger.log('[handleLoadGame] Load operation was cancelled');
          return;
        }
        logger.error("Error processing game load:", error);
        setGameLoadError(t('loadGameModal.errors.loadFailed', 'Error loading game state. Please try again.'));
      } finally {
        // PHASE 2: Clear loading registry timeout and hide skeleton
        loadingRegistry.setLoading(gameId, false);
        setShowGameSkeleton(false);

        setIsGameLoading(false);
        setGameLoadingStates(prev => ({
          ...prev,
          [gameId]: { loading: false, error: null }
        }));
      }
    } else {
      logger.error(`Game state not found for ID: ${gameId}`);
      setGameLoadError(t('loadGameModal.errors.notFound', 'Could not find saved game: {gameId}', { gameId }));
      setIsGameLoading(false);
      setGameLoadingStates(prev => ({
        ...prev,
        [gameId]: { loading: false, error: t('loadGameModal.errors.notFound', 'Could not find saved game: {gameId}', { gameId }) }
      }));
    }
  };

  // Function to handle deleting a saved game - MOVED TO useGameDataManager hook
  // The handleDeleteGame function is now provided by useGameDataManager

  // Function to export all saved games as a single JSON file (RENAMED & PARAMETERIZED)
  // const handleExportAllGamesJson = () => { // This function is no longer used
  //   // ...
  // };

  // Helper functions moved to exportGames util

  // --- INDIVIDUAL GAME EXPORT HANDLERS - MOVED TO useGameDataManager hook ---
  // The handleExportOneJson and handleExportOneCsv functions are now provided by useGameDataManager

  // --- Roster Management Handlers (Now using Zustand) ---
  const openRosterModal = useCallback(() => {
    rosterSettingsModal.open();
    setHighlightRosterButton(false); // <<< Remove highlight when modal is opened
  }, [rosterSettingsModal, setHighlightRosterButton]);

  const openPlayerAssessmentModal = () => playerAssessmentModal.open();
  // const closePlayerAssessmentModal = () => playerAssessmentModal.close();

  // ... (other code in Home component) ...

  // const closeRosterModal = rosterSettingsModal.handleClose;

  // --- END Roster Management Handlers ---


  // --- NEW: Handler to Toggle Player Selection for Current Match ---


  // --- NEW: Quick Save Handler ---
  // --- Quick Save Handler - MOVED TO useGameDataManager hook ---
  // The handleQuickSaveGame function is now provided by useGameDataManager

  // --- Game Settings Modal Handlers (Now using Zustand) --- 
  const handleOpenGameSettingsModal = gameSettingsModal.handleOpen;
  const handleCloseGameSettingsModal = gameSettingsModal.handleClose;
  const handleOpenSettingsModal = () => {
    settingsModal.open();
  };
  // const handleCloseSettingsModal = () => {
  //   settingsModal.close();
  // };

  // --- Placeholder Handlers for GameSettingsModal (will be implemented properly later) ---




  // Add handler for home/away status

  const handleSetIsPlayed = (played: boolean) => {
    setIsPlayed(played);
  };

  // --- NEW Handlers for Setting Season/Tournament ID ---


  // --- AGGREGATE EXPORT HANDLERS --- 

  // ENSURE this function is commented out
  // Helper to get Filter Name (Season/Tournament)
  // const getFilterContextName = (tab: string, filterId: string, seasons: Season[], tournaments: Tournament[]): string => {
  //   if (tab === 'season' && filterId !== 'all') {
  //       return seasons.find(s => s.id === filterId)?.name || filterId;
  //   }
  //   if (tab === 'tournament' && filterId !== 'all') {
  //       return tournaments.find(t => t.id === filterId)?.name || filterId;
  //   }
  //   if (tab === 'overall') return 'Overall';
  //   return 'Unknown Filter'; // Fallback
  // };

  const handleExportAggregateJson = useCallback(async (gameIds: string[], aggregateStats: import('@/types').PlayerStatRow[]) => {
    if (gameIds.length === 0) {
      showToast(t('export.noGamesInSelection', 'No games match the current filter.'), 'info');
      return;
    }
    const gamesData = gameIds.reduce((acc, id) => {
      const gameData = savedGames[id];
      if (gameData) {
        acc[id] = gameData;
      }
      return acc;
    }, {} as SavedGamesCollection);

    // 🔧 DEPENDENCY INJECTION FIX: Use utility registry instead of dynamic import
    const success = await executeExportFunction('exportAggregateJson', gamesData, aggregateStats);
    if (!success) {
      showToast(t('export.error', 'Export failed. Please try again.'), 'error');
    }
  }, [savedGames, t, showToast]);

  const handleExportAggregateCsv = useCallback(async (gameIds: string[], aggregateStats: import('@/types').PlayerStatRow[]) => {
    if (gameIds.length === 0) {
      showToast(t('export.noGamesInSelection', 'No games match the current filter.'), 'info');
      return;
    }
    const gamesData = gameIds.reduce((acc, id) => {
      const gameData = savedGames[id];
      if (gameData) {
        acc[id] = gameData;
      }
      return acc;
    }, {} as SavedGamesCollection);

    // 🔧 DEPENDENCY INJECTION FIX: Use utility registry instead of dynamic import
    const success = await executeExportFunction('exportAggregateCsv', gamesData, aggregateStats);
    if (!success) {
      showToast(t('export.error', 'Export failed. Please try again.'), 'error');
    }
  }, [savedGames, t, showToast]);

  // --- END AGGREGATE EXPORT HANDLERS ---

  // --- Handler that is called when setup modal is confirmed ---
  const handleStartNewGameWithSetup = useCallback(async (
    initialSelectedPlayerIds: string[],
    homeTeamName: string, // <-- Add parameter
    opponentName: string,
    gameDate: string,
    gameLocation: string,
    gameTime: string,
    seasonId: string | null,
    tournamentId: string | null,
    numPeriods: 1 | 2, // Parameter
    periodDuration: number, // Parameter
    homeOrAway: 'home' | 'away', // <<< Step 4b: Add parameter
    demandFactor: number,
    ageGroup: string,
    tournamentLevel: string,
    isPlayed: boolean
  ) => {
    // Prevent auto-save during new game creation
    setIsCreatingNewGame(true);
    logger.log('[GameCreation] t0: Create game clicked, autosave paused');

    // ADD LOGGING HERE:
    logger.log('[handleStartNewGameWithSetup] Received Params:', {
      initialSelectedPlayerIds,
      homeTeamName,
      opponentName,
      gameDate,
      gameLocation,
      gameTime,
      seasonId,
      tournamentId,
      numPeriods,
      periodDuration,
      homeOrAway,
      demandFactor,
      ageGroup,
      tournamentLevel,
      isPlayed
    });
    // No need to log initialState references anymore

    // Determine the player selection for the new game
    const finalSelectedPlayerIds = initialSelectedPlayerIds && initialSelectedPlayerIds.length > 0
      ? initialSelectedPlayerIds
      : availablePlayers.map(p => p.id); // Fallback to all players if none provided

    // 1. Manually construct the new game state EXPLICITLY
    const newGameState: AppState = {
      opponentName: opponentName,
      gameDate: gameDate,
      gameLocation: gameLocation,
      gameTime: gameTime,
      seasonId: seasonId || '',
      tournamentId: tournamentId || '',
      ageGroup: ageGroup,
      tournamentLevel: tournamentLevel,
      numberOfPeriods: numPeriods, // Use parameter
      periodDurationMinutes: periodDuration, // Use parameter
      homeScore: 0,
      awayScore: 0,
      gameNotes: '',
      teamName: homeTeamName, // Use current teamName state
      homeOrAway: homeOrAway, // <<< Step 4b: Use parameter value
      demandFactor: demandFactor,
      isPlayed: isPlayed,
      availablePlayers: availablePlayers.map(p => ({ ...p, isGoalie: false })), // Reset goalie status for new game
      selectedPlayerIds: finalSelectedPlayerIds, // <-- USE PASSED OR FALLBACK
      playersOnField: [], // Always start with empty field
      opponents: [], // Always start with empty opponents
      showPlayerNames: true, // Default visibility
      drawings: [], // Always start with empty drawings
      gameEvents: [], // Always start with empty events
      currentPeriod: 1, // Always start at period 1
      gameStatus: 'notStarted', // Always start as not started
      tacticalDiscs: [],
      tacticalDrawings: [],
      // Timer/Sub State - Use TOP-LEVEL initialState defaults (or current settings?)
      // Let's stick with initialState defaults for timer/sub settings for now
      subIntervalMinutes: initialState.subIntervalMinutes ?? 5,
      completedIntervalDurations: [], // Always reset intervals
      lastSubConfirmationTimeSeconds: 0, // Always reset last sub time
      tacticalBallPosition: { relX: 0.5, relY: 0.5 },
      timeElapsedInSeconds: 0, // Always start with timer at 0
    };

    // Log the constructed state *before* saving
    // logger.log('[handleStartNewGameWithSetup] Constructed newGameState:', {
    //     periods: newGameState.numberOfPeriods,
    //     duration: newGameState.periodDurationMinutes,
    //     // REMOVED: numAvailablePlayers: newGameState.availablePlayers.length // Log roster size
    // });
    logger.log('[handleStartNewGameWithSetup] DIRECTLY CONSTRUCTED newGameState:', JSON.parse(JSON.stringify(newGameState)));

    // 2. Auto-generate temporary ID
    const tempGameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // ✅ FIX: Set the current game ID immediately so UI recognizes the new game
    setCurrentGameId(tempGameId);
    logger.log(`[GameCreation] t1: Temp game ID set: ${tempGameId}`);

    // 3. Reset History with the new state
    resetHistory(newGameState);

    // 4. Reset Game Session State to reflect the new game immediately
    dispatchGameSession({
      type: 'RESET_GAME_SESSION_STATE',
      payload: {
        teamName: homeTeamName,
        opponentName: opponentName,
        gameDate: gameDate,
        gameLocation: gameLocation.trim(),
        gameTime: gameTime,
        homeScore: 0,
        awayScore: 0,
        gameNotes: '',
        homeOrAway: homeOrAway,
        numberOfPeriods: numPeriods,
        periodDurationMinutes: periodDuration,
        currentPeriod: 1,
        gameStatus: 'notStarted',
        selectedPlayerIds: initialSelectedPlayerIds,
        seasonId: seasonId || '',
        tournamentId: tournamentId || '',
        demandFactor: demandFactor,
        ageGroup: ageGroup,
        tournamentLevel: tournamentLevel,
        gameEvents: [],
        timeElapsedInSeconds: 0,
        startTimestamp: null,
        isTimerRunning: false,
        subIntervalMinutes: 0,
        nextSubDueTimeSeconds: 0,
        subAlertLevel: 'none',
        completedIntervalDurations: [],
        lastSubConfirmationTimeSeconds: 0,
        showPlayerNames: true,
      }
    });
    logger.log('[GameCreation] t2: Reducer hydrated with new game state');

    // Reset goalie status in the roster state to match the new game state
    const resetPlayers = availablePlayers.map(p => ({ ...p, isGoalie: false }));
    setAvailablePlayers(resetPlayers);
    logger.log('[GameCreation] t2.1: Roster goalie status reset for new game');

    setIsPlayed(isPlayed);

    try {
      logger.log('[GameCreation] t3: Starting save operation...');
      const finalGameId = await handleQuickSaveGame(tempGameId, newGameState);

      // Log the final game ID returned from the save operation (not from stale currentGameId)
      logger.log(`[GameCreation] t4: Save completed, final game ID: ${finalGameId || tempGameId}`);
    } catch (error) {
      logger.error('[GameCreation] Save operation failed:', error);
      throw error;
    }

    // Close the setup modal
    newGameSetupModal.close();
    setNewGameDemandFactor(1);
    logger.log('[GameCreation] t5: Modal closed');

    // <<< Trigger the roster button highlight >>>
    setHighlightRosterButton(true);

    // Re-enable auto-save after new game creation is complete
    setIsCreatingNewGame(false);
    logger.log('[GameCreation] t6: Autosave re-enabled, game creation complete');

  }, [
    // Keep necessary dependencies
    availablePlayers,
    setAvailablePlayers,
    resetHistory,
    dispatchGameSession,
    newGameSetupModal,
    setNewGameDemandFactor,
    setHighlightRosterButton,
    setIsCreatingNewGame,
    setIsPlayed,
    handleQuickSaveGame,
  ]);

  // ** REVERT handleCancelNewGameSetup TO ORIGINAL **
  // const handleCancelNewGameSetup = useCallback(() => {
  //   logger.log("New game setup skipped/cancelled.");
  //   // REMOVED call to handleStartNewGameWithSetup
  //   // // Initialize with default values similar to handleStartNewGameWithSetup
  //   // const defaultOpponent = ''; // Empty opponent name
  //   // ... (rest of default value setup removed)
  //   // // Call the main setup function with defaults
  //   // handleStartNewGameWithSetup(
  //   //     ...
  //   // );

  //   setHasSkippedInitialSetup(true); // Still mark as skipped if needed elsewhere
  //   newGameSetupModal.close(); // ADDED: Explicitly close the modal
  //   setNewGameDemandFactor(1);

  //   // Re-enable auto-save if it was disabled for new game creation
  //   setIsCreatingNewGame(false);

  // // REMOVED initialState from dependencies
  // }, [newGameSetupModal, setIsCreatingNewGame]); // Added setter function to dependencies

  // --- Start New Game Handler (Uses Quick Save) ---
  const handleStartNewGame = useCallback(async () => {
    // Show loading indicator immediately
    newGameSetupModal.open();

    // Check if the current game is potentially unsaved (not the default ID and not null)
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      // Prompt to save first
      const gameData = savedGames[currentGameId]; // Safe to access due to check above
      const gameIdentifier = gameData?.teamName
        ? `${gameData.teamName} vs ${gameData.opponentName}`
        : `ID: ${currentGameId}`;

      const saveConfirmation = window.confirm(
        t('controlBar.saveBeforeNewPrompt', `Save changes to the current game "${gameIdentifier}" before starting a new one?`, { gameName: gameIdentifier })
      );

      if (saveConfirmation) {
        // User chose OK (Save) -> Call Quick Save, modal stays open
        logger.log("User chose to Quick Save before starting new game.");
        try {
          await handleQuickSaveGame();
        } catch (e) {
          logger.error('Quick save failed before new game setup:', e);
        }
        // Modal stays open, just continue to setup
        return;
      } else {
        // User chose Cancel (Discard) -> Proceed to next confirmation
        logger.log("Discarding current game changes to start new game.");
        // Confirmation for actually starting new game (ONLY shown if user DISCARDED previous game)
        if (window.confirm(t('controlBar.startNewMatchConfirmation', 'Are you sure you want to start a new match? Any unsaved progress will be lost.') ?? 'Are you sure?')) {
          logger.log("Start new game confirmed after discarding, opening setup modal...");
          // <<< SET default player selection (all players) >>>
          setPlayerIdsForNewGame(availablePlayers.map(p => p.id));
          // Modal already open, just continue
        } else {
          // User cancelled - close the modal
          newGameSetupModal.close();
        }
        // Exit the function after handling the discard path.
        return;
      }
    } else {
      // If no real game is loaded, proceed directly to the main confirmation
      if (window.confirm(t('controlBar.startNewMatchConfirmation', 'Are you sure you want to start a new match? Any unsaved progress will be lost.') ?? 'Are you sure?')) {
        logger.log("Start new game confirmed (no prior game to save), opening setup modal...");
        // <<< SET default player selection (all players) >>>
        setPlayerIdsForNewGame(availablePlayers.map(p => p.id));
        // Modal already open, just continue
      } else {
        // User cancelled - close the modal
        newGameSetupModal.close();
      }
      // If user cancels this confirmation, do nothing.
      // Exit the function after handling the no-game-loaded path.
      return;
    }
    // Note: This part of the code is now only reachable if the user chose 'OK (Save & Continue)'
    // because the other paths explicitly return earlier.
    // <<< SET player selection based on current game BEFORE opening modal >>>
    setPlayerIdsForNewGame(gameSessionState.selectedPlayerIds);  // Use the current selection
    newGameSetupModal.open(); // Open setup modal (moved here for save & continue path)

  }, [t, currentGameId, savedGames, handleQuickSaveGame, newGameSetupModal,
    // <<< ADD dependencies >>>
    availablePlayers, gameSessionState.selectedPlayerIds, setPlayerIdsForNewGame
  ]);
  // --- END Start New Game Handler ---

  // --- Player placement handler moved to usePlayerFieldManager ---

  // --- END Quick Save Handler ---

  // --- Step 3: Handler for Importing Games ---
  // const handleImportGamesFromJson = useCallback(async (jsonContent: string) => { // This function is no longer used
  //   // ...
  // }, [savedGames, setSavedGames, t]); 
  // --- End Step 3 --- 

  // --- NEW: Handlers for Game Settings Modal --- (Placeholder open/close)

  // Render null or a loading indicator until state is loaded
  // Note: Console log added before the check itself

  // ATTEMPTING TO EXPLICITLY REMOVE THE CONDITIONAL HOOK
  // The useEffect for highlightRosterButton that was here (around lines 2977-2992)
  // should be removed as it's called conditionally and its correct version is at the top level.


  const handleOpenPlayerStats = (playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayerForStats(player);
      gameStatsModal.open();
      rosterSettingsModal.close(); // Close the roster modal
    }
  };



  const handleGameLogClick = (gameId: string) => {
    setCurrentGameId(gameId);
    // handleClosePlayerStats(); // This function no longer exists
    handleToggleGameStatsModal();
  };

  // --- Render Logic ---
  const isLoading = isMasterRosterQueryLoading || areSeasonsQueryLoading || areTournamentsQueryLoading || isAllSavedGamesQueryLoading || isCurrentGameIdSettingQueryLoading;

  if (isLoading && !initialLoadComplete) {
    return <AppLoadingSkeleton />;
  }

  // Define a consistent, premium style for the top and bottom bars
  const barStyle = "bg-gradient-to-b from-slate-700 to-slate-800 shadow-lg";
  // We can add a noise texture via pseudo-elements or a background image later if desired

  // Determine which players are available for the current game based on selected IDs


  return (
    <main className="flex flex-col h-screen bg-slate-900 text-slate-50 overflow-hidden">
      {/* Top Section: Player Bar, Game Info */}
      <div className={barStyle}>
        <PlayerBar
          players={playersForCurrentGame}
          playersOnField={playersOnField}
          onPlayerDragStartFromBar={handlePlayerDragStartFromBar}
          selectedPlayerIdFromBar={draggingPlayerFromBarInfo?.id}
          onBarBackgroundClick={handleDeselectPlayer}
          gameEvents={gameSessionState.gameEvents}
          onPlayerTapInBar={handlePlayerTapInBar}
          onToggleGoalie={handleToggleGoalie}
        />
        <GameInfoBar
          teamName={gameSessionState.teamName}
          opponentName={gameSessionState.opponentName}
          homeScore={gameSessionState.homeScore}
          awayScore={gameSessionState.awayScore}
          onTeamNameChange={handleTeamNameChange}
          onOpponentNameChange={handleOpponentNameChange}
          homeOrAway={gameSessionState.homeOrAway}
        />
      </div>

      {/* Main Content: Soccer Field */}
      <div className="flex-grow relative bg-slate-950">
        {/* Start screen style background overlays */}
        <div className="absolute inset-0 bg-noise-texture pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-radial from-slate-950 via-slate-900/80 to-slate-900 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none animate-gradient [background:linear-gradient(120deg,theme(colors.indigo.950),theme(colors.blue.900),theme(colors.cyan.900),theme(colors.indigo.950))] opacity-25" />
        <div className="absolute inset-0 pointer-events-none sm:opacity-[0.04] opacity-[0.03] [background-image:linear-gradient(to_right,rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-sky-700/20 to-cyan-600/30 mix-blend-overlay pointer-events-none" />
        <div className="absolute -inset-[50px] bg-sky-400/10 blur-3xl top-0 opacity-50 pointer-events-none" />
        <div className="absolute -inset-[50px] bg-indigo-600/10 blur-3xl bottom-0 opacity-50 pointer-events-none" />
        <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(60%_50%_at_12%_12%,theme(colors.indigo.700)/0.25_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(50%_40%_at_88%_78%,theme(colors.sky.500)/0.25_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent pointer-events-none" />
        {/* PHASE 2: Show skeleton during game transitions */}
        {showGameSkeleton ? (
          <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center p-4">
            <GameLoadingSkeleton className="max-w-2xl w-full" />
          </div>
        ) : (
          <>
            {/* Pass rel drawing handlers to SoccerField */}

            {showLargeTimerOverlay && (
              <TimerOverlay
                timeElapsedInSeconds={timeElapsedInSeconds}
                subAlertLevel={subAlertLevel}
                onSubstitutionMade={handleSubstitutionMade}
                completedIntervalDurations={gameSessionState.completedIntervalDurations || []}
                subIntervalMinutes={gameSessionState.subIntervalMinutes}
                onSetSubInterval={handleSetSubInterval}
                isTimerRunning={isTimerRunning}
                onStartPauseTimer={handleStartPauseTimer}
                onResetTimer={handleResetTimer}
                onToggleGoalLogModal={handleToggleGoalLogModal}
                onRecordOpponentGoal={() => handleLogOpponentGoal(timeElapsedInSeconds)}
                teamName={gameSessionState.teamName}
                opponentName={gameSessionState.opponentName}
                homeScore={gameSessionState.homeScore}
                awayScore={gameSessionState.awayScore}
                homeOrAway={gameSessionState.homeOrAway}
                lastSubTime={lastSubConfirmationTimeSeconds}
                numberOfPeriods={gameSessionState.numberOfPeriods}
                periodDurationMinutes={gameSessionState.periodDurationMinutes}
                currentPeriod={gameSessionState.currentPeriod}
                gameStatus={gameSessionState.gameStatus}
                onOpponentNameChange={handleOpponentNameChange}
                onClose={handleToggleLargeTimerOverlay}
                isLoaded={initialLoadComplete}
              />
            )}

            <GameErrorBoundary
              componentName="SoccerField"
              fallbackTitle="Field Error"
              fallbackMessage="The soccer field encountered an error. This might affect player positioning."
            >
              <SoccerField
                players={playersOnField}
                opponents={opponents}
                drawings={isTacticsBoardView ? tacticalDrawings : drawings}
                onPlayerMove={handlePlayerMove}
                onPlayerMoveEnd={handlePlayerMoveEnd}
                onPlayerRemove={handlePlayerRemove}
                onOpponentMove={handleOpponentMove}
                onOpponentMoveEnd={handleOpponentMoveEnd}
                onOpponentRemove={handleOpponentRemove}
                onPlayerDrop={handleDropOnField}
                showPlayerNames={gameSessionState.showPlayerNames}
                onDrawingStart={isTacticsBoardView ? handleTacticalDrawingStart : handleDrawingStart}
                onDrawingAddPoint={isTacticsBoardView ? handleTacticalDrawingAddPoint : handleDrawingAddPoint}
                onDrawingEnd={isTacticsBoardView ? handleTacticalDrawingEnd : handleDrawingEnd}
                draggingPlayerFromBarInfo={draggingPlayerFromBarInfo}
                onPlayerDropViaTouch={handlePlayerDropViaTouch}
                onPlayerDragCancelViaTouch={handlePlayerDragCancelViaTouch}
                timeElapsedInSeconds={timeElapsedInSeconds}
                isTacticsBoardView={isTacticsBoardView}
                tacticalDiscs={tacticalDiscs}
                onTacticalDiscMove={handleTacticalDiscMove}
                onTacticalDiscRemove={handleTacticalDiscRemove}
                onToggleTacticalDiscType={handleToggleTacticalDiscType}
                tacticalBallPosition={tacticalBallPosition}
                onTacticalBallMove={handleTacticalBallMove}
              />
            </GameErrorBoundary>
            {/* Other components that might overlay or interact with the field */}
          </>
        )}
      </div>

      {/* Bottom Section: Control Bar */}
      <div className={barStyle}>
        <GameErrorBoundary
          componentName="ControlBar"
          fallbackTitle="Control Panel Error"
          fallbackMessage="The control panel encountered an error. Some game controls may not work."
        >
          <ControlBar
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onResetField={handleResetField}
            onClearDrawings={handleClearDrawingsForView}
            onAddOpponent={handleAddOpponent}
            showLargeTimerOverlay={showLargeTimerOverlay}
            onToggleLargeTimerOverlay={handleToggleLargeTimerOverlay}
            onToggleTrainingResources={handleToggleTrainingResources}
            onToggleGoalLogModal={handleToggleGoalLogModal}
            onToggleGameStatsModal={handleToggleGameStatsModal}
            onOpenLoadGameModal={handleOpenLoadGameModal}
            onStartNewGame={handleStartNewGame}
            onOpenRosterModal={openRosterModal}
            onQuickSave={handleQuickSaveGame}
            onOpenGameSettingsModal={handleOpenGameSettingsModal}
            isGameLoaded={!!currentGameId && currentGameId !== DEFAULT_GAME_ID}
            onPlaceAllPlayers={handlePlaceAllPlayers}
            highlightRosterButton={highlightRosterButton}
            onOpenSeasonTournamentModal={handleOpenSeasonTournamentModal}
            isTacticsBoardView={isTacticsBoardView}
            onToggleTacticsBoard={handleToggleTacticsBoard}
            onAddHomeDisc={() => handleAddTacticalDisc('home')}
            onAddOpponentDisc={() => handleAddTacticalDisc('opponent')}
            onToggleInstructionsModal={handleToggleInstructionsModal}
            onOpenSettingsModal={handleOpenSettingsModal}
            onOpenPlayerAssessmentModal={openPlayerAssessmentModal}
            onSignOut={signOut}
          />
        </GameErrorBoundary>
      </div>

      {/* Modals and Overlays */}
      <GameErrorBoundary
        componentName="ModalsSection"
        fallbackTitle="Modal Error"
        fallbackMessage="A modal encountered an error. You can continue using the game, but some dialogs may not work properly."
        showRetryButton={false}
      >
        {/* Training Resources Modal */}
        {trainingResourcesModal.isOpen && (
          <TrainingResourcesModal
            isOpen={trainingResourcesModal.isOpen}
            onClose={trainingResourcesModal.handleClose}
          />
        )}
        {isInstructionsModalOpen && !isGameLoading && (
          <InstructionsModal
            isOpen={isInstructionsModalOpen}
            onClose={handleToggleInstructionsModal}
          />
        )}
        {/* Goal Log Modal */}
        {goalLogModal.isOpen && (
          <GoalLogModal
            isOpen={goalLogModal.isOpen}
            onClose={goalLogModal.handleClose}
            onLogGoal={handleAddGoalEvent}
            onLogOpponentGoal={handleLogOpponentGoal}
            availablePlayers={playersForCurrentGame}
            currentTime={gameSessionState.timeElapsedInSeconds}
          />
        )}
        {/* Game Stats Modal - Now using Zustand state */}
        {gameStatsModal.isOpen && (
          <GameStatsModal
            isOpen={gameStatsModal.isOpen}
            onClose={handleToggleGameStatsModal}
            teamName={gameSessionState.teamName}
            opponentName={gameSessionState.opponentName}
            gameDate={gameSessionState.gameDate}
            homeScore={gameSessionState.homeScore}
            awayScore={gameSessionState.awayScore}
            homeOrAway={gameSessionState.homeOrAway}
            gameLocation={gameSessionState.gameLocation}
            gameTime={gameSessionState.gameTime}
            numPeriods={gameSessionState.numberOfPeriods}
            periodDurationMinutes={gameSessionState.periodDurationMinutes}
            availablePlayers={availablePlayers}
            gameEvents={gameSessionState.gameEvents}
            gameNotes={gameSessionState.gameNotes}
            onUpdateGameEvent={handleUpdateGameEvent}
            selectedPlayerIds={gameSessionState.selectedPlayerIds}
            savedGames={savedGames}
            currentGameId={currentGameId}
            onDeleteGameEvent={handleDeleteGameEvent}
            onExportOneJson={handleExportOneJsonWrapper}
            onExportOneCsv={handleExportOneCsvWrapper}
            onExportAggregateJson={handleExportAggregateJson}
            onExportAggregateCsv={handleExportAggregateCsv}
            initialSelectedPlayerId={selectedPlayerForStats?.id}
            onGameClick={handleGameLogClick}
          />
        )}
        {loadGameModal.isOpen && (
          <LoadGameModal
            isOpen={loadGameModal.isOpen}
            onClose={loadGameModal.handleClose}
            savedGames={Object.keys(savedGamesData.games).length > 0 ? savedGamesData.games : savedGames}
            onLoad={handleLoadGame}
            onDelete={handleDeleteGame}
            onExportOneJson={handleExportOneJsonWrapper}
            onExportOneCsv={handleExportOneCsvWrapper}
            currentGameId={currentGameId || undefined} // Convert null to undefined
            // Pass loading and error state props for LoadGameModal
            isLoadingGamesList={savedGamesData.isLoading || isLoadingGamesList}
            loadGamesListError={savedGamesData.isError ? 'Failed to load games' : loadGamesListError}
            isGameLoading={isGameLoading}
            gameLoadError={gameLoadError}
            gameLoadingStates={gameLoadingStates}
            // Pass timeout and refetch for graceful fallback
            hasTimedOut={savedGamesData.hasTimedOut}
            onRefetch={savedGamesData.refetch}
          />
        )}

        {/* Conditionally render the New Game Setup Modal */}
        {newGameSetupModal.isOpen && (
          <NewGameSetupModal
            isOpen={newGameSetupModal.isOpen}
            initialPlayerSelection={playerIdsForNewGame} // <<< Pass the state here
            availablePlayers={availablePlayers} // Pass the players from state
            demandFactor={newGameDemandFactor}
            onDemandFactorChange={setNewGameDemandFactor}
            onStart={handleStartNewGameWithSetup} // CORRECTED Handler
            onCancel={newGameSetupModal.handleClose}
            addSeasonMutation={addSeasonMutation}
            addTournamentMutation={addTournamentMutation}
            isAddingSeason={addSeasonMutation.isPending}
            isAddingTournament={addTournamentMutation.isPending}
            // Pre-warmed cached data
            seasons={gameCreationData.seasons}
            tournaments={gameCreationData.tournaments}
            lastHomeTeamName={gameCreationData.lastHomeTeamName}
            isLoadingCachedData={gameCreationData.isLoading}
            hasTimedOut={gameCreationData.hasTimedOut}
            onRefetch={gameCreationData.refetch}
          />
        )}

        {/* Roster Settings Modal */}
        {rosterSettingsModal.isOpen && (
          <RosterSettingsModal
            isOpen={rosterSettingsModal.isOpen}
            onClose={rosterSettingsModal.handleClose}
            availablePlayers={availablePlayers} // Use availablePlayers from useGameState
            onRenamePlayer={handleRenamePlayerForModal}
            onSetJerseyNumber={handleSetJerseyNumberForModal}
            onSetPlayerNotes={handleSetPlayerNotesForModal}
            onRemovePlayer={handleRemovePlayerForModal}
            onAddPlayer={handleAddPlayerForModal}
            selectedPlayerIds={gameSessionState.selectedPlayerIds}
            onTogglePlayerSelection={handleTogglePlayerSelection}
            teamName={gameSessionState.teamName}
            onTeamNameChange={handleTeamNameChange}
            isRosterUpdating={isRosterUpdating}
            rosterError={rosterError}
            onOpenPlayerStats={handleOpenPlayerStats}
          />
        )}

        {seasonTournamentModal.isOpen && (
          <SeasonTournamentManagementModal
            isOpen={seasonTournamentModal.isOpen}
            onClose={seasonTournamentModal.handleClose}
            seasons={seasons}
            tournaments={tournaments}
            availablePlayers={availablePlayers}
            addSeasonMutation={addSeasonMutation}
            addTournamentMutation={addTournamentMutation}
            updateSeasonMutation={updateSeasonMutation}
            deleteSeasonMutation={deleteSeasonMutation}
            updateTournamentMutation={updateTournamentMutation}
            deleteTournamentMutation={deleteTournamentMutation}
          />
        )}

        {/* <PlayerStatsModal 
          isOpen={isPlayerStatsModalOpen} 
          onClose={handleClosePlayerStats} 
          player={selectedPlayerForStats}
          savedGames={allSavedGamesQueryResultData || {}} 
          onGameClick={handleGameLogClick}
      /> */}

        {gameSettingsModal.isOpen && (
          <GameSettingsModal
            isOpen={gameSettingsModal.isOpen}
            onClose={handleCloseGameSettingsModal}
            currentGameId={currentGameId}
            teamName={gameSessionState.teamName}
            opponentName={gameSessionState.opponentName}
            gameDate={gameSessionState.gameDate}
            gameLocation={gameSessionState.gameLocation}
            gameTime={gameSessionState.gameTime}
            gameNotes={gameSessionState.gameNotes}
            ageGroup={gameSessionState.ageGroup}
            tournamentLevel={gameSessionState.tournamentLevel}
            gameEvents={gameSessionState.gameEvents}
            availablePlayers={availablePlayers}
            selectedPlayerIds={gameSessionState.selectedPlayerIds}
            onSelectedPlayersChange={handleUpdateSelectedPlayers}
            numPeriods={gameSessionState.numberOfPeriods}
            periodDurationMinutes={gameSessionState.periodDurationMinutes}
            demandFactor={gameSessionState.demandFactor}
            onTeamNameChange={handleTeamNameChange}
            onOpponentNameChange={handleOpponentNameChange}
            onGameDateChange={handleGameDateChange}
            onGameLocationChange={handleGameLocationChange}
            onGameTimeChange={handleGameTimeChange}
            onAgeGroupChange={handleSetAgeGroup}
            onTournamentLevelChange={handleSetTournamentLevel}
            onUpdateGameEvent={handleUpdateGameEvent}
            onAwardFairPlayCard={handleAwardFairPlayCard}
            onDeleteGameEvent={handleDeleteGameEvent}
            onNumPeriodsChange={handleSetNumberOfPeriods}
            onPeriodDurationChange={handleSetPeriodDuration}
            onDemandFactorChange={handleSetDemandFactor}
            seasonId={gameSessionState.seasonId}
            tournamentId={gameSessionState.tournamentId}
            onSeasonIdChange={handleSetSeasonId}
            onTournamentIdChange={handleSetTournamentId}
            homeOrAway={gameSessionState.homeOrAway}
            onSetHomeOrAway={handleSetHomeOrAway}
            isPlayed={isPlayed}
            onIsPlayedChange={handleSetIsPlayed}
            addSeasonMutation={addSeasonMutation}
            addTournamentMutation={addTournamentMutation}
            isAddingSeason={addSeasonMutation.isPending}
            isAddingTournament={addTournamentMutation.isPending}
            timeElapsedInSeconds={timeElapsedInSeconds}
            updateGameDetailsMutation={updateGameDetailsMutation}
          />
        )}

        {settingsModal.isOpen && (
          <SettingsModal
            isOpen={settingsModal.isOpen}
            onClose={settingsModal.handleClose}
            language={appLanguage}
            onLanguageChange={handleLanguageChange}
            defaultTeamName={defaultTeamNameSetting}
            onDefaultTeamNameChange={handleDefaultTeamNameChange}
            onResetGuide={handleShowAppGuide}
            onHardResetApp={handleHardResetApp}
            onSignOut={signOut}
          />
        )}

        {playerAssessmentModal.isOpen && (
          <PlayerAssessmentModal
            isOpen={playerAssessmentModal.isOpen}
            onClose={playerAssessmentModal.handleClose}
            selectedPlayerIds={gameSessionState.selectedPlayerIds}
            availablePlayers={availablePlayers}
            assessments={playerAssessments}
            onSave={handleSavePlayerAssessment}
            onDelete={handleDeletePlayerAssessment}
          />
        )}
      </GameErrorBoundary>
    </main>
  );
}

export default HomePage;
