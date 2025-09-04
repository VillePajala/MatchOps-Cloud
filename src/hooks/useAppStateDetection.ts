import { useState, useEffect, useCallback } from 'react';
import { getMasterRoster } from '@/utils/masterRosterManager';
import { getSavedGames, getMostRecentGameId } from '@/utils/savedGames';
import { getCurrentGameIdSetting } from '@/utils/appSettings';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';

export interface AppStateDetection {
  hasPlayers: boolean;
  hasSavedGames: boolean;
  hasSeasonsTournaments: boolean;
  isFirstTimeUser: boolean;
  canResume: boolean;
  isLoading: boolean;
}

/**
 * Hook that detects the current state of user data to enable smart UI behavior.
 * Replaces and extends useResumeAvailability with comprehensive state detection.
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
      const savedGamesArray = Object.keys(savedGames);
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
  }, [user]);

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

  // Expose refresh method via detection object for external use
  return {
    ...detection,
    // @ts-ignore - Adding refresh method to return object
    refreshDetection,
  };
}