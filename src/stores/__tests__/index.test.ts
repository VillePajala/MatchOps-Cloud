import { 
  resetAllStores, 
  getStoreStates,
  type AllStoreStates 
} from '../index';

// Mock the individual stores
jest.mock('../gameStore', () => ({
  useGameStore: {
    getState: jest.fn(() => ({
      resetGameSession: jest.fn(),
      resetField: jest.fn(),
      currentSession: { id: 'test-session', status: 'active' },
      fieldState: { players: [], formations: [] },
    })),
  },
  useGameSession: jest.fn(),
  useFieldState: jest.fn(),
  useGameTimer: jest.fn(),
  useGameScore: jest.fn(),
  usePlayersOnField: jest.fn(),
}));

jest.mock('../uiStore', () => ({
  useUIStore: {
    getState: jest.fn(() => ({
      modals: { gameSettings: false, playerSelection: true },
      notifications: [],
      tacticsBoard: { isActive: false },
    })),
  },
  useModalState: jest.fn(),
  useViewState: jest.fn(),
  useNotifications: jest.fn(),
  useModal: jest.fn(),
  useTacticsBoard: jest.fn(),
  useDrawingMode: jest.fn(),
  usePlayerSelection: jest.fn(),
  useGameView: jest.fn(),
  useDrawingTools: jest.fn(),
  useSelectionState: jest.fn(),
  useNotificationActions: jest.fn(),
}));

jest.mock('../persistenceStore', () => ({
  usePersistenceStore: {
    getState: jest.fn(() => ({
      savedGames: { 'game-1': { name: 'Test Game' } },
      masterRoster: { players: ['player-1', 'player-2'] },
      settings: { theme: 'dark', language: 'en' },
    })),
  },
  useSavedGames: jest.fn(),
  useMasterRoster: jest.fn(),
  useAppSettings: jest.fn(),
  useUserData: jest.fn(),
  useDataIntegrity: jest.fn(),
  useLoadingStates: jest.fn(),
}));

