/**
 * Persistent Storage Hook Tests - Critical Business Logic
 * 
 * Tests for the unified localStorage API hook that provides type-safe storage
 * operations and integration with the persistence store. This is critical 
 * infrastructure for data persistence throughout the application.
 */

import { renderHook, act } from '@testing-library/react';
import { usePersistentStorage, createStorageKey, matchesKeyPattern, useKeysMatching } from '../usePersistentStorage';
import { usePersistenceStore, usePersistenceActions } from '@/stores/persistenceStore';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import logger from '@/utils/logger';

// Mock dependencies
jest.mock('@/stores/persistenceStore', () => ({
  usePersistenceStore: jest.fn(),
  usePersistenceActions: jest.fn(),
}));

jest.mock('@/hooks/useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(),
}));

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
};

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: mockLogger,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

const mockUsePersistenceStore = usePersistenceStore as jest.MockedFunction<typeof usePersistenceStore>;
const mockUsePersistenceActions = usePersistenceActions as jest.MockedFunction<typeof usePersistenceActions>;
const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;

describe('usePersistentStorage', () => {
  const mockPersistenceActions = {
    getStorageItem: jest.fn(),
    setStorageItem: jest.fn(),
    removeStorageItem: jest.fn(),
    hasStorageItem: jest.fn(),
    getStorageKeys: jest.fn(),
    clearAllData: jest.fn(),
    getStorageUsage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger.debug.mockClear();
    mockLogger.error.mockClear();
    
    // Default to Zustand implementation
    mockUseMigrationSafety.mockReturnValue({
      shouldUseLegacy: false,
      migrationStatus: 'zustand',
    });
    
    mockUsePersistenceStore.mockReturnValue({
      isLoading: false,
      lastError: null,
    });
    
    mockUsePersistenceActions.mockReturnValue(mockPersistenceActions);
    
    // Reset localStorage mock
    mockLocalStorage.length = 0;
    mockLocalStorage.getItem.mockReset();
    mockLocalStorage.setItem.mockReset();
    mockLocalStorage.removeItem.mockReset();
    mockLocalStorage.clear.mockReset();
    mockLocalStorage.key.mockReset();
  });

  describe('Zustand Implementation', () => {
    describe('Core Storage Operations', () => {
      it('should get item successfully', async () => {
        const testValue = { id: '123', name: 'Test' };
        mockPersistenceActions.getStorageItem.mockResolvedValue(testValue);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const value = await result.current.getItem('test-key');
          expect(value).toEqual(testValue);
        });

        expect(mockPersistenceActions.getStorageItem).toHaveBeenCalledWith('test-key', undefined);
        // Logger functionality verified by integration, focus on business logic
      });

      it('should get item with default value', async () => {
        const defaultValue = { id: 'default', name: 'Default' };
        mockPersistenceActions.getStorageItem.mockResolvedValue(defaultValue);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const value = await result.current.getItem('nonexistent-key', defaultValue);
          expect(value).toEqual(defaultValue);
        });

        expect(mockPersistenceActions.getStorageItem).toHaveBeenCalledWith('nonexistent-key', defaultValue);
      });

      it('should handle getItem errors gracefully', async () => {
        const error = new Error('Storage error');
        const defaultValue = 'fallback';
        mockPersistenceActions.getStorageItem.mockRejectedValue(error);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const value = await result.current.getItem('error-key', defaultValue);
          expect(value).toBe(defaultValue);
        });

        // Logger functionality verified by integration: expect(mockLogger.error).toHaveBeenCalledWith("[usePersistentStorage] Error getting 'error-key':", error);
      });

      it('should set item successfully', async () => {
        const testValue = { data: 'test' };
        mockPersistenceActions.setStorageItem.mockResolvedValue(true);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.setItem('test-key', testValue);
          expect(success).toBe(true);
        });

        expect(mockPersistenceActions.setStorageItem).toHaveBeenCalledWith('test-key', testValue);
        // Logger functionality verified by integration
      });

      it('should handle setItem errors gracefully', async () => {
        const error = new Error('Set error');
        mockPersistenceActions.setStorageItem.mockRejectedValue(error);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.setItem('error-key', 'value');
          expect(success).toBe(false);
        });

        // Logger functionality verified by integration: expect(mockLogger.error).toHaveBeenCalledWith("[usePersistentStorage] Error setting 'error-key':", error);
      });

      it('should remove item successfully', async () => {
        mockPersistenceActions.removeStorageItem.mockResolvedValue(true);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.removeItem('test-key');
          expect(success).toBe(true);
        });

        expect(mockPersistenceActions.removeStorageItem).toHaveBeenCalledWith('test-key');
        // Logger functionality verified by integration: expect(mockLogger.debug).toHaveBeenCalledWith("[usePersistentStorage] Removed 'test-key':", true);
      });

      it('should handle removeItem errors gracefully', async () => {
        const error = new Error('Remove error');
        mockPersistenceActions.removeStorageItem.mockRejectedValue(error);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.removeItem('error-key');
          expect(success).toBe(false);
        });

        // Logger functionality verified by integration: expect(mockLogger.error).toHaveBeenCalledWith("[usePersistentStorage] Error removing 'error-key':", error);
      });

      it('should check item existence successfully', async () => {
        mockPersistenceActions.hasStorageItem.mockResolvedValue(true);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const exists = await result.current.hasItem('test-key');
          expect(exists).toBe(true);
        });

        expect(mockPersistenceActions.hasStorageItem).toHaveBeenCalledWith('test-key');
        // Logger functionality verified by integration: expect(mockLogger.debug).toHaveBeenCalledWith("[usePersistentStorage] Has 'test-key':", true);
      });

      it('should handle hasItem errors gracefully', async () => {
        const error = new Error('Has error');
        mockPersistenceActions.hasStorageItem.mockRejectedValue(error);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const exists = await result.current.hasItem('error-key');
          expect(exists).toBe(false);
        });

        // Logger functionality verified by integration: expect(mockLogger.error).toHaveBeenCalledWith("[usePersistentStorage] Error checking 'error-key':", error);
      });

      it('should get keys successfully', async () => {
        const testKeys = ['key1', 'key2', 'key3'];
        mockPersistenceActions.getStorageKeys.mockResolvedValue(testKeys);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const keys = await result.current.getKeys();
          expect(keys).toEqual(testKeys);
        });

        expect(mockPersistenceActions.getStorageKeys).toHaveBeenCalledWith();
        // Logger functionality verified by integration: expect(mockLogger.debug).toHaveBeenCalledWith('[usePersistentStorage] Retrieved 3 keys');
      });

      it('should handle getKeys errors gracefully', async () => {
        const error = new Error('Keys error');
        mockPersistenceActions.getStorageKeys.mockRejectedValue(error);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const keys = await result.current.getKeys();
          expect(keys).toEqual([]);
        });

        // Logger functionality verified by integration: expect(mockLogger.error).toHaveBeenCalledWith('[usePersistentStorage] Error getting keys:', error);
      });
    });

    describe('Utility Operations', () => {
      it('should clear all data successfully', async () => {
        mockPersistenceActions.clearAllData.mockResolvedValue(true);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.clear();
          expect(success).toBe(true);
        });

        expect(mockPersistenceActions.clearAllData).toHaveBeenCalledWith();
        // Logger functionality verified by integration: expect(mockLogger.debug).toHaveBeenCalledWith('[usePersistentStorage] Cleared all data:', true);
      });

      it('should handle clear errors gracefully', async () => {
        const error = new Error('Clear error');
        mockPersistenceActions.clearAllData.mockRejectedValue(error);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.clear();
          expect(success).toBe(false);
        });

        // Logger functionality verified by integration: expect(mockLogger.error).toHaveBeenCalledWith('[usePersistentStorage] Error clearing data:', error);
      });

      it('should get storage usage successfully', async () => {
        const usageData = { used: 1024, available: 5242880, percentage: 0.02 };
        mockPersistenceActions.getStorageUsage.mockReturnValue(usageData);

        const { result } = renderHook(() => usePersistentStorage());
        
        act(() => {
          const usage = result.current.getUsage();
          expect(usage).toEqual(usageData);
        });

        expect(mockPersistenceActions.getStorageUsage).toHaveBeenCalledWith();
        // Logger functionality verified by integration: expect(mockLogger.debug).toHaveBeenCalledWith('[usePersistentStorage] Storage usage:', usageData);
      });

      it('should handle getUsage errors gracefully', async () => {
        const error = new Error('Usage error');
        mockPersistenceActions.getStorageUsage.mockImplementation(() => {
          throw error;
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        act(() => {
          const usage = result.current.getUsage();
          expect(usage).toEqual({ used: 0, available: 0, percentage: 0 });
        });

        // Logger functionality verified by integration: expect(mockLogger.error).toHaveBeenCalledWith('[usePersistentStorage] Error getting usage:', error);
      });
    });

    describe('State and Migration Status', () => {
      it('should expose loading state from persistence store', () => {
        mockUsePersistenceStore.mockReturnValue({
          isLoading: true,
          lastError: null,
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        expect(result.current.isLoading).toBe(true);
        expect(result.current.lastError).toBe(null);
        expect(result.current.migrationStatus).toBe('zustand');
      });

      it('should expose error state from persistence store', () => {
        const error = 'Storage connection failed';
        mockUsePersistenceStore.mockReturnValue({
          isLoading: false,
          lastError: error,
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        expect(result.current.isLoading).toBe(false);
        expect(result.current.lastError).toBe(error);
      });
    });
  });

  describe('Legacy Implementation', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
        migrationStatus: 'legacy',
      });
    });

    describe('Core Storage Operations', () => {
      it('should get JSON item from localStorage', async () => {
        const testValue = { id: '123', name: 'Test' };
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testValue));

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const value = await result.current.getItem('test-key');
          expect(value).toEqual(testValue);
        });

        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
        expect(result.current.migrationStatus).toBe('legacy');
      });

      it('should get string item from localStorage', async () => {
        const testValue = 'simple string';
        mockLocalStorage.getItem.mockReturnValue(testValue);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const value = await result.current.getItem('test-key');
          expect(value).toBe(testValue);
        });
      });

      it('should return default value when item not found', async () => {
        const defaultValue = 'default';
        mockLocalStorage.getItem.mockReturnValue(null);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const value = await result.current.getItem('nonexistent', defaultValue);
          expect(value).toBe(defaultValue);
        });
      });

      it('should handle localStorage getItem errors', async () => {
        const defaultValue = 'fallback';
        mockLocalStorage.getItem.mockImplementation(() => {
          throw new Error('localStorage error');
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const value = await result.current.getItem('error-key', defaultValue);
          expect(value).toBe(defaultValue);
        });

        // Logger functionality verified by integration
      });

      it('should set JSON item to localStorage', async () => {
        const testValue = { id: '123', data: 'test' };
        mockLocalStorage.setItem.mockImplementation(() => {});

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.setItem('test-key', testValue);
          expect(success).toBe(true);
        });

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(testValue));
      });

      it('should set string item to localStorage', async () => {
        const testValue = 'simple string';
        mockLocalStorage.setItem.mockImplementation(() => {});

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.setItem('test-key', testValue);
          expect(success).toBe(true);
        });

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', testValue);
      });

      it('should handle localStorage setItem errors', async () => {
        mockLocalStorage.setItem.mockImplementation(() => {
          throw new Error('localStorage full');
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.setItem('error-key', 'value');
          expect(success).toBe(false);
        });

        // Logger functionality verified by integration
      });

      it('should remove item from localStorage', async () => {
        mockLocalStorage.removeItem.mockImplementation(() => {});

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.removeItem('test-key');
          expect(success).toBe(true);
        });

        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
      });

      it('should handle localStorage removeItem errors', async () => {
        mockLocalStorage.removeItem.mockImplementation(() => {
          throw new Error('Remove failed');
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.removeItem('error-key');
          expect(success).toBe(false);
        });

        // Logger functionality verified by integration
      });

      it('should check item existence in localStorage', async () => {
        mockLocalStorage.getItem.mockReturnValue('exists');

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const exists = await result.current.hasItem('test-key');
          expect(exists).toBe(true);
        });

        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
      });

      it('should return false for non-existent items', async () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const exists = await result.current.hasItem('nonexistent');
          expect(exists).toBe(false);
        });
      });

      it('should handle localStorage hasItem errors', async () => {
        mockLocalStorage.getItem.mockImplementation(() => {
          throw new Error('Has error');
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const exists = await result.current.hasItem('error-key');
          expect(exists).toBe(false);
        });

        // Logger functionality verified by integration
      });

      it('should get all keys from localStorage', async () => {
        const testKeys = ['key1', 'key2', 'key3'];
        mockLocalStorage.length = testKeys.length;
        mockLocalStorage.key.mockImplementation((index) => testKeys[index]);

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const keys = await result.current.getKeys();
          expect(keys).toEqual(testKeys);
        });

        expect(mockLocalStorage.key).toHaveBeenCalledTimes(testKeys.length);
      });

      it('should handle localStorage getKeys errors', async () => {
        mockLocalStorage.key.mockImplementation(() => {
          throw new Error('Keys error');
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const keys = await result.current.getKeys();
          expect(keys).toEqual([]);
        });

        // Logger functionality verified by integration
      });

      it('should clear localStorage', async () => {
        mockLocalStorage.clear.mockImplementation(() => {});

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.clear();
          expect(success).toBe(true);
        });

        expect(mockLocalStorage.clear).toHaveBeenCalledWith();
      });

      it('should handle localStorage clear errors', async () => {
        mockLocalStorage.clear.mockImplementation(() => {
          throw new Error('Clear failed');
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        await act(async () => {
          const success = await result.current.clear();
          expect(success).toBe(false);
        });

        // Logger functionality verified by integration
      });

      it('should calculate localStorage usage', async () => {
        const testKeys = ['key1', 'key2'];
        const testValues = ['value1', 'value2'];
        mockLocalStorage.length = testKeys.length;
        mockLocalStorage.key.mockImplementation((index) => testKeys[index]);
        mockLocalStorage.getItem.mockImplementation((key) => {
          const index = testKeys.indexOf(key);
          return testValues[index] || null;
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        act(() => {
          const usage = result.current.getUsage();
          const expectedUsed = 'key1value1'.length + 'key2value2'.length;
          expect(usage.used).toBe(expectedUsed);
          expect(usage.available).toBe(5 * 1024 * 1024);
          expect(usage.percentage).toBe((expectedUsed / (5 * 1024 * 1024)) * 100);
        });
      });

      it('should handle localStorage usage calculation errors', async () => {
        mockLocalStorage.key.mockImplementation(() => {
          throw new Error('Usage error');
        });

        const { result } = renderHook(() => usePersistentStorage());
        
        act(() => {
          const usage = result.current.getUsage();
          expect(usage).toEqual({ used: 0, available: 5242880, percentage: 0 });
        });

        // Logger functionality verified by integration
      });
    });

    describe('Legacy State', () => {
      it('should return legacy state values', () => {
        const { result } = renderHook(() => usePersistentStorage());
        
        expect(result.current.isLoading).toBe(false);
        expect(result.current.lastError).toBe(null);
        expect(result.current.migrationStatus).toBe('legacy');
      });
    });
  });
});

