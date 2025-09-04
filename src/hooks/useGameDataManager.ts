import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSaveQueue } from './useSaveQueue';
// import { useTranslation } from 'react-i18next'; // Removed unused import
import {
  saveGame as utilSaveGame,
  deleteGame as utilDeleteGame,
  getLatestGameId,
  updateGameDetails as utilUpdateGameDetails
} from '@/utils/savedGames';
import {
  saveCurrentGameIdSetting as utilSaveCurrentGameIdSetting,
} from '@/utils/appSettings';
import {
  deleteSeason as utilDeleteSeason,
  updateSeasonLegacy as utilUpdateSeasonLegacy,
  addSeason as utilAddSeason
} from '@/utils/seasons';
import {
  deleteTournament as utilDeleteTournament,
  updateTournamentLegacy as utilUpdateTournamentLegacy,
  addTournament as utilAddTournament
} from '@/utils/tournaments';
// Removed static import - using dynamic imports for better bundle splitting: exportJson, exportCsv
import { queryKeys } from '@/config/queryKeys';
import { DEFAULT_GAME_ID } from '@/config/constants';
import logger from '@/utils/logger';
import type {
  Season,
  Tournament,
  AppState,
  SavedGamesCollection,
  Player,
  Opponent,
  TacticalDisc,
  Point
} from '@/types';
import type { GameSessionState } from '@/hooks/useGameSessionReducer';

interface UseGameDataManagerProps {
  currentGameId: string | null;
  savedGames: SavedGamesCollection;
  setSavedGames: (games: SavedGamesCollection | ((prev: SavedGamesCollection) => SavedGamesCollection)) => void;
  setCurrentGameId: (id: string | null) => void;
  gameSessionState: GameSessionState;
  availablePlayers: Player[];
  playersOnField: Player[];
  opponents: Opponent[];
  drawings: Point[][];
  tacticalDiscs: TacticalDisc[];
  tacticalDrawings: Point[][];
  tacticalBallPosition: Point | null;
}

/**
 * Custom hook that manages all data persistence operations for the game application.
 * Handles React Query mutations for seasons, tournaments, games, and provides
 * save/load/export functionality.
 */