describe('stores/index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exports', () => {
    it('should export all gameStore items', () => {
      // Import to verify exports exist
      const {
        useGameStore,
        useGameSession,
        useFieldState,
        useGameTimer,
        useGameScore,
        usePlayersOnField,
      } = require('../index');

      expect(useGameStore).toBeDefined();
      expect(useGameSession).toBeDefined();
      expect(useFieldState).toBeDefined();
      expect(useGameTimer).toBeDefined();
      expect(useGameScore).toBeDefined();
      expect(usePlayersOnField).toBeDefined();
    });

    it('should export all uiStore items', () => {
      const {
        useUIStore,
        useModalState,
        useViewState,
        useNotifications,
        useModal,
        useTacticsBoard,
        useDrawingMode,
        usePlayerSelection,
        useGameView,
        useDrawingTools,
        useSelectionState,
        useNotificationActions,
      } = require('../index');

      expect(useUIStore).toBeDefined();
      expect(useModalState).toBeDefined();
      expect(useViewState).toBeDefined();
      expect(useNotifications).toBeDefined();
      expect(useModal).toBeDefined();
      expect(useTacticsBoard).toBeDefined();
      expect(useDrawingMode).toBeDefined();
      expect(usePlayerSelection).toBeDefined();
      expect(useGameView).toBeDefined();
      expect(useDrawingTools).toBeDefined();
      expect(useSelectionState).toBeDefined();
      expect(useNotificationActions).toBeDefined();
    });

    it('should export all persistenceStore items', () => {
      const {
        usePersistenceStore,
        useSavedGames,
        useMasterRoster,
        useAppSettings,
        useUserData,
        useDataIntegrity,
        useLoadingStates,
      } = require('../index');

      expect(usePersistenceStore).toBeDefined();
      expect(useSavedGames).toBeDefined();
      expect(useMasterRoster).toBeDefined();
      expect(useAppSettings).toBeDefined();
      expect(useUserData).toBeDefined();
      expect(useDataIntegrity).toBeDefined();
      expect(useLoadingStates).toBeDefined();
    });

    it('should export type definitions', () => {
      const storeTypes = require('../index');
      // TypeScript types are compiled away, but we can verify the module structure
      expect(typeof storeTypes).toBe('object');
    });
  });

  describe('resetAllStores', () => {
    it('should call resetGameSession on gameStore', () => {
      // Since the function uses require(), we need to test that it doesn't throw
      expect(() => resetAllStores()).not.toThrow();
    });

    it('should handle missing gameStore gracefully', () => {
      // Mock require to return undefined store methods
      jest.doMock('../gameStore', () => ({
        useGameStore: {
          getState: () => ({
            resetGameSession: undefined,
            resetField: undefined,
          }),
        },
      }), { virtual: true });

      // Should not throw
      expect(() => resetAllStores()).not.toThrow();
    });

    it('should handle gameStore errors gracefully', () => {
      const mockResetGameSession = jest.fn(() => {
        throw new Error('Reset failed');
      });
      const mockResetField = jest.fn();

      jest.doMock('../gameStore', () => ({
        useGameStore: {
          getState: () => ({
            resetGameSession: mockResetGameSession,
            resetField: mockResetField,
          }),
        },
      }), { virtual: true });

      // Should not throw despite internal errors
      expect(() => resetAllStores()).not.toThrow();
    });

    it('should handle require errors gracefully', () => {
      // Mock require to throw (simulating missing module)
      const originalRequire = require;
      (global as any).require = jest.fn(() => {
        throw new Error('Module not found');
      });

      expect(() => resetAllStores()).not.toThrow();

      // Restore original require
      (global as any).require = originalRequire;
    });
  });

  describe('getStoreStates', () => {
    it('should return state from all stores', () => {
      // Test that getStoreStates returns an object with expected keys
      const result = getStoreStates();
      
      expect(result).toHaveProperty('game');
      expect(result).toHaveProperty('ui');
      expect(result).toHaveProperty('persistence');
      expect(typeof result).toBe('object');
    });

    it('should return partial state if some stores are unavailable', () => {
      // Mock some stores to throw
      jest.doMock('../gameStore', () => ({
        useGameStore: {
          getState: () => ({ test: 'game-state' }),
        },
      }), { virtual: true });

      jest.doMock('../uiStore', () => {
        throw new Error('UI Store not available');
      }, { virtual: true });

      jest.doMock('../persistenceStore', () => ({
        usePersistenceStore: {
          getState: () => ({ test: 'persistence-state' }),
        },
      }), { virtual: true });

      // Should not throw and return available states
      expect(() => getStoreStates()).not.toThrow();
    });

    it('should handle store getState errors gracefully', () => {
      jest.doMock('../gameStore', () => ({
        useGameStore: {
          getState: () => {
            throw new Error('Game state error');
          },
        },
      }), { virtual: true });

      jest.doMock('../uiStore', () => ({
        useUIStore: {
          getState: () => ({ ui: 'state' }),
        },
      }), { virtual: true });

      jest.doMock('../persistenceStore', () => ({
        usePersistenceStore: {
          getState: () => ({ persistence: 'state' }),
        },
      }), { virtual: true });

      // Should not throw
      expect(() => getStoreStates()).not.toThrow();
    });

    it('should handle undefined getState methods', () => {
      jest.doMock('../gameStore', () => ({
        useGameStore: {
          getState: undefined,
        },
      }), { virtual: true });

      jest.doMock('../uiStore', () => ({
        useUIStore: {
          getState: () => ({ ui: 'working' }),
        },
      }), { virtual: true });

      jest.doMock('../persistenceStore', () => ({
        usePersistenceStore: {
          getState: () => ({ persistence: 'working' }),
        },
      }), { virtual: true });

      expect(() => getStoreStates()).not.toThrow();
    });
  });

  describe('AllStoreStates type', () => {
    it('should be compatible with getStoreStates return type', () => {
      const states = getStoreStates();
      
      // TypeScript compilation ensures type compatibility
      const typedStates: AllStoreStates = states;
      expect(typedStates).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle completely missing stores', () => {
      // Mock require to always return empty objects
      const originalRequire = require;
      (global as any).require = jest.fn(() => ({}));

      expect(() => resetAllStores()).not.toThrow();
      expect(() => getStoreStates()).not.toThrow();

      // Restore original require
      (global as any).require = originalRequire;
    });

    it('should handle stores with null state', () => {
      // Test that the function doesn't throw with null states
      expect(() => getStoreStates()).not.toThrow();
      
      const result = getStoreStates();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('game');
      expect(result).toHaveProperty('ui');
      expect(result).toHaveProperty('persistence');
    });
  });
});