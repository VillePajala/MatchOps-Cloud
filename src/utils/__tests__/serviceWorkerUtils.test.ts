import {
  checkForUpdates,
  forceAppUpdate,
  isInstalledPWA,
  simulateUpdateAvailable,
} from '../serviceWorkerUtils';
import logger from '../logger';

// Mock logger  
jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('serviceWorkerUtils', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    
    // Reset environment
    process.env.NODE_ENV = 'test';
  });

  describe('checkForUpdates', () => {
    it('should return error when service worker not supported', async () => {
      // Mock navigator without serviceWorker
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });

      const result = await checkForUpdates();

      expect(result).toEqual({
        updateAvailable: false,
        error: 'Service Worker not supported'
      });
    });

    it('should return error when no service worker registered', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            getRegistration: jest.fn().mockResolvedValue(undefined)
          }
        },
        writable: true,
      });

      const result = await checkForUpdates();

      expect(result).toEqual({
        updateAvailable: false,
        error: 'No service worker registered'
      });
    });

    it('should detect existing waiting worker', async () => {
      const mockRegistration = {
        waiting: { state: 'installed' },
        installing: null,
        update: jest.fn().mockResolvedValue(),
        unregister: jest.fn().mockResolvedValue(true),
      };

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            getRegistration: jest.fn().mockResolvedValue(mockRegistration)
          }
        },
        writable: true,
      });

      Object.defineProperty(global, 'fetch', {
        value: jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ version: '1.0.0' }),
        }),
        writable: true,
      });

      const result = await checkForUpdates();

      expect(result.updateAvailable).toBe(true);
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('Latest');
    });

    it('should handle general errors gracefully', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            getRegistration: jest.fn().mockRejectedValue(new Error('Test error'))
          }
        },
        writable: true,
      });

      const result = await checkForUpdates();

      expect(result).toEqual({
        updateAvailable: false,
        error: 'Test error'
      });
      expect(mockLogger.error).toHaveBeenCalledWith('[SW Utils] Error checking for updates:', expect.any(Error));
    });
  });

  describe('forceAppUpdate', () => {
    it('should activate waiting service worker', async () => {
      const mockWorker = {
        postMessage: jest.fn()
      };

      const mockRegistration = {
        waiting: mockWorker
      };

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            getRegistration: jest.fn().mockResolvedValue(mockRegistration)
          }
        },
        writable: true,
      });

      await forceAppUpdate();

      expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(mockLogger.log).toHaveBeenCalledWith('[SW Utils] Activating waiting service worker...');
    });

    it('should use simple reload in development', async () => {
      process.env.NODE_ENV = 'development';

      const mockWindow = {
        location: {
          reload: jest.fn()
        }
      };

      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
      });

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            getRegistration: jest.fn().mockResolvedValue(undefined)
          }
        },
        writable: true,
      });

      await forceAppUpdate();

      expect(mockWindow.location.reload).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('[SW Utils] Development mode - using simple reload');
    });

    it('should clear PWA caches in production', async () => {
      process.env.NODE_ENV = 'production';

      const mockCaches = {
        keys: jest.fn().mockResolvedValue([
          'matchops-coach-v1',
          'app-shell-v2',
          'unrelated-cache'
        ]),
        delete: jest.fn().mockResolvedValue(true)
      };

      const mockWindow = {
        location: {
          href: 'https://example.com/',
        },
        caches: mockCaches
      };

      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
      });

      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
      });

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            getRegistration: jest.fn().mockResolvedValue(undefined)
          }
        },
        writable: true,
      });

      jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      await forceAppUpdate();

      expect(mockCaches.delete).toHaveBeenCalledWith('matchops-coach-v1');
      expect(mockCaches.delete).toHaveBeenCalledWith('app-shell-v2');
      expect(mockCaches.delete).not.toHaveBeenCalledWith('unrelated-cache');
      expect(mockWindow.location.href).toBe('https://example.com/?_refresh=1234567890');
    });

    it('should fallback to simple reload on error', async () => {
      const mockWindow = {
        location: {
          reload: jest.fn()
        }
      };

      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
      });

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            getRegistration: jest.fn().mockRejectedValue(new Error('Test error'))
          }
        },
        writable: true,
      });

      await forceAppUpdate();

      expect(mockLogger.error).toHaveBeenCalledWith('[SW Utils] Error forcing app update:', expect.any(Error));
      expect(mockWindow.location.reload).toHaveBeenCalled();
    });
  });

  describe('isInstalledPWA', () => {
    it('should return true for standalone display mode', () => {
      Object.defineProperty(global, 'window', {
        value: {
          matchMedia: jest.fn().mockImplementation((query: string) => ({
            matches: query === '(display-mode: standalone)',
          })),
          navigator: { standalone: false }
        },
        writable: true,
      });

      const result = isInstalledPWA();

      expect(result).toBe(true);
    });

    it('should return true for fullscreen display mode', () => {
      Object.defineProperty(global, 'window', {
        value: {
          matchMedia: jest.fn().mockImplementation((query: string) => ({
            matches: query === '(display-mode: fullscreen)',
          })),
          navigator: { standalone: false }
        },
        writable: true,
      });

      const result = isInstalledPWA();

      expect(result).toBe(true);
    });

    it('should return true for navigator.standalone', () => {
      Object.defineProperty(global, 'window', {
        value: {
          matchMedia: jest.fn().mockReturnValue({ matches: false }),
          navigator: { standalone: true }
        },
        writable: true,
      });

      const result = isInstalledPWA();

      expect(result).toBe(true);
    });

    it('should return false when not installed', () => {
      Object.defineProperty(global, 'window', {
        value: {
          matchMedia: jest.fn().mockReturnValue({ matches: false }),
          navigator: { standalone: false }
        },
        writable: true,
      });

      const result = isInstalledPWA();

      expect(result).toBe(false);
    });
  });

  describe('simulateUpdateAvailable', () => {
    it('should return simulated update in development mode', () => {
      process.env.NODE_ENV = 'development';

      const result = simulateUpdateAvailable();

      expect(result).toEqual({
        updateAvailable: true,
        currentVersion: '0.1.0',
        newVersion: 'Simulated Update'
      });
    });

    it('should return error in production mode', () => {
      process.env.NODE_ENV = 'production';

      const result = simulateUpdateAvailable();

      expect(result).toEqual({
        updateAvailable: false,
        error: 'Simulation only available in development'
      });
    });
  });
});