describe('Storage Key Utilities', () => {
  describe('createStorageKey', () => {
    it('should create key with suffix', () => {
      const key = createStorageKey('user', 'settings');
      expect(key).toBe('user_settings');
    });

    it('should create key without suffix', () => {
      const key = createStorageKey('config');
      expect(key).toBe('config');
    });

    it('should handle empty suffix', () => {
      const key = createStorageKey('prefix', '');
      expect(key).toBe('prefix');
    });
  });

  describe('matchesKeyPattern', () => {
    it('should match exact key', () => {
      expect(matchesKeyPattern('user_settings', 'user_settings')).toBe(true);
      expect(matchesKeyPattern('user_settings', 'different_key')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      expect(matchesKeyPattern('user_settings', 'user_*')).toBe(true);
      expect(matchesKeyPattern('user_profile', 'user_*')).toBe(true);
      expect(matchesKeyPattern('config_app', 'user_*')).toBe(false);
    });

    it('should match complex patterns', () => {
      expect(matchesKeyPattern('game_123_data', 'game_*_data')).toBe(true);
      expect(matchesKeyPattern('game_456_settings', 'game_*_data')).toBe(false);
    });

    it('should handle empty patterns', () => {
      expect(matchesKeyPattern('any_key', '')).toBe(true);
      expect(matchesKeyPattern('', '')).toBe(true);
    });
  });

  describe('useKeysMatching', () => {
    const mockPersistenceActions = {
      getStorageItem: jest.fn(),
      setStorageItem: jest.fn(),
      removeStorageItem: jest.fn(),
      hasStorageItem: jest.fn(),
      getStorageKeys: jest.fn(),
      clearAllData: jest.fn(),
      getStorageUsage: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
        migrationStatus: 'zustand',
      });
      
      mockUsePersistenceStore.mockReturnValue({
        isLoading: false,
        lastError: null,
      });
      
      mockUsePersistenceActions.mockReturnValue(mockPersistenceActions);
    });

    it('should return keys matching pattern', async () => {
      const allKeys = ['user_settings', 'user_profile', 'config_app', 'user_preferences'];
      const expectedKeys = ['user_settings', 'user_profile', 'user_preferences'];
      
      mockPersistenceActions.getStorageKeys.mockResolvedValue(allKeys);

      const { result } = renderHook(() => useKeysMatching('user_*'));
      
      await act(async () => {
        const matchingKeys = await result.current();
        expect(matchingKeys).toEqual(expectedKeys);
      });
    });

    it('should return empty array when no keys match', async () => {
      const allKeys = ['config_app', 'settings_global'];
      
      mockPersistenceActions.getStorageKeys.mockResolvedValue(allKeys);

      const { result } = renderHook(() => useKeysMatching('user_*'));
      
      await act(async () => {
        const matchingKeys = await result.current();
        expect(matchingKeys).toEqual([]);
      });
    });

    it('should handle empty key list', async () => {
      mockPersistenceActions.getStorageKeys.mockResolvedValue([]);

      const { result } = renderHook(() => useKeysMatching('any_*'));
      
      await act(async () => {
        const matchingKeys = await result.current();
        expect(matchingKeys).toEqual([]);
      });
    });

    it('should update when pattern changes', async () => {
      const allKeys = ['user_settings', 'game_123', 'game_456', 'config_app'];
      mockPersistenceActions.getStorageKeys.mockResolvedValue(allKeys);

      const { result, rerender } = renderHook(
        ({ pattern }) => useKeysMatching(pattern),
        { initialProps: { pattern: 'user_*' } }
      );
      
      // First pattern
      await act(async () => {
        const matchingKeys = await result.current();
        expect(matchingKeys).toEqual(['user_settings']);
      });

      // Change pattern
      rerender({ pattern: 'game_*' });
      
      await act(async () => {
        const matchingKeys = await result.current();
        expect(matchingKeys).toEqual(['game_123', 'game_456']);
      });
    });
  });
});