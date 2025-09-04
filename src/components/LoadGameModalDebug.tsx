import React, { useEffect } from 'react';
import { SavedGamesCollection } from '@/types';
import logger from '@/utils/logger';

interface LoadGameModalDebugProps {
  savedGames: SavedGamesCollection;
}

export const LoadGameModalDebug: React.FC<LoadGameModalDebugProps> = ({ savedGames }) => {
  useEffect(() => {
    logger.debug('[LoadGameModalDebug] Saved games data structure:', {
      totalGames: Object.keys(savedGames).length,
      gameIds: Object.keys(savedGames),
    });

    // Log first 3 games to see their structure
    Object.entries(savedGames).slice(0, 3).forEach(([gameId, game]) => {
      logger.debug(`[LoadGameModalDebug] Game ${gameId}:`, {
        teamName: game.teamName,
        opponentName: game.opponentName,
        homeOrAway: game.homeOrAway,
        seasonId: game.seasonId,
        tournamentId: game.tournamentId,
        gameDate: game.gameDate,
        gameTime: game.gameTime,
        gameLocation: game.gameLocation,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        isPlayed: game.isPlayed,
        hasAllFields: Boolean(
          game.teamName && 
          game.opponentName && 
          game.seasonId && 
          game.gameDate
        ),
      });
    });
  }, [savedGames]);

  return null;
};

export default LoadGameModalDebug;