export const useGameDataManager = ({
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
}: UseGameDataManagerProps) => {
  const queryClient = useQueryClient();
  // const { t } = useTranslation(); // Removed unused import

  // Initialize save queue to prevent race conditions in auto-save operations
  const saveQueue = useSaveQueue({
    debounceMs: 300, // Slightly shorter debounce for responsive auto-save
    maxRetries: 1,   // Reduce retries to avoid long timeouts during network slowness
    maxQueueSize: 5  // Smaller queue for save operations
  });

  // Guards to avoid saving while delete is in-flight or after deletion
  const isDeleteInFlightRef = useRef<boolean>(false);
  const deletedGameIdsRef = useRef<Set<string>>(new Set());

  // --- Season Mutations ---
  const addSeasonMutation = useMutation<
    Season | null,
    Error,
    Partial<Season> & { name: string }
  >({
    mutationFn: async (data) => {
      const { name, ...extra } = data;
      return utilAddSeason(name, extra);
    },
    onSuccess: (newSeason, variables) => {
      if (newSeason) {
        logger.log('[useGameDataManager] Season added:', newSeason.name, newSeason.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
      } else {
        logger.warn('[useGameDataManager] utilAddSeason returned null for season:', variables.name);
      }
    },
    onError: (error, variables) => {
      logger.error(`[useGameDataManager] Failed to add season ${variables.name}:`, error);
    },
  });

  const updateSeasonMutation = useMutation<Season | null, Error, Season>({
    mutationFn: async (season) => utilUpdateSeasonLegacy(season),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
    },
    onError: (error) => {
      logger.error('[useGameDataManager] Failed to update season:', error);
    },
  });

  const deleteSeasonMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => utilDeleteSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
    },
    onError: (error) => {
      logger.error('[useGameDataManager] Failed to delete season:', error);
    },
  });

  // --- Tournament Mutations ---
  const addTournamentMutation = useMutation<
    Tournament | null,
    Error,
    Partial<Tournament> & { name: string }
  >({
    mutationFn: async (data) => {
      const { name, ...extra } = data;
      return utilAddTournament(name, extra);
    },
    onSuccess: (newTournament, variables) => {
      if (newTournament) {
        logger.log('[useGameDataManager] Tournament added:', newTournament.name, newTournament.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
      } else {
        logger.warn('[useGameDataManager] utilAddTournament returned null for tournament:', variables.name);
      }
    },
    onError: (error, variables) => {
      logger.error(`[useGameDataManager] Failed to add tournament ${variables.name}:`, error);
    },
  });

  const updateTournamentMutation = useMutation<Tournament | null, Error, Tournament>({
    mutationFn: async (tournament) => utilUpdateTournamentLegacy(tournament),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
    },
    onError: (error) => {
      logger.error('[useGameDataManager] Failed to update tournament:', error);
    },
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: (id: string) => utilDeleteTournament(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
      queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });
    },
    onError: (error) => {
      logger.error('[useGameDataManager] Failed to delete tournament:', error);
    },
  });

  // --- Game Mutations ---
  const updateGameDetailsMutation = useMutation({
    mutationFn: ({ gameId, updates }: { gameId: string, updates: Partial<AppState> }) =>
      utilUpdateGameDetails(gameId, updates),
    onSuccess: (data, variables) => {
      // After a successful update, invalidate the savedGames query to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });

      // Optimistically update the query cache
      queryClient.setQueryData(queryKeys.savedGames, (oldData: SavedGamesCollection | undefined) => {
        if (!oldData) return oldData;
        const existing = oldData[variables.gameId];
        return {
          ...oldData,
          [variables.gameId]: { ...existing, ...variables.updates },
        };
      });

      // Keep local state in sync so components using savedGames see the update
      setSavedGames(prev => {
        const existing = prev[variables.gameId];
        return {
          ...prev,
          [variables.gameId]: data ?? { ...existing, ...variables.updates },
        };
      });
    },
    onError: (error) => {
      logger.error('[useGameDataManager] Error updating game details:', error);
    },
  });

  // --- Save/Load Handlers ---
  const handleQuickSaveGame = useCallback(async (
    overrideGameId?: string,
    overrideSnapshot?: AppState
  ): Promise<string | null> => {
    const gameId = overrideGameId || currentGameId;
    if (!gameId || gameId === DEFAULT_GAME_ID) {
      logger.warn('[useGameDataManager] Cannot quick save: no valid game ID.');
      return null;
    }

    // Skip save if a delete is in-flight or this game was deleted
    if (isDeleteInFlightRef.current) {
      logger.warn('[useGameDataManager] Skipping quick save because a delete is in-flight');
      return null;
    }
    if (deletedGameIdsRef.current.has(gameId)) {
      logger.warn(`[useGameDataManager] Skipping quick save because game ${gameId} was deleted`);
      return null;
    }

    let finalGameId: string | null = null;

    // Queue the save operation to prevent race conditions
    await saveQueue.queueSave(
      `quick-save-${gameId}`,
      async () => {
        logger.log(`[useGameDataManager] Processing queued quick save for game ID: ${gameId}`);

        // Skip if delete occurred after queueing but before execution
        if (isDeleteInFlightRef.current || deletedGameIdsRef.current.has(gameId)) {
          logger.warn(`[useGameDataManager] Aborting queued quick save; delete in progress or game ${gameId} deleted`);
          return;
        }

        // 1. Create the current game state snapshot
        const snapshot: AppState = overrideSnapshot ?? {
          playersOnField: playersOnField,
          opponents: opponents,
          drawings: drawings,
          availablePlayers: availablePlayers,
          showPlayerNames: gameSessionState.showPlayerNames,
          teamName: gameSessionState.teamName,
          gameEvents: gameSessionState.gameEvents,
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
          demandFactor: gameSessionState.demandFactor,
          isPlayed: true, // GameSessionState doesn't have isPlayed, defaulting to true
          ageGroup: gameSessionState.ageGroup,
          tournamentLevel: gameSessionState.tournamentLevel,
          subIntervalMinutes: gameSessionState.subIntervalMinutes,
          completedIntervalDurations: gameSessionState.completedIntervalDurations,
          lastSubConfirmationTimeSeconds: gameSessionState.lastSubConfirmationTimeSeconds,
          tacticalDiscs: tacticalDiscs,
          tacticalDrawings: tacticalDrawings,
          tacticalBallPosition: tacticalBallPosition,
          timeElapsedInSeconds: gameSessionState.timeElapsedInSeconds,
        };

        // 2. Update the savedGames state and localStorage
        const savedResult = await utilSaveGame(gameId, snapshot);

        // 3. Update currentGameId if it changed (important for Supabase UUID sync)
        const newGameId = (savedResult as AppState & { id?: string }).id;
        if (newGameId && newGameId !== gameId) {
          logger.log(`[GameCreation] UUID sync: ${gameId} → ${newGameId}`);
          setCurrentGameId(newGameId);
          finalGameId = newGameId;

          // Update savedGames with the new ID and remove the old one
          const updatedSavedGames = { ...savedGames };
          updatedSavedGames[newGameId] = { ...snapshot, id: newGameId } as AppState;
          delete updatedSavedGames[gameId];
          setSavedGames(updatedSavedGames);

          await utilSaveCurrentGameIdSetting(newGameId);
          logger.log(`[useGameDataManager] Game ${newGameId} quick saved successfully with ID sync.`);
        } else {
          // No ID change, update savedGames normally
          finalGameId = gameId;
          const updatedSavedGames = { ...savedGames, [gameId]: snapshot };
          setSavedGames(updatedSavedGames);
          await utilSaveCurrentGameIdSetting(gameId);
          logger.log(`[useGameDataManager] Game ${gameId} quick saved successfully.`);
        }

        // Invalidate React Query cache to refresh saved games data
        try {
          queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });
          logger.log('[GameCreation] Cache invalidated, saved games list will refresh');
        } catch (error) {
          // Don't fail the save operation if cache invalidation fails
          logger.warn('[GameCreation] Cache invalidation failed (non-critical):', error);
        }
      },
      true // process immediately for game creation
    );

    // Return the final game ID after the save operation completes
    return finalGameId;
  }, [
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
    saveQueue,
    queryClient,
  ]);

  const handleDeleteGame = useCallback(async (gameId: string) => {
    logger.log(`[useGameDataManager] Attempting to delete game: ${gameId}`);

    if (!gameId) {
      logger.error('[useGameDataManager] handleDeleteGame: gameId is required');
      return;
    }

    try {
      // Prevent competing auto-saves and mark deletion in-flight
      isDeleteInFlightRef.current = true;
      saveQueue.clearQueue();

      const deletedGameId = await utilDeleteGame(gameId);

      if (deletedGameId) {
        deletedGameIdsRef.current.add(deletedGameId);
        setSavedGames(prevSavedGames => {
          const updatedSavedGames = { ...prevSavedGames };
          delete updatedSavedGames[gameId];

          // The logic to handle switching to a new game if the current one was deleted
          // needs to use the "updatedSavedGames" from this scope.
          if (currentGameId === gameId) {
            const latestId = getLatestGameId(updatedSavedGames);
            if (latestId) {
              logger.log(`[useGameDataManager] Deleted active game. Loading latest game ${latestId}.`);
              setCurrentGameId(latestId);
              utilSaveCurrentGameIdSetting(latestId);
            } else {
              logger.log('[useGameDataManager] No other saved games found. Resetting to default state.');
              setCurrentGameId(DEFAULT_GAME_ID);
              utilSaveCurrentGameIdSetting(DEFAULT_GAME_ID);
            }
          }

          return updatedSavedGames;
        });

        logger.log(`[useGameDataManager] Game ${gameId} deletion processed.`);

        // Invalidate queries to refresh UI from the source of truth
        queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });
      } else {
        logger.warn(`[useGameDataManager] utilDeleteGame returned null for gameId: ${gameId}. Game might not have been found or ID was invalid.`);
      }
    } catch (error) {
      logger.error(`[useGameDataManager] Error deleting game ${gameId}:`, error);
      throw error;
    } finally {
      // Allow future saves again
      isDeleteInFlightRef.current = false;
    }
  }, [setSavedGames, currentGameId, setCurrentGameId, queryClient, saveQueue]);

  // --- Export Handlers ---
  const handleExportOneJson = useCallback((gameId: string, seasons: Season[] = [], tournaments: Tournament[] = []) => {
    const gameData = savedGames[gameId];
    if (gameData) {
      // Dynamic import for better bundle splitting
      import('@/utils/exportGames').then(({ exportJson }) => {
        exportJson(gameId, gameData, seasons, tournaments);
        logger.log(`[useGameDataManager] Exported game ${gameId} as JSON`);
      }).catch(error => {
        logger.error(`[useGameDataManager] Failed to load export utilities for JSON export:`, error);
      });
    } else {
      logger.error(`[useGameDataManager] Game ${gameId} not found for JSON export`);
    }
  }, [savedGames]);

  const handleExportOneCsv = useCallback((gameId: string, players: Player[], seasons: Season[] = [], tournaments: Tournament[] = []) => {
    const gameData = savedGames[gameId];
    if (gameData) {
      // Dynamic import for better bundle splitting
      import('@/utils/exportGames').then(({ exportCsv }) => {
        exportCsv(gameId, gameData, players, seasons, tournaments);
        logger.log(`[useGameDataManager] Exported game ${gameId} as CSV`);
      }).catch(error => {
        logger.error(`[useGameDataManager] Failed to load export utilities for CSV export:`, error);
      });
    } else {
      logger.error(`[useGameDataManager] Game ${gameId} not found for CSV export`);
    }
  }, [savedGames]);

  // Cleanup save queue on unmount
  useEffect(() => {
    return () => {
      saveQueue.cleanup();
    };
  }, [saveQueue]);

  return {
    // Mutations
    mutations: {
      addSeasonMutation,
      updateSeasonMutation,
      deleteSeasonMutation,
      addTournamentMutation,
      updateTournamentMutation,
      deleteTournamentMutation,
      updateGameDetailsMutation,
    },

    // Handlers
    handlers: {
      handleQuickSaveGame,
      handleDeleteGame,
      handleExportOneJson,
      handleExportOneCsv,
    },

    // Save queue status for monitoring save operations
    saveStatus: saveQueue.status,
  };
};

export default useGameDataManager;