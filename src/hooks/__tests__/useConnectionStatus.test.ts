import { renderHook, act, waitFor } from '@testing-library/react';
import { useConnectionStatus } from '../useConnectionStatus';

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  configurable: true,
  value: true
});

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

describe('useConnectionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true
    });
    
    // Mock successful fetch by default
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200
    });

    // Clear any existing event listeners
    window.removeEventListener = jest.fn();
    window.addEventListener = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize with correct default values', async () => {
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastChecked).toBeGreaterThan(0);
    expect(typeof result.current.checkConnection).toBe('function');
  });

  it('should check Supabase connection on initialization', async () => {
    renderHook(() => useConnectionStatus());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/',
        expect.objectContaining({
          method: 'HEAD',
          mode: 'no-cors'
        })
      );
    });
  });

  it('should handle successful Supabase connection', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200
    });

    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => {
      expect(result.current.isSupabaseReachable).toBe(true);
      expect(result.current.connectionQuality).toBe('good');
    });
  });

  it('should handle failed Supabase connection', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => {
      expect(result.current.isSupabaseReachable).toBe(false);
      expect(result.current.connectionQuality).toBe('offline');
    });
  });

  it('should treat 401 status as successful connection', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401
    });

    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => {
      expect(result.current.isSupabaseReachable).toBe(true);
    });
  });


  it('should handle timeout correctly', async () => {
    // Mock request that never resolves (will be aborted)
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => {
      expect(result.current.isSupabaseReachable).toBe(false);
    }, { timeout: 6000 });
  });

  it('should initialize with offline status when navigator is offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true
    });
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.connectionQuality).toBe('offline');
  });

  it('should initialize with online status when navigator is online', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true
    });
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.isOnline).toBe(true);
  });

  it('should provide manual connection check function', async () => {
    const { result } = renderHook(() => useConnectionStatus());

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200
    });

    await act(async () => {
      await result.current.checkConnection();
    });

    expect(global.fetch).toHaveBeenCalled();
  });

  it('should handle missing environment variables', async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    Object.defineProperty(process.env, 'NEXT_PUBLIC_SUPABASE_URL', {
      value: undefined,
      configurable: true
    });

    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => {
      expect(result.current.isSupabaseReachable).toBe(false);
    });

    // Restore for other tests
    Object.defineProperty(process.env, 'NEXT_PUBLIC_SUPABASE_URL', {
      value: originalUrl,
      configurable: true
    });
  });

  it('should handle offline navigator state', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true
    });

    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
      expect(result.current.isSupabaseReachable).toBe(false);
      expect(result.current.connectionQuality).toBe('offline');
    });

    // Fetch should not be called when offline
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should set up event listeners for online/offline events', () => {
    renderHook(() => useConnectionStatus());

    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useConnectionStatus());

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should update lastChecked timestamp on status updates', async () => {
    const { result } = renderHook(() => useConnectionStatus());

    const initialTimestamp = result.current.lastChecked;

    // Wait a bit and trigger a check
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      await result.current.checkConnection();
    });

    expect(result.current.lastChecked).toBeGreaterThan(initialTimestamp);
  });
});