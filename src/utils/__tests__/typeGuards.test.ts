/**
 * Type Guards Tests - Comprehensive Coverage
 * 
 * Tests for runtime type validation utilities that ensure data integrity
 * and replace unsafe type casting throughout the application.
 */

import {
  isPlayer,
  isAppState,
  isSeason,
  isTournament,
  isGameEvent,
  isSavedGamesCollection,
  isRecord,
  isValidStorageData
} from '../typeGuards';
import type { Player, AppState, Season, Tournament, GameEvent } from '@/types';

describe('Type Guards Utilities', () => {
  describe('isPlayer', () => {
    it('should return true for valid player objects', () => {
      const validPlayer: Player = {
        id: 'player-1',
        name: 'John Doe',
        nickname: 'John',
        color: '#FF0000',
        isGoalie: false,
        number: 10,
      };
      expect(isPlayer(validPlayer)).toBe(true);
    });

    it('should return true for minimal valid player', () => {
      const minimalPlayer = {
        id: 'p1',
        name: 'John',
        isGoalie: true,
      };
      expect(isPlayer(minimalPlayer)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isPlayer(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isPlayer(undefined)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(isPlayer({ id: 'p1', name: 'John' })).toBe(false); // missing isGoalie
      expect(isPlayer({ id: 'p1', isGoalie: false })).toBe(false); // missing name
      expect(isPlayer({ name: 'John', isGoalie: false })).toBe(false); // missing id
    });

    it('should return false for wrong field types', () => {
      expect(isPlayer({ id: 123, name: 'John', isGoalie: false })).toBe(false); // id should be string
      expect(isPlayer({ id: 'p1', name: 123, isGoalie: false })).toBe(false); // name should be string
      expect(isPlayer({ id: 'p1', name: 'John', isGoalie: 'yes' })).toBe(false); // isGoalie should be boolean
    });

    it('should return false for arrays and primitives', () => {
      expect(isPlayer([])).toBe(false);
      expect(isPlayer('player')).toBe(false);
      expect(isPlayer(123)).toBe(false);
      expect(isPlayer(true)).toBe(false);
    });
  });

  describe('isAppState', () => {
    const createValidAppState = (): AppState => ({
      gameId: 'game1',
      teamName: 'Test Team',
      opponentName: 'Opponent',
      gameDate: '2024-01-01',
      homeScore: 0,
      awayScore: 0,
      gameNotes: '',
      homeOrAway: 'home',
      numberOfPeriods: 2,
      periodDurationMinutes: 45,
      currentPeriod: 1,
      gameStatus: 'notStarted',
      seasonId: 'season1',
      tournamentId: 'tournament1',
      gamePhase: 'firstHalf',
      timeElapsedInSeconds: 0,
      isPlayed: false,
      playersOnField: [],
      opponents: [],
      drawings: [],
      availablePlayers: [],
      gameEvents: [],
      selectedPlayerIds: [],
      tacticalDiscs: [],
      tacticalDrawings: [],
      tacticalBallPosition: { relX: 0.5, relY: 0.5 },
      completedIntervalDurations: [],
      lastSubConfirmationTimeSeconds: null,
      showPlayerNames: true,
    });

    it('should return true for valid AppState', () => {
      expect(isAppState(createValidAppState())).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isAppState(null)).toBe(false);
      expect(isAppState(undefined)).toBe(false);
    });

    it('should return false for missing required arrays', () => {
      const invalidState = createValidAppState();
      delete (invalidState as any).playersOnField;
      expect(isAppState(invalidState)).toBe(false);
    });

    it('should return false for non-array where array expected', () => {
      const invalidState = { ...createValidAppState(), playersOnField: 'not-an-array' as any };
      expect(isAppState(invalidState)).toBe(false);
    });

    it('should return false for invalid homeOrAway value', () => {
      const invalidState = { ...createValidAppState(), homeOrAway: 'neutral' as any };
      expect(isAppState(invalidState)).toBe(false);
    });

    it('should return false for invalid numberOfPeriods', () => {
      const invalidState = { ...createValidAppState(), numberOfPeriods: 3 as any };
      expect(isAppState(invalidState)).toBe(false);
    });

    it('should return false for invalid gameStatus', () => {
      const invalidState = { ...createValidAppState(), gameStatus: 'invalid' as any };
      expect(isAppState(invalidState)).toBe(false);
    });

    it('should return false for wrong types', () => {
      expect(isAppState({ ...createValidAppState(), homeScore: '0' as any })).toBe(false); // should be number
      expect(isAppState({ ...createValidAppState(), teamName: 123 as any })).toBe(false); // should be string
      expect(isAppState({ ...createValidAppState(), showPlayerNames: 'true' as any })).toBe(false); // should be boolean
    });
  });

  describe('isSeason', () => {
    const validSeason: Season = {
      id: 's1',
      name: 'Season 2024',
      periodCount: 2,
      periodDuration: 45,
      archived: false,
    };

    it('should return true for valid season', () => {
      expect(isSeason(validSeason)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isSeason(null)).toBe(false);
      expect(isSeason(undefined)).toBe(false);
    });

    it('should return false for missing fields', () => {
      expect(isSeason({ id: 's1', name: 'Season' })).toBe(false);
      expect(isSeason({ name: 'Season', periodCount: 2, periodDuration: 45, archived: false })).toBe(false);
    });

    it('should return false for wrong types', () => {
      expect(isSeason({ ...validSeason, periodCount: '2' as any })).toBe(false);
      expect(isSeason({ ...validSeason, archived: 'false' as any })).toBe(false);
    });
  });

  describe('isTournament', () => {
    const validTournament: Tournament = {
      id: 't1',
      name: 'Tournament 2024',
      periodCount: 2,
      periodDuration: 45,
      archived: false,
    };

    it('should return true for valid tournament', () => {
      expect(isTournament(validTournament)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isTournament(null)).toBe(false);
      expect(isTournament(undefined)).toBe(false);
    });

    it('should return false for missing fields', () => {
      expect(isTournament({ id: 't1', name: 'Tournament' })).toBe(false);
    });

    it('should return false for wrong types', () => {
      expect(isTournament({ ...validTournament, id: 123 as any })).toBe(false);
      expect(isTournament({ ...validTournament, periodDuration: '45' as any })).toBe(false);
    });
  });

  describe('isGameEvent', () => {
    const validGoalEvent: GameEvent = {
      id: 'e1',
      time: 1234,
      type: 'goal',
      playerId: 'p1',
      scoringPlayer: 'p1',
      assistingPlayer: 'p2',
      homeScore: 1,
      awayScore: 0,
    };

    it('should return true for valid goal event', () => {
      expect(isGameEvent(validGoalEvent)).toBe(true);
    });

    it('should return true for valid substitution event', () => {
      const subEvent = {
        id: 'e2',
        time: 2345,
        type: 'substitution',
        playerId: 'p1',
        substitutePlayerId: 'p2',
      };
      expect(isGameEvent(subEvent)).toBe(true);
    });

    it('should return true for valid period end event', () => {
      const periodEndEvent = {
        id: 'e3',
        time: 2700,
        type: 'periodEnd',
      };
      expect(isGameEvent(periodEndEvent)).toBe(true);
    });

    it('should return true for opponent goal event', () => {
      const opponentGoalEvent = {
        id: 'e4',
        time: 1800,
        type: 'opponentGoal',
        homeScore: 0,
        awayScore: 1,
      };
      expect(isGameEvent(opponentGoalEvent)).toBe(true);
    });

    it('should return true for fair play card event', () => {
      const fairPlayEvent = {
        id: 'e5',
        time: 2000,
        type: 'fairPlayCard',
        playerId: 'p1',
        cardType: 'yellow',
      };
      expect(isGameEvent(fairPlayEvent)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isGameEvent(null)).toBe(false);
      expect(isGameEvent(undefined)).toBe(false);
    });

    it('should return false for invalid event type', () => {
      const invalidEvent = {
        id: 'e1',
        time: 1234,
        type: 'invalid-type',
      };
      expect(isGameEvent(invalidEvent)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(isGameEvent({ id: 'e1', time: 1234 })).toBe(false); // missing type
      expect(isGameEvent({ id: 'e1', type: 'goal' })).toBe(false); // missing time
      expect(isGameEvent({ time: 1234, type: 'goal' })).toBe(false); // missing id
    });

    it('should return false for wrong types', () => {
      expect(isGameEvent({ id: 'e1', time: '1234', type: 'goal' })).toBe(false);
      expect(isGameEvent({ id: 123, time: 1234, type: 'goal' })).toBe(false);
    });
  });

  describe('isSavedGamesCollection', () => {
    const createValidAppState = (): AppState => ({
      gameId: 'game1',
      teamName: 'Test Team',
      opponentName: 'Opponent',
      gameDate: '2024-01-01',
      homeScore: 0,
      awayScore: 0,
      gameNotes: '',
      homeOrAway: 'home',
      numberOfPeriods: 2,
      periodDurationMinutes: 45,
      currentPeriod: 1,
      gameStatus: 'notStarted',
      seasonId: 'season1',
      tournamentId: 'tournament1',
      gamePhase: 'firstHalf',
      timeElapsedInSeconds: 0,
      isPlayed: false,
      playersOnField: [],
      opponents: [],
      drawings: [],
      availablePlayers: [],
      gameEvents: [],
      selectedPlayerIds: [],
      tacticalDiscs: [],
      tacticalDrawings: [],
      tacticalBallPosition: { relX: 0.5, relY: 0.5 },
      completedIntervalDurations: [],
      lastSubConfirmationTimeSeconds: null,
      showPlayerNames: true,
    });

    it('should return true for valid saved games collection', () => {
      const collection = {
        game1: createValidAppState(),
        game2: { ...createValidAppState(), gameId: 'game2' },
      };
      expect(isSavedGamesCollection(collection)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isSavedGamesCollection({})).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isSavedGamesCollection(null)).toBe(false);
      expect(isSavedGamesCollection(undefined)).toBe(false);
    });

    it('should return false if any value is not valid AppState', () => {
      const invalidCollection = {
        game1: createValidAppState(),
        game2: { invalid: 'data' },
      };
      expect(isSavedGamesCollection(invalidCollection)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isSavedGamesCollection([createValidAppState()])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isSavedGamesCollection('string')).toBe(false);
      expect(isSavedGamesCollection(123)).toBe(false);
      expect(isSavedGamesCollection(true)).toBe(false);
    });
  });

  describe('isRecord', () => {
    it('should return true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
      expect(isRecord({ nested: { object: true } })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isRecord(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRecord(undefined)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(true)).toBe(false);
    });

    it('should return true for objects with null prototype', () => {
      const obj = Object.create(null);
      obj.key = 'value';
      expect(isRecord(obj)).toBe(true);
    });

    it('should return true for class instances', () => {
      class TestClass {
        value = 42;
      }
      expect(isRecord(new TestClass())).toBe(true);
    });
  });

  describe('isValidStorageData', () => {
    it('should return true for valid storage data with expected keys', () => {
      const data = {
        id: '123',
        name: 'Test',
        value: 42,
      };
      expect(isValidStorageData(data, ['id', 'name', 'value'])).toBe(true);
    });

    it('should return true for object with no expected keys specified', () => {
      expect(isValidStorageData({ any: 'data' })).toBe(true);
      expect(isValidStorageData({})).toBe(true);
    });

    it('should return false if expected keys are missing', () => {
      const data = { id: '123', name: 'Test' };
      expect(isValidStorageData(data, ['id', 'name', 'value'])).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isValidStorageData(null)).toBe(false);
      expect(isValidStorageData(undefined)).toBe(false);
      expect(isValidStorageData(null, ['id'])).toBe(false);
      expect(isValidStorageData(undefined, ['id'])).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isValidStorageData([])).toBe(false);
      expect(isValidStorageData(['id', 'name'])).toBe(false);
      expect(isValidStorageData([], ['id'])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isValidStorageData('string')).toBe(false);
      expect(isValidStorageData(123)).toBe(false);
      expect(isValidStorageData(true)).toBe(false);
    });

    it('should handle nested objects correctly', () => {
      const data = {
        id: '123',
        nested: {
          value: 'test',
        },
      };
      expect(isValidStorageData(data, ['id', 'nested'])).toBe(true);
    });

    it('should handle undefined values in expected keys', () => {
      const data = {
        id: '123',
        name: undefined,
      };
      expect(isValidStorageData(data, ['id', 'name'])).toBe(true); // key exists even if value is undefined
    });

    it('should return true for extra keys beyond expected', () => {
      const data = {
        id: '123',
        name: 'Test',
        extra: 'data',
      };
      expect(isValidStorageData(data, ['id', 'name'])).toBe(true);
    });

    it('should handle empty string in expected keys', () => {
      const data = { '': 'empty key' };
      expect(isValidStorageData(data, [''])).toBe(true);
    });
  });
});