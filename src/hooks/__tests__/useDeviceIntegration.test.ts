/**
 * useDeviceIntegration Hook Tests - Comprehensive Coverage
 * 
 * Tests for device integration hook that manages native device capabilities
 * including sharing, clipboard, camera, geolocation, fullscreen, and more.
 */

import { renderHook, act } from '@testing-library/react';
import { useDeviceIntegration } from '../useDeviceIntegration';
import { deviceIntegration } from '@/lib/native/deviceIntegration';

// Mock the device integration library
jest.mock('@/lib/native/deviceIntegration', () => ({
  deviceIntegration: {
    getCapabilities: jest.fn(),
    shareContent: jest.fn(),
    copyToClipboard: jest.fn(),
    vibrate: jest.fn(),
    enterFullscreen: jest.fn(),
    exitFullscreen: jest.fn(),
    requestWakeLock: jest.fn(),
    getCurrentPosition: jest.fn(),
    capturePhoto: jest.fn(),
    getShareTemplates: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

const mockDeviceIntegration = deviceIntegration as jest.Mocked<typeof deviceIntegration>;

describe('useDeviceIntegration Hook', () => {
  const mockCapabilities = {
    webShare: true,
    clipboard: true,
    contacts: false,
    camera: true,
    geolocation: true,
    vibration: true,
    fullscreen: true,
    wakeLock: true,
    fileSystem: false,
  };

  const mockWakeLock = {
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceIntegration.getCapabilities.mockReturnValue(mockCapabilities);
    
    // Mock document methods
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
    });
    
    // Mock event listeners
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
  });

  describe('initialization', () => {
    it('should initialize with loading state and detect capabilities', async () => {
      const { result } = renderHook(() => useDeviceIntegration());

      // Wait for initialization
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.capabilities).toEqual(mockCapabilities);
      expect(mockDeviceIntegration.getCapabilities).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const initError = new Error('Failed to detect capabilities');
      mockDeviceIntegration.getCapabilities.mockImplementationOnce(() => {
        throw initError;
      });

      const { result } = renderHook(() => useDeviceIntegration());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to detect capabilities');
    });

    it('should set up fullscreen event listeners', () => {
      renderHook(() => useDeviceIntegration());

      expect(document.addEventListener).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('webkitfullscreenchange', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('msfullscreenchange', expect.any(Function));
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useDeviceIntegration());

      unmount();

      expect(document.removeEventListener).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('webkitfullscreenchange', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('msfullscreenchange', expect.any(Function));
    });
  });

  describe('content sharing', () => {
    it('should share content successfully', async () => {
      mockDeviceIntegration.shareContent.mockResolvedValue(true);
      const { result } = renderHook(() => useDeviceIntegration());

      const shareData = {
        title: 'Game Results',
        text: 'Check out our latest match!',
        url: 'https://example.com/game/123',
      };

      let shareResult;
      await act(async () => {
        shareResult = await result.current.shareContent(shareData);
      });

      expect(shareResult).toBe(true);
      expect(mockDeviceIntegration.shareContent).toHaveBeenCalledWith(shareData);
      expect(result.current.error).toBe(null);
    });

    it('should handle share content failure', async () => {
      mockDeviceIntegration.shareContent.mockResolvedValue(false);
      const { result } = renderHook(() => useDeviceIntegration());

      let shareResult;
      await act(async () => {
        shareResult = await result.current.shareContent({ title: 'Test' });
      });

      expect(shareResult).toBe(false);
      expect(result.current.error).toBe('Failed to share content');
    });

    it('should handle share content error', async () => {
      const shareError = new Error('Share API not available');
      mockDeviceIntegration.shareContent.mockRejectedValue(shareError);
      const { result } = renderHook(() => useDeviceIntegration());

      let shareResult;
      await act(async () => {
        shareResult = await result.current.shareContent({ title: 'Test' });
      });

      expect(shareResult).toBe(false);
      expect(result.current.error).toBe('Share API not available');
    });

    it('should share content with files', async () => {
      mockDeviceIntegration.shareContent.mockResolvedValue(true);
      const { result } = renderHook(() => useDeviceIntegration());

      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const shareData = {
        title: 'Share File',
        files: [file],
      };

      await act(async () => {
        await result.current.shareContent(shareData);
      });

      expect(mockDeviceIntegration.shareContent).toHaveBeenCalledWith(shareData);
    });
  });

  describe('clipboard operations', () => {
    it('should copy to clipboard successfully', async () => {
      mockDeviceIntegration.copyToClipboard.mockResolvedValue(true);
      const { result } = renderHook(() => useDeviceIntegration());

      const textToCopy = 'Game ID: 12345';

      let copyResult;
      await act(async () => {
        copyResult = await result.current.copyToClipboard(textToCopy);
      });

      expect(copyResult).toBe(true);
      expect(mockDeviceIntegration.copyToClipboard).toHaveBeenCalledWith(textToCopy);
      expect(result.current.error).toBe(null);
    });

    it('should handle clipboard copy failure', async () => {
      mockDeviceIntegration.copyToClipboard.mockResolvedValue(false);
      const { result } = renderHook(() => useDeviceIntegration());

      let copyResult;
      await act(async () => {
        copyResult = await result.current.copyToClipboard('test text');
      });

      expect(copyResult).toBe(false);
      expect(result.current.error).toBe('Failed to copy to clipboard');
    });

    it('should handle clipboard copy error', async () => {
      const clipboardError = new Error('Clipboard access denied');
      mockDeviceIntegration.copyToClipboard.mockRejectedValue(clipboardError);
      const { result } = renderHook(() => useDeviceIntegration());

      let copyResult;
      await act(async () => {
        copyResult = await result.current.copyToClipboard('test text');
      });

      expect(copyResult).toBe(false);
      expect(result.current.error).toBe('Clipboard access denied');
    });
  });

  describe('device vibration', () => {
    it('should trigger vibration with default pattern', () => {
      mockDeviceIntegration.vibrate.mockReturnValue(true);
      const { result } = renderHook(() => useDeviceIntegration());

      const vibrateResult = result.current.vibrate();

      expect(vibrateResult).toBe(true);
      expect(mockDeviceIntegration.vibrate).toHaveBeenCalledWith(200);
    });

    it('should trigger vibration with custom pattern', () => {
      mockDeviceIntegration.vibrate.mockReturnValue(true);
      const { result } = renderHook(() => useDeviceIntegration());

      const customPattern = [100, 50, 100];
      const vibrateResult = result.current.vibrate(customPattern);

      expect(vibrateResult).toBe(true);
      expect(mockDeviceIntegration.vibrate).toHaveBeenCalledWith(customPattern);
    });

    it('should handle vibration failure', () => {
      mockDeviceIntegration.vibrate.mockImplementation(() => {
        throw new Error('Vibration not supported');
      });
      const { result } = renderHook(() => useDeviceIntegration());

      const vibrateResult = result.current.vibrate();

      expect(vibrateResult).toBe(false);
    });

    it('should trigger vibration with single number pattern', () => {
      mockDeviceIntegration.vibrate.mockReturnValue(true);
      const { result } = renderHook(() => useDeviceIntegration());

      const vibrateResult = result.current.vibrate(500);

      expect(vibrateResult).toBe(true);
      expect(mockDeviceIntegration.vibrate).toHaveBeenCalledWith(500);
    });
  });

  describe('fullscreen management', () => {
    it('should enter fullscreen successfully', async () => {
      mockDeviceIntegration.enterFullscreen.mockResolvedValue(true);
      const { result } = renderHook(() => useDeviceIntegration());

      const element = document.createElement('div');

      let fullscreenResult;
      await act(async () => {
        fullscreenResult = await result.current.enterFullscreen(element);
      });

      expect(fullscreenResult).toBe(true);
      expect(mockDeviceIntegration.enterFullscreen).toHaveBeenCalledWith(element);
      expect(result.current.error).toBe(null);
    });

    it('should enter fullscreen without element', async () => {
      mockDeviceIntegration.enterFullscreen.mockResolvedValue(true);
      const { result } = renderHook(() => useDeviceIntegration());

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(mockDeviceIntegration.enterFullscreen).toHaveBeenCalledWith(undefined);
    });

    it('should exit fullscreen successfully', async () => {
      mockDeviceIntegration.exitFullscreen.mockResolvedValue(true);
      const { result } = renderHook(() => useDeviceIntegration());

      let exitResult;
      await act(async () => {
        exitResult = await result.current.exitFullscreen();
      });

      expect(exitResult).toBe(true);
      expect(mockDeviceIntegration.exitFullscreen).toHaveBeenCalled();
      expect(result.current.error).toBe(null);
    });

    it('should toggle fullscreen from normal to fullscreen', async () => {
      mockDeviceIntegration.enterFullscreen.mockResolvedValue(true);
      const { result } = renderHook(() => useDeviceIntegration());

      // Start with not fullscreen
      expect(result.current.isFullscreen).toBe(false);

      const element = document.createElement('div');
      await act(async () => {
        await result.current.toggleFullscreen(element);
      });

      expect(mockDeviceIntegration.enterFullscreen).toHaveBeenCalledWith(element);
    });

    it('should handle fullscreen state changes', async () => {
      const { result } = renderHook(() => useDeviceIntegration());

      // Mock fullscreen element exists
      Object.defineProperty(document, 'fullscreenElement', {
        value: document.createElement('div'),
        writable: true,
      });

      // Get the event handler from addEventListener mock
      const addEventListenerCalls = (document.addEventListener as jest.Mock).mock.calls;
      const fullscreenChangeHandler = addEventListenerCalls.find(
        call => call[0] === 'fullscreenchange'
      )?.[1];

      if (fullscreenChangeHandler) {
        act(() => {
          fullscreenChangeHandler();
        });

        expect(result.current.isFullscreen).toBe(true);
      }
    });

    it('should handle fullscreen errors', async () => {
      const fullscreenError = new Error('Fullscreen not allowed');
      mockDeviceIntegration.enterFullscreen.mockRejectedValue(fullscreenError);
      const { result } = renderHook(() => useDeviceIntegration());

      let fullscreenResult;
      await act(async () => {
        fullscreenResult = await result.current.enterFullscreen();
      });

      expect(fullscreenResult).toBe(false);
      expect(result.current.error).toBe('Fullscreen not allowed');
    });
  });

  describe('wake lock management', () => {
    it('should request wake lock successfully', async () => {
      mockDeviceIntegration.requestWakeLock.mockResolvedValue(mockWakeLock);
      const { result } = renderHook(() => useDeviceIntegration());

      let wakeLockResult;
      await act(async () => {
        wakeLockResult = await result.current.requestWakeLock();
      });

      expect(wakeLockResult).toBe(true);
      expect(result.current.wakeLock).toBe(mockWakeLock);
      expect(result.current.error).toBe(null);
    });

    it('should handle wake lock request failure', async () => {
      mockDeviceIntegration.requestWakeLock.mockResolvedValue(null);
      const { result } = renderHook(() => useDeviceIntegration());

      let wakeLockResult;
      await act(async () => {
        wakeLockResult = await result.current.requestWakeLock();
      });

      expect(wakeLockResult).toBe(false);
      expect(result.current.error).toBe('Wake lock not supported or failed');
    });

    it('should release wake lock', async () => {
      mockDeviceIntegration.requestWakeLock.mockResolvedValue(mockWakeLock);
      const { result } = renderHook(() => useDeviceIntegration());

      // First request wake lock
      await act(async () => {
        await result.current.requestWakeLock();
      });

      expect(result.current.wakeLock).toBe(mockWakeLock);

      // Then release it
      act(() => {
        result.current.releaseWakeLock();
      });

      expect(mockWakeLock.release).toHaveBeenCalled();
      expect(result.current.wakeLock).toBe(null);
    });

    it('should handle release wake lock when none is active', () => {
      const { result } = renderHook(() => useDeviceIntegration());

      // Try to release when no wake lock is active
      act(() => {
        result.current.releaseWakeLock();
      });

      // Should not throw error
      expect(result.current.wakeLock).toBe(null);
    });

    it('should handle wake lock request error', async () => {
      const wakeLockError = new Error('Wake lock permission denied');
      mockDeviceIntegration.requestWakeLock.mockRejectedValue(wakeLockError);
      const { result } = renderHook(() => useDeviceIntegration());

      let wakeLockResult;
      await act(async () => {
        wakeLockResult = await result.current.requestWakeLock();
      });

      expect(wakeLockResult).toBe(false);
      expect(result.current.error).toBe('Wake lock permission denied');
    });
  });

  describe('geolocation', () => {
    const mockPosition = {
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    it('should get current position successfully', async () => {
      mockDeviceIntegration.getCurrentPosition.mockResolvedValue(mockPosition);
      const { result } = renderHook(() => useDeviceIntegration());

      let position;
      await act(async () => {
        position = await result.current.getCurrentPosition();
      });

      expect(position).toBe(mockPosition);
      expect(mockDeviceIntegration.getCurrentPosition).toHaveBeenCalled();
      expect(result.current.error).toBe(null);
    });

    it('should handle geolocation failure', async () => {
      mockDeviceIntegration.getCurrentPosition.mockResolvedValue(null);
      const { result } = renderHook(() => useDeviceIntegration());

      let position;
      await act(async () => {
        position = await result.current.getCurrentPosition();
      });

      expect(position).toBe(null);
      expect(result.current.error).toBe('Failed to get location');
    });

    it('should handle geolocation error', async () => {
      const locationError = new Error('Geolocation permission denied');
      mockDeviceIntegration.getCurrentPosition.mockRejectedValue(locationError);
      const { result } = renderHook(() => useDeviceIntegration());

      let position;
      await act(async () => {
        position = await result.current.getCurrentPosition();
      });

      expect(position).toBe(null);
      expect(result.current.error).toBe('Geolocation permission denied');
    });
  });

  describe('camera and photo capture', () => {
    const mockPhoto = new File(['photo data'], 'photo.jpg', { type: 'image/jpeg' });

    it('should capture photo successfully', async () => {
      mockDeviceIntegration.capturePhoto.mockResolvedValue(mockPhoto);
      const { result } = renderHook(() => useDeviceIntegration());

      let photo;
      await act(async () => {
        photo = await result.current.capturePhoto();
      });

      expect(photo).toBe(mockPhoto);
      expect(mockDeviceIntegration.capturePhoto).toHaveBeenCalled();
      expect(result.current.error).toBe(null);
    });

    it('should handle photo capture failure', async () => {
      mockDeviceIntegration.capturePhoto.mockResolvedValue(null);
      const { result } = renderHook(() => useDeviceIntegration());

      let photo;
      await act(async () => {
        photo = await result.current.capturePhoto();
      });

      expect(photo).toBe(null);
      expect(result.current.error).toBe('Failed to capture photo');
    });

    it('should handle photo capture error', async () => {
      const cameraError = new Error('Camera access denied');
      mockDeviceIntegration.capturePhoto.mockRejectedValue(cameraError);
      const { result } = renderHook(() => useDeviceIntegration());

      let photo;
      await act(async () => {
        photo = await result.current.capturePhoto();
      });

      expect(photo).toBe(null);
      expect(result.current.error).toBe('Camera access denied');
    });
  });

  describe('share templates', () => {
    const mockTemplates = {
      gameResult: { title: 'Game Result', text: 'We won!' },
      playerStats: { title: 'Player Stats', text: 'Check out these stats' },
    };

    it('should get share templates', () => {
      mockDeviceIntegration.getShareTemplates.mockReturnValue(mockTemplates);
      const { result } = renderHook(() => useDeviceIntegration());

      const templates = result.current.getShareTemplates();

      expect(templates).toBe(mockTemplates);
      expect(mockDeviceIntegration.getShareTemplates).toHaveBeenCalled();
    });
  });

  describe('error management', () => {
    it('should clear error state', async () => {
      mockDeviceIntegration.shareContent.mockResolvedValue(false);
      const { result } = renderHook(() => useDeviceIntegration());

      // Generate an error
      await act(async () => {
        await result.current.shareContent({ title: 'Test' });
      });

      expect(result.current.error).toBe('Failed to share content');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });

    it('should clear error before each operation', async () => {
      mockDeviceIntegration.shareContent.mockResolvedValue(false);
      const { result } = renderHook(() => useDeviceIntegration());

      // Generate an error by making shareContent fail
      await act(async () => {
        await result.current.shareContent({ title: 'Test' });
      });

      expect(result.current.error).toBe('Failed to share content');

      mockDeviceIntegration.copyToClipboard.mockResolvedValue(true);

      // Next operation should clear the previous error
      await act(async () => {
        await result.current.copyToClipboard('test');
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle non-Error exceptions', async () => {
      mockDeviceIntegration.shareContent.mockRejectedValue('String error');
      const { result } = renderHook(() => useDeviceIntegration());

      await act(async () => {
        await result.current.shareContent({ title: 'Test' });
      });

      expect(result.current.error).toBe('Failed to share content');
    });

    it('should handle undefined capabilities during initialization', async () => {
      mockDeviceIntegration.getCapabilities.mockReturnValue(undefined);
      const { result } = renderHook(() => useDeviceIntegration());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.capabilities).toBeUndefined();
    });

    it('should handle multiple rapid error clearing', () => {
      const { result } = renderHook(() => useDeviceIntegration());

      // Clear error multiple times rapidly
      act(() => {
        result.current.clearError();
        result.current.clearError();
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });

    it('should handle toggle fullscreen when already in fullscreen', async () => {
      const { result } = renderHook(() => useDeviceIntegration());

      // Simulate being in fullscreen
      Object.defineProperty(document, 'fullscreenElement', {
        value: document.createElement('div'),
        writable: true,
      });

      // Trigger fullscreen change to update state
      const addEventListenerCalls = (document.addEventListener as jest.Mock).mock.calls;
      const fullscreenChangeHandler = addEventListenerCalls.find(
        call => call[0] === 'fullscreenchange'
      )?.[1];

      if (fullscreenChangeHandler) {
        act(() => {
          fullscreenChangeHandler();
        });
      }

      mockDeviceIntegration.exitFullscreen.mockResolvedValue(true);

      // Now toggle should exit fullscreen
      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockDeviceIntegration.exitFullscreen).toHaveBeenCalled();
    });

    it('should handle webkit and ms fullscreen elements', () => {
      const { result } = renderHook(() => useDeviceIntegration());

      // Mock webkit fullscreen
      Object.defineProperty(document, 'webkitFullscreenElement', {
        value: document.createElement('div'),
        writable: true,
      });

      const addEventListenerCalls = (document.addEventListener as jest.Mock).mock.calls;
      const webkitHandler = addEventListenerCalls.find(
        call => call[0] === 'webkitfullscreenchange'
      )?.[1];

      if (webkitHandler) {
        act(() => {
          webkitHandler();
        });

        expect(result.current.isFullscreen).toBe(true);
      }
    });
  });
});