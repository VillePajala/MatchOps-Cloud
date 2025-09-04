/**
 * Type Validation Utilities Tests - Critical Input Safety
 * 
 * Tests for safe type casting with runtime validation utilities.
 * These functions prevent unsafe type casting that could crash the app.
 */

import {
  validateSavedGamesCollection,
  validateAppState,
  safeCast,
  safeCastWithFallback,
  type ValidationResult
} from '../typeValidation';
import type { SavedGamesCollection, AppState } from '@/types';
import logger from '../logger';

// Mock logger to prevent console spam in tests
jest.mock('../logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Type Validation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSavedGamesCollection', () => {
    describe('Valid collections', () => {
      it('should validate empty collection', () => {
        const result = validateSavedGamesCollection({});
        
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual({});
        expect(result.error).toBeUndefined();
      });

      it('should validate collection with single game', () => {
        const validCollection = {
          'game-1': {
            teamName: 'Test Team',
            homeScore: 2,
            awayScore: 1,
            gameEvents: []
          }
        };
        
        const result = validateSavedGamesCollection(validCollection);
        
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(validCollection);
        expect(result.error).toBeUndefined();
      });

      it('should validate collection with multiple games', () => {
        const validCollection = {
          'game-1': {
            teamName: 'Team A',
            homeScore: 3,
            awayScore: 0,
            additionalField: 'allowed'
          },
          'game-2': {
            teamName: 'Team B',
            homeScore: 1,
            awayScore: 2,
            extraData: { nested: true }
          }
        };
        
        const result = validateSavedGamesCollection(validCollection);
        
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(validCollection);
      });

      it('should allow additional fields beyond required ones', () => {
        const collectionWithExtras = {
          'game-1': {
            teamName: 'Test Team',
            homeScore: 1,
            awayScore: 0,
            gameId: 'game-1',
            timestamp: '2024-01-01',
            metadata: { version: '1.0' }
          }
        };
        
        const result = validateSavedGamesCollection(collectionWithExtras);
        
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(collectionWithExtras);
      });
    });

    describe('Invalid collections', () => {
      it('should reject null input', () => {
        const result = validateSavedGamesCollection(null);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Data is not an object');
        expect(result.data).toBeUndefined();
      });

      it('should reject undefined input', () => {
        const result = validateSavedGamesCollection(undefined);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Data is not an object');
      });

      it('should reject primitive values', () => {
        expect(validateSavedGamesCollection('string').isValid).toBe(false);
        expect(validateSavedGamesCollection(123).isValid).toBe(false);
        expect(validateSavedGamesCollection(true).isValid).toBe(false);
        // Note: Empty array is technically an object in JS, so it passes the initial check
        // but would fail if it had properties that weren't objects
        expect(validateSavedGamesCollection([]).isValid).toBe(true); // Empty array is valid (no games to validate)
      });

      it('should reject games that are not objects', () => {
        const invalidCollection = {
          'game-1': 'not an object',
          'game-2': { teamName: 'Valid', homeScore: 0, awayScore: 0 }
        };
        
        const result = validateSavedGamesCollection(invalidCollection);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Game game-1 is not an object');
      });

      it('should reject games missing required fields', () => {
        const incompleteCollection = {
          'game-1': {
            teamName: 'Test Team',
            homeScore: 1
            // Missing awayScore
          }
        };
        
        const result = validateSavedGamesCollection(incompleteCollection);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Game game-1 missing required field: awayScore');
      });

      it('should identify the first missing field', () => {
        const incompleteCollection = {
          'game-1': {
            // Missing teamName, homeScore, awayScore
            otherField: 'value'
          }
        };
        
        const result = validateSavedGamesCollection(incompleteCollection);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Game game-1 missing required field: teamName');
      });

      it('should handle validation errors gracefully', () => {
        // Test error handling by creating an object that throws during Object.entries()
        const problematicObject = {
          'game-1': {
            teamName: 'Valid Game',
            homeScore: 0,
            awayScore: 0
          }
        };
        
        // Override Object.entries to throw an error for this specific test
        const originalEntries = Object.entries;
        Object.entries = jest.fn().mockImplementation((obj) => {
          if (obj === problematicObject) {
            throw new Error('Iteration error');
          }
          return originalEntries(obj);
        });
        
        const result = validateSavedGamesCollection(problematicObject);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Validation error: Iteration error');
        
        // Restore original function
        Object.entries = originalEntries;
      });
    });
  });

  describe('validateAppState', () => {
    const validAppState = {
      teamName: 'Test Team',
      homeScore: 2,
      awayScore: 1,
      gameEvents: [],
      selectedPlayerIds: []
    };

    describe('Valid app states', () => {
      it('should validate minimal valid app state', () => {
        const result = validateAppState(validAppState);
        
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(validAppState);
        expect(result.error).toBeUndefined();
      });

      it('should validate app state with additional fields', () => {
        const extendedAppState = {
          ...validAppState,
          gameId: 'test-game',
          opponentName: 'Opponent Team',
          gamePhase: 'firstHalf',
          playersOnField: [],
          drawings: []
        };
        
        const result = validateAppState(extendedAppState);
        
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(extendedAppState);
      });

      it('should validate app state with complex game events', () => {
        const appStateWithEvents = {
          ...validAppState,
          gameEvents: [
            { type: 'goal', timestamp: 1234567890, playerId: 'p1' },
            { type: 'substitution', timestamp: 1234567900, in: 'p2', out: 'p3' }
          ]
        };
        
        const result = validateAppState(appStateWithEvents);
        
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(appStateWithEvents);
      });
    });

    describe('Invalid app states', () => {
      it('should reject null and undefined', () => {
        expect(validateAppState(null).isValid).toBe(false);
        expect(validateAppState(undefined).isValid).toBe(false);
        expect(validateAppState(null).error).toBe('Data is not an object');
      });

      it('should reject primitive values', () => {
        expect(validateAppState('string').isValid).toBe(false);
        expect(validateAppState(123).isValid).toBe(false);
        expect(validateAppState(true).isValid).toBe(false);
      });

      it('should reject objects missing required fields', () => {
        const incompleteState = {
          teamName: 'Test Team',
          homeScore: 1
          // Missing awayScore, gameEvents, selectedPlayerIds
        };
        
        const result = validateAppState(incompleteState);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Missing required field: awayScore');
      });

      it('should validate teamName type', () => {
        const invalidState = {
          ...validAppState,
          teamName: 123 // Should be string
        };
        
        const result = validateAppState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('teamName must be a string');
      });

      it('should validate score types', () => {
        const invalidHomeScore = {
          ...validAppState,
          homeScore: '2' // Should be number
        };
        
        const result1 = validateAppState(invalidHomeScore);
        expect(result1.isValid).toBe(false);
        expect(result1.error).toBe('homeScore and awayScore must be numbers');

        const invalidAwayScore = {
          ...validAppState,
          awayScore: null // Should be number
        };
        
        const result2 = validateAppState(invalidAwayScore);
        expect(result2.isValid).toBe(false);
        expect(result2.error).toBe('homeScore and awayScore must be numbers');
      });

      it('should validate gameEvents array type', () => {
        const invalidState = {
          ...validAppState,
          gameEvents: 'not an array'
        };
        
        const result = validateAppState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('gameEvents must be an array');
      });

      it('should validate selectedPlayerIds array type', () => {
        const invalidState = {
          ...validAppState,
          selectedPlayerIds: { notAn: 'array' }
        };
        
        const result = validateAppState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('selectedPlayerIds must be an array');
      });

      it('should handle validation errors gracefully', () => {
        // Test error handling with circular reference that causes JSON issues
        // This tests the try-catch block effectively
        const circularObj: any = {
          teamName: 'Test Team',
          homeScore: 1,
          awayScore: 0,
          gameEvents: [],
          selectedPlayerIds: []
        };
        
        // Make teamName a getter that throws when accessed during type checking
        Object.defineProperty(circularObj, 'teamName', {
          get: () => {
            throw new Error('Property access error');
          },
          enumerable: true,
          configurable: true
        });
        
        const result = validateAppState(circularObj);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Validation error');
      });
    });
  });

  describe('safeCast', () => {
    const mockValidator = jest.fn();

    beforeEach(() => {
      mockValidator.mockClear();
    });

    describe('Successful casting', () => {
      it('should return data when validation passes', () => {
        const testData = { test: 'value' };
        const validationResult: ValidationResult<any> = {
          isValid: true,
          data: testData
        };
        mockValidator.mockReturnValue(validationResult);

        const result = safeCast(testData, mockValidator, 'test context');

        expect(result).toEqual(testData);
        expect(mockValidator).toHaveBeenCalledWith(testData);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '[SafeCast] test context: Validation passed'
        );
      });

      it('should work with complex data types', () => {
        const complexData = {
          nested: { values: [1, 2, 3] },
          metadata: { version: '1.0' }
        };
        mockValidator.mockReturnValue({
          isValid: true,
          data: complexData
        });

        const result = safeCast(complexData, mockValidator, 'complex data');

        expect(result).toEqual(complexData);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '[SafeCast] complex data: Validation passed'
        );
      });
    });

    describe('Failed casting', () => {
      it('should throw error when validation fails', () => {
        const invalidData = { invalid: true };
        const validationResult: ValidationResult<any> = {
          isValid: false,
          error: 'Invalid data structure'
        };
        mockValidator.mockReturnValue(validationResult);

        expect(() => {
          safeCast(invalidData, mockValidator, 'error context');
        }).toThrow('Safe cast failed in error context: Invalid data structure');

        expect(mockLogger.error).toHaveBeenCalledWith(
          '[SafeCast] error context:',
          expect.any(Error)
        );
      });

      it('should include context in error message', () => {
        mockValidator.mockReturnValue({
          isValid: false,
          error: 'Test error'
        });

        expect(() => {
          safeCast({}, mockValidator, 'specific operation');
        }).toThrow('Safe cast failed in specific operation: Test error');
      });

      it('should handle missing error message', () => {
        mockValidator.mockReturnValue({
          isValid: false
          // No error message provided
        });

        expect(() => {
          safeCast({}, mockValidator, 'test');
        }).toThrow('Safe cast failed in test: undefined');
      });
    });
  });

  describe('safeCastWithFallback', () => {
    const mockValidator = jest.fn();

    beforeEach(() => {
      mockValidator.mockClear();
    });

    describe('Successful casting', () => {
      it('should return validated data when validation passes', () => {
        const testData = { valid: true };
        const fallback = { fallback: true };
        mockValidator.mockReturnValue({
          isValid: true,
          data: testData
        });

        const result = safeCastWithFallback(testData, mockValidator, fallback, 'test');

        expect(result).toEqual(testData);
        expect(result).not.toEqual(fallback);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '[SafeCast] test: Validation passed'
        );
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });
    });

    describe('Fallback scenarios', () => {
      it('should return fallback when validation fails', () => {
        const invalidData = { invalid: true };
        const fallback = { safe: 'fallback' };
        mockValidator.mockReturnValue({
          isValid: false,
          error: 'Validation failed'
        });

        const result = safeCastWithFallback(invalidData, mockValidator, fallback, 'fallback test');

        expect(result).toEqual(fallback);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          '[SafeCast] fallback test: Using fallback due to validation failure'
        );
        expect(mockLogger.error).toHaveBeenCalled(); // From the underlying safeCast
      });

      it('should work with primitive fallbacks', () => {
        mockValidator.mockReturnValue({ isValid: false, error: 'Failed' });

        expect(safeCastWithFallback({}, mockValidator, 'default string', 'test')).toBe('default string');
        expect(safeCastWithFallback({}, mockValidator, 42, 'test')).toBe(42);
        expect(safeCastWithFallback({}, mockValidator, true, 'test')).toBe(true);
      });

      it('should handle validator exceptions gracefully', () => {
        const fallback = { safe: true };
        mockValidator.mockImplementation(() => {
          throw new Error('Validator crashed');
        });

        const result = safeCastWithFallback({}, mockValidator, fallback, 'exception test');

        expect(result).toEqual(fallback);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          '[SafeCast] exception test: Using fallback due to validation failure'
        );
      });

      it('should preserve fallback reference for objects', () => {
        const fallback = { reference: 'test' };
        mockValidator.mockReturnValue({ isValid: false });

        const result = safeCastWithFallback({}, mockValidator, fallback, 'reference test');

        expect(result).toBe(fallback); // Same reference
        expect(result.reference).toBe('test');
      });
    });
  });

  describe('Integration with actual validators', () => {
    describe('validateSavedGamesCollection integration', () => {
      it('should work with safeCast', () => {
        const validCollection = {
          'game-1': {
            teamName: 'Team A',
            homeScore: 1,
            awayScore: 0
          }
        };

        const result = safeCast(
          validCollection,
          validateSavedGamesCollection,
          'collection test'
        );

        expect(result).toEqual(validCollection);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '[SafeCast] collection test: Validation passed'
        );
      });

      it('should work with safeCastWithFallback', () => {
        const invalidCollection = { 'game-1': 'not valid' };
        const fallback = {};

        const result = safeCastWithFallback(
          invalidCollection,
          validateSavedGamesCollection,
          fallback,
          'collection fallback'
        );

        expect(result).toBe(fallback);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          '[SafeCast] collection fallback: Using fallback due to validation failure'
        );
      });
    });

    describe('validateAppState integration', () => {
      it('should work with safeCast', () => {
        const validAppState = {
          teamName: 'Test Team',
          homeScore: 2,
          awayScore: 1,
          gameEvents: [],
          selectedPlayerIds: []
        };

        const result = safeCast(
          validAppState,
          validateAppState,
          'app state test'
        );

        expect(result).toEqual(validAppState);
      });

      it('should work with safeCastWithFallback for invalid data', () => {
        const invalidAppState = { teamName: 123 }; // Invalid type
        const fallback = {
          teamName: 'Default Team',
          homeScore: 0,
          awayScore: 0,
          gameEvents: [],
          selectedPlayerIds: []
        };

        const result = safeCastWithFallback(
          invalidAppState,
          validateAppState,
          fallback,
          'app state fallback'
        );

        expect(result).toBe(fallback);
      });
    });
  });
});