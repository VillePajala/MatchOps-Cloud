import type { AppState, Player, Season, Tournament, GameEvent, SavedGamesCollection } from '@/types';

/**
 * Type guard functions for runtime validation
 * These help ensure data integrity and replace unsafe type casting
 */

export function isPlayer(obj: unknown): obj is Player {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const candidate = obj as Record<string, unknown>;
  return (
    'id' in candidate &&
    'name' in candidate &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.isGoalie === 'boolean'
  );
}

export function isAppState(obj: unknown): obj is AppState {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const state = obj as Record<string, unknown>;
  
  return (
    Array.isArray(state.playersOnField) &&
    Array.isArray(state.opponents) &&
    Array.isArray(state.drawings) &&
    Array.isArray(state.availablePlayers) &&
    Array.isArray(state.gameEvents) &&
    Array.isArray(state.selectedPlayerIds) &&
    Array.isArray(state.tacticalDiscs) &&
    Array.isArray(state.tacticalDrawings) &&
    typeof state.showPlayerNames === 'boolean' &&
    typeof state.teamName === 'string' &&
    typeof state.opponentName === 'string' &&
    typeof state.gameDate === 'string' &&
    typeof state.homeScore === 'number' &&
    typeof state.awayScore === 'number' &&
    typeof state.gameNotes === 'string' &&
    (state.homeOrAway === 'home' || state.homeOrAway === 'away') &&
    (state.numberOfPeriods === 1 || state.numberOfPeriods === 2) &&
    typeof state.periodDurationMinutes === 'number' &&
    typeof state.currentPeriod === 'number' &&
    typeof state.gameStatus === 'string' && ['notStarted', 'inProgress', 'periodEnd', 'gameEnd'].includes(state.gameStatus) &&
    typeof state.seasonId === 'string' &&
    typeof state.tournamentId === 'string'
  );
}

export function isSeason(obj: unknown): obj is Season {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const candidate = obj as Record<string, unknown>;
  return (
    'id' in candidate &&
    'name' in candidate &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.periodCount === 'number' &&
    typeof candidate.periodDuration === 'number' &&
    typeof candidate.archived === 'boolean'
  );
}

export function isTournament(obj: unknown): obj is Tournament {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const candidate = obj as Record<string, unknown>;
  return (
    'id' in candidate &&
    'name' in candidate &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.periodCount === 'number' &&
    typeof candidate.periodDuration === 'number' &&
    typeof candidate.archived === 'boolean'
  );
}

export function isGameEvent(obj: unknown): obj is GameEvent {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const event = obj as Record<string, unknown>;
  
  return (
    typeof event.id === 'string' &&
    typeof event.time === 'number' &&
    typeof event.type === 'string' && ['goal', 'opponentGoal', 'substitution', 'periodEnd', 'gameEnd', 'fairPlayCard'].includes(event.type)
  );
}

export function isSavedGamesCollection(obj: unknown): obj is SavedGamesCollection {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false;
  }

  // Check if all values are valid AppState objects
  for (const [key, value] of Object.entries(obj)) {
    if (typeof key !== 'string' || !isAppState(value)) {
      return false;
    }
  }

  return true;
}

export function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

/**
 * Validates that an object has the expected structure for storage operations
 */
export function isValidStorageData(obj: unknown, expectedKeys: string[] = []): obj is Record<string, unknown> {
  if (!isRecord(obj)) {
    return false;
  }

  // Check if all expected keys are present
  for (const key of expectedKeys) {
    if (!(key in obj)) {
      return false;
    }
  }

  return true;
}