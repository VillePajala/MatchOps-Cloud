import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMasterRoster } from '@/utils/masterRosterManager';
import { getSavedGames, getMostRecentGameId } from '@/utils/savedGames';
import { getCurrentGameIdSetting } from '@/utils/appSettings';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';

/**
 * Comprehensive state detection result for smart UI behavior and empty state prevention.
 * 
 * This interface provides detailed information about the user's current data state,
 * enabling the UI to make intelligent decisions about feature availability and user guidance.
 */
export interface AppStateDetection {
  /** Whether the user has at least one player in their roster */
  hasPlayers: boolean;
  
  /** Whether the user has any saved games available */
  hasSavedGames: boolean;
  
  /** Whether the user has any seasons or tournaments configured */
  hasSeasonsTournaments: boolean;
  
  /** 
   * Whether this appears to be a first-time user (lacks players OR saved games).
   * Used to determine onboarding flow and feature introduction.
   */
  isFirstTimeUser: boolean;
  
  /** 
   * Whether the user can resume a game (has current game ID or most recent game).
   * Determines if "Resume Game" functionality should be available.
   */
  canResume: boolean;
  
  /** Whether the state detection is currently loading/in progress */
  isLoading: boolean;
  
  /** 
   * Optional function to manually refresh the state detection.
   * Useful when user adds data and UI needs to update immediately.
   */
  refreshDetection?: () => void;
}

/**
 * Hook that detects the current state of user data to enable smart UI behavior and empty state prevention.
 * 
 * This hook performs comprehensive analysis of the user's data (players, saved games, seasons, tournaments)
 * to provide intelligent UI guidance and prevent empty state workflows (e.g., creating games without players).
 * 
 * Replaces and extends the original useResumeAvailability with much broader state detection capabilities.
 * 
 * @param user - The current authenticated user (used to trigger re-detection on auth changes)
 * @returns AppStateDetection object with current state and refresh capability
 * 
 * @example
 * ```typescript
 * const detection = useAppStateDetection(user);
 * 
 * if (!detection.hasPlayers && !detection.isLoading) {
 *   // Show confirmation before allowing game creation
 *   const shouldAddPlayers = confirm("Add players first?");
 *   if (shouldAddPlayers) openRosterModal();
 * }
 * ```
 */
export function useAppStateDetection(user: unknown): AppStateDetection {
  const [detection, setDetection] = useState<AppStateDetection>({
    hasPlayers: false,
    hasSavedGames: false,
    hasSeasonsTournaments: false,
    isFirstTimeUser: true,
    canResume: false,
    isLoading: true,
  });

  const checkAppState = useCallback(async () => {
    try {
      logger.debug('[useAppStateDetection] Starting state detection check');
      
      // Small delay for auth stabilization (from original useResumeAvailability pattern)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check all data sources in parallel for better performance
      const [
        masterRoster,
        savedGames,
        seasons,
        tournaments,
        currentGameId,
        mostRecentGameId,
      ] = await Promise.all([
        getMasterRoster().catch(() => []),
        getSavedGames().catch(() => ({})),
        storageManager.getSeasons().catch(() => []),
        storageManager.getTournaments().catch(() => []),
        getCurrentGameIdSetting().catch(() => null),
        getMostRecentGameId().catch(() => null),
      ]);

      // Calculate detection state
      const hasPlayers = masterRoster.length > 0;
      const savedGamesArray = savedGames && typeof savedGames === 'object' ? Object.keys(savedGames) : [];
      const hasSavedGames = savedGamesArray.length > 0;
      const hasSeasonsTournaments = seasons.length > 0 || tournaments.length > 0;

      // Resume logic (from original useResumeAvailability)
      let canResume = false;
      if (currentGameId && savedGames && typeof savedGames === 'object' && currentGameId in savedGames) {
        canResume = true;
      } else if (mostRecentGameId && savedGames && typeof savedGames === 'object' && mostRecentGameId in savedGames) {
        canResume = true;
      }

      // First-time user detection: lacks players OR saved games
      const isFirstTimeUser = !hasPlayers || !hasSavedGames;

      const newDetection: AppStateDetection = {
        hasPlayers,
        hasSavedGames,
        hasSeasonsTournaments,
        isFirstTimeUser,
        canResume,
        isLoading: false,
      };

      logger.debug('[useAppStateDetection] Detection results:', newDetection);
      setDetection(newDetection);
      
    } catch (error) {
      logger.error('[useAppStateDetection] Error during state detection:', error);
      // On error, assume safe defaults (first-time user state)
      setDetection({
        hasPlayers: false,
        hasSavedGames: false,
        hasSeasonsTournaments: false,
        isFirstTimeUser: true,
        canResume: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const performCheck = async () => {
      await checkAppState();
    };

    if (isMounted) {
      performCheck();
    }

    return () => {
      isMounted = false;
    };
  }, [checkAppState, user]);

  // Provide a way to manually refresh detection (useful after user adds data)
  const refreshDetection = useCallback(() => {
    logger.debug('[useAppStateDetection] Manual refresh requested');
    setDetection(prev => ({ ...prev, isLoading: true }));
    checkAppState();
  }, [checkAppState]);

  // Expose refresh method via detection object for external use with memoization
  // to prevent unnecessary re-renders in consuming components
  return useMemo(() => ({
    ...detection,
    refreshDetection,
  }), [detection, refreshDetection]);
}