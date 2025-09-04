import {
  isGoalEvent,
  isOpponentGoalEvent,
  isSubstitutionEvent,
  isPeriodEndEvent,
  isGameEndEvent,
  isFairPlayCardEvent,
  hasScorerId,
  canHaveAssisterId,
  hasEntityId,
} from '../gameEventTypeGuards';
import type { GameEvent } from '@/types';

describe('gameEventTypeGuards', () => {
  // Mock game events for testing
  const goalEvent: GameEvent = {
    id: '1',
    type: 'goal',
    timestamp: Date.now(),
    scorerId: 'player1',
    assisterId: 'player2',
  };

  const opponentGoalEvent: GameEvent = {
    id: '2',
    type: 'opponentGoal',
    timestamp: Date.now(),
    scorerId: 'opponent1',
  };

  const substitutionEvent: GameEvent = {
    id: '3',
    type: 'substitution',
    timestamp: Date.now(),
    entityId: 'player1',
  };

  const periodEndEvent: GameEvent = {
    id: '4',
    type: 'periodEnd',
    timestamp: Date.now(),
  };

  const gameEndEvent: GameEvent = {
    id: '5',
    type: 'gameEnd',
    timestamp: Date.now(),
  };

  const fairPlayCardEvent: GameEvent = {
    id: '6',
    type: 'fairPlayCard',
    timestamp: Date.now(),
    entityId: 'player1',
  };

  describe('isGoalEvent', () => {
    it('should return true for goal events', () => {
      expect(isGoalEvent(goalEvent)).toBe(true);
    });

    it('should return false for non-goal events', () => {
      expect(isGoalEvent(opponentGoalEvent)).toBe(false);
      expect(isGoalEvent(substitutionEvent)).toBe(false);
      expect(isGoalEvent(periodEndEvent)).toBe(false);
      expect(isGoalEvent(gameEndEvent)).toBe(false);
      expect(isGoalEvent(fairPlayCardEvent)).toBe(false);
    });
  });

  describe('isOpponentGoalEvent', () => {
    it('should return true for opponent goal events', () => {
      expect(isOpponentGoalEvent(opponentGoalEvent)).toBe(true);
    });

    it('should return false for non-opponent goal events', () => {
      expect(isOpponentGoalEvent(goalEvent)).toBe(false);
      expect(isOpponentGoalEvent(substitutionEvent)).toBe(false);
      expect(isOpponentGoalEvent(periodEndEvent)).toBe(false);
      expect(isOpponentGoalEvent(gameEndEvent)).toBe(false);
      expect(isOpponentGoalEvent(fairPlayCardEvent)).toBe(false);
    });
  });

  describe('isSubstitutionEvent', () => {
    it('should return true for substitution events', () => {
      expect(isSubstitutionEvent(substitutionEvent)).toBe(true);
    });

    it('should return false for non-substitution events', () => {
      expect(isSubstitutionEvent(goalEvent)).toBe(false);
      expect(isSubstitutionEvent(opponentGoalEvent)).toBe(false);
      expect(isSubstitutionEvent(periodEndEvent)).toBe(false);
      expect(isSubstitutionEvent(gameEndEvent)).toBe(false);
      expect(isSubstitutionEvent(fairPlayCardEvent)).toBe(false);
    });
  });

  describe('isPeriodEndEvent', () => {
    it('should return true for period end events', () => {
      expect(isPeriodEndEvent(periodEndEvent)).toBe(true);
    });

    it('should return false for non-period end events', () => {
      expect(isPeriodEndEvent(goalEvent)).toBe(false);
      expect(isPeriodEndEvent(opponentGoalEvent)).toBe(false);
      expect(isPeriodEndEvent(substitutionEvent)).toBe(false);
      expect(isPeriodEndEvent(gameEndEvent)).toBe(false);
      expect(isPeriodEndEvent(fairPlayCardEvent)).toBe(false);
    });
  });

  describe('isGameEndEvent', () => {
    it('should return true for game end events', () => {
      expect(isGameEndEvent(gameEndEvent)).toBe(true);
    });

    it('should return false for non-game end events', () => {
      expect(isGameEndEvent(goalEvent)).toBe(false);
      expect(isGameEndEvent(opponentGoalEvent)).toBe(false);
      expect(isGameEndEvent(substitutionEvent)).toBe(false);
      expect(isGameEndEvent(periodEndEvent)).toBe(false);
      expect(isGameEndEvent(fairPlayCardEvent)).toBe(false);
    });
  });

  describe('isFairPlayCardEvent', () => {
    it('should return true for fair play card events', () => {
      expect(isFairPlayCardEvent(fairPlayCardEvent)).toBe(true);
    });

    it('should return false for non-fair play card events', () => {
      expect(isFairPlayCardEvent(goalEvent)).toBe(false);
      expect(isFairPlayCardEvent(opponentGoalEvent)).toBe(false);
      expect(isFairPlayCardEvent(substitutionEvent)).toBe(false);
      expect(isFairPlayCardEvent(periodEndEvent)).toBe(false);
      expect(isFairPlayCardEvent(gameEndEvent)).toBe(false);
    });
  });

  describe('hasScorerId', () => {
    it('should return true for goal events', () => {
      expect(hasScorerId(goalEvent)).toBe(true);
    });

    it('should return true for opponent goal events', () => {
      expect(hasScorerId(opponentGoalEvent)).toBe(true);
    });

    it('should return false for events without scorer', () => {
      expect(hasScorerId(substitutionEvent)).toBe(false);
      expect(hasScorerId(periodEndEvent)).toBe(false);
      expect(hasScorerId(gameEndEvent)).toBe(false);
      expect(hasScorerId(fairPlayCardEvent)).toBe(false);
    });
  });

  describe('canHaveAssisterId', () => {
    it('should return true only for goal events', () => {
      expect(canHaveAssisterId(goalEvent)).toBe(true);
    });

    it('should return false for all other event types', () => {
      expect(canHaveAssisterId(opponentGoalEvent)).toBe(false);
      expect(canHaveAssisterId(substitutionEvent)).toBe(false);
      expect(canHaveAssisterId(periodEndEvent)).toBe(false);
      expect(canHaveAssisterId(gameEndEvent)).toBe(false);
      expect(canHaveAssisterId(fairPlayCardEvent)).toBe(false);
    });
  });

  describe('hasEntityId', () => {
    it('should return true for substitution events', () => {
      expect(hasEntityId(substitutionEvent)).toBe(true);
    });

    it('should return true for fair play card events', () => {
      expect(hasEntityId(fairPlayCardEvent)).toBe(true);
    });

    it('should return false for events without entity ID', () => {
      expect(hasEntityId(goalEvent)).toBe(false);
      expect(hasEntityId(opponentGoalEvent)).toBe(false);
      expect(hasEntityId(periodEndEvent)).toBe(false);
      expect(hasEntityId(gameEndEvent)).toBe(false);
    });
  });

  describe('type narrowing behavior', () => {
    it('should properly narrow types for goal events', () => {
      if (isGoalEvent(goalEvent)) {
        // TypeScript should know this is a GoalEvent
        expect(goalEvent.scorerId).toBeDefined();
        expect(goalEvent.assisterId).toBeDefined();
      }
    });

    it('should properly narrow types for opponent goal events', () => {
      if (isOpponentGoalEvent(opponentGoalEvent)) {
        // TypeScript should know this is an OpponentGoalEvent
        expect(opponentGoalEvent.scorerId).toBeDefined();
      }
    });

    it('should properly narrow types for substitution events', () => {
      if (isSubstitutionEvent(substitutionEvent)) {
        // TypeScript should know this is a SubstitutionEvent
        expect(substitutionEvent.entityId).toBeDefined();
      }
    });

    it('should properly narrow types for fair play card events', () => {
      if (isFairPlayCardEvent(fairPlayCardEvent)) {
        // TypeScript should know this is a FairPlayCardEvent
        expect(fairPlayCardEvent.entityId).toBeDefined();
      }
    });

    it('should properly narrow types for events with scorer ID', () => {
      if (hasScorerId(goalEvent)) {
        // TypeScript should know this has a scorerId
        expect(goalEvent.scorerId).toBeDefined();
      }

      if (hasScorerId(opponentGoalEvent)) {
        // TypeScript should know this has a scorerId
        expect(opponentGoalEvent.scorerId).toBeDefined();
      }
    });

    it('should properly narrow types for events that can have assister', () => {
      if (canHaveAssisterId(goalEvent)) {
        // TypeScript should know this is a GoalEvent
        expect(goalEvent.scorerId).toBeDefined();
      }
    });

    it('should properly narrow types for events with entity ID', () => {
      if (hasEntityId(substitutionEvent)) {
        // TypeScript should know this has an entityId
        expect(substitutionEvent.entityId).toBeDefined();
      }

      if (hasEntityId(fairPlayCardEvent)) {
        // TypeScript should know this has an entityId
        expect(fairPlayCardEvent.entityId).toBeDefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle events with minimal required properties', () => {
      const minimalEvent: GameEvent = {
        id: 'minimal',
        type: 'periodEnd',
        timestamp: Date.now(),
      };

      expect(isPeriodEndEvent(minimalEvent)).toBe(true);
      expect(isGoalEvent(minimalEvent)).toBe(false);
      expect(hasScorerId(minimalEvent)).toBe(false);
      expect(hasEntityId(minimalEvent)).toBe(false);
    });

    it('should work with events that have extra properties', () => {
      const extendedEvent: GameEvent = {
        id: 'extended',
        type: 'goal',
        timestamp: Date.now(),
        scorerId: 'player1',
        assisterId: 'player2',
        // @ts-ignore - adding extra property for testing
        extraProperty: 'extra',
      };

      expect(isGoalEvent(extendedEvent)).toBe(true);
      expect(hasScorerId(extendedEvent)).toBe(true);
      expect(canHaveAssisterId(extendedEvent)).toBe(true);
    });

    it('should handle null/undefined checks', () => {
      const eventWithoutOptionalFields: GameEvent = {
        id: 'test',
        type: 'goal',
        timestamp: Date.now(),
        scorerId: 'player1',
        // assisterId is optional
      };

      expect(isGoalEvent(eventWithoutOptionalFields)).toBe(true);
      expect(canHaveAssisterId(eventWithoutOptionalFields)).toBe(true);
    });
  });
});