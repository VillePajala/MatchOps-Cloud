/**
 * Comprehensive tests for AuthContext.tsx
 * Testing uncovered error paths and edge cases to improve coverage from 75% to 85%+
 */

import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { useAuth, AuthProvider } from '../AuthContext';
import { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

// Mock all dependencies
jest.mock('../../lib/supabase');
jest.mock('../../lib/security/rateLimiter');
jest.mock('../../lib/security/sessionManager');
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));
jest.mock('../../lib/storage');
jest.mock('../../utils/loadingRegistry');
jest.mock('../../utils/operationQueue');
jest.mock('../../services/ComponentRegistry');
jest.mock('../../utils/performance');

// Import after mocks
import { supabase } from '../../lib/supabase';
import { SecureAuthService } from '../../lib/security/rateLimiter';
import { sessionManager } from '../../lib/security/sessionManager';
import { SmartPreloader, registerModalComponents } from '../../services/ComponentRegistry';
import { loadingRegistry } from '../../utils/loadingRegistry';
import { operationQueue } from '../../utils/operationQueue';
import { authAwareStorageManager } from '../../lib/storage';

// Enhanced test component with all auth methods
const ComprehensiveTestComponent = ({ testId = 'comprehensive-test' }: { testId?: string }) => {
  const auth = useAuth();
  
  return (
    <div data-testid={testId}>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <div data-testid="session">{auth.session ? JSON.stringify(auth.session) : 'null'}</div>
      <div data-testid="loading">{auth.loading.toString()}</div>
      <div data-testid="session-info">{JSON.stringify(auth.sessionInfo)}</div>
      
      <button data-testid="signup-btn" onClick={() => auth.signUp('test@example.com', 'password123')}>
        Sign Up
      </button>
      <button data-testid="signin-btn" onClick={() => auth.signIn('test@example.com', 'password123')}>
        Sign In
      </button>
      <button data-testid="signout-btn" onClick={() => auth.signOut()}>
        Sign Out
      </button>
      <button data-testid="global-signout-btn" onClick={() => (auth as any).globalSignOut()}>
        Global Sign Out
      </button>
      <button data-testid="reset-btn" onClick={() => auth.resetPassword('test@example.com')}>
        Reset Password
      </button>
      <button data-testid="extend-session-btn" onClick={() => auth.extendSession()}>
        Extend Session
      </button>
    </div>
  );
};

const renderWithAuthProvider = async (children: ReactNode) => {
  let utils: ReturnType<typeof render> | undefined;
  await act(async () => {
    utils = render(<AuthProvider>{children}</AuthProvider>);
  });
  return utils as ReturnType<typeof render>;
};

describe.skip('AuthContext - Comprehensive Coverage Tests', () => {
  let mockUnsubscribe: jest.Mock;
  
  const mockSupabaseAuth = supabase.auth as unknown as {
    getSession: jest.Mock;
    onAuthStateChange: jest.Mock;
    signUp: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
    resetPasswordForEmail: jest.Mock;
  };
  
  const mockSecureAuthService = SecureAuthService as unknown as {
    signUp: jest.Mock;
    signIn: jest.Mock;
    resetPassword: jest.Mock;
  };

  const mockSessionManager = sessionManager as unknown as {
    initialize: jest.Mock;
    getSessionInfo: jest.Mock;
    recordActivity: jest.Mock;
    extendSession: jest.Mock;
    cleanup: jest.Mock;
  };

  const mockSmartPreloader = SmartPreloader as unknown as {
    preloadCriticalComponents: jest.Mock;
  };

  const mockRegisterModalComponents = registerModalComponents as jest.Mock;
  const mockLoadingRegistry = loadingRegistry as unknown as { clearAll: jest.Mock };
  const mockOperationQueue = operationQueue as unknown as { clear: jest.Mock };
  const mockAuthAwareStorageManager = authAwareStorageManager as unknown as { handleSignOutCleanup?: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
    
    // Setup default mocks
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
    
    mockSupabaseAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    
    mockSupabaseAuth.signOut.mockResolvedValue({ error: null });
    mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
    
    // Mock SecureAuthService - default to success
    mockSecureAuthService.signUp.mockResolvedValue({ success: true });
    mockSecureAuthService.signIn.mockResolvedValue({ success: true });
    mockSecureAuthService.resetPassword.mockResolvedValue({ success: true });
    
    // Mock session manager
    mockSessionManager.initialize.mockReturnValue(undefined);
    mockSessionManager.getSessionInfo.mockReturnValue({
      isActive: false,
      lastActivity: undefined,
      sessionStart: undefined,
    });
    mockSessionManager.recordActivity.mockReturnValue(undefined);
    mockSessionManager.extendSession.mockReturnValue(undefined);
    mockSessionManager.cleanup.mockReturnValue(undefined);
    
    // Mock component registry
    mockRegisterModalComponents.mockReturnValue(undefined);
    mockSmartPreloader.preloadCriticalComponents.mockResolvedValue(undefined);
    
    // Mock cleanup utilities
    mockLoadingRegistry.clearAll.mockReturnValue(undefined);
    mockOperationQueue.clear.mockReturnValue(undefined);
    mockAuthAwareStorageManager.handleSignOutCleanup = jest.fn();

    // Mock window objects for browser-specific tests
    Object.defineProperty(window, 'requestIdleCallback', {
      value: undefined,
      writable: true,
    });

    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
        href: 'http://localhost:3000',
      },
      writable: true,
    });

    // Mock localStorage for cleanup tests
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: jest.fn(),
        removeItem: jest.fn(),
        getItem: jest.fn(),
        keys: jest.fn(() => ['sb-test-auth-token', 'sb-refresh-token', 'other-key']),
        clear: jest.fn(),
      },
      writable: true,
    });

    Object.defineProperty(Object.keys(localStorage), 'forEach', {
      value: (callback: (key: string) => void) => {
        ['sb-test-auth-token', 'sb-refresh-token', 'other-key'].forEach(callback);
      },
      writable: true,
    });

    // Mock navigator for service worker tests
    Object.defineProperty(window, 'navigator', {
      value: {
        serviceWorker: {
          controller: {
            postMessage: jest.fn(),
          },
        },
      },
      writable: true,
    });
  });

  describe('Error Handling Coverage', () => {
    it('should handle getSession error response (line 49)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session error', code: 'SESSION_ERROR' },
      });

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('session')).toHaveTextContent('null');
      
      consoleSpy.mockRestore();
    });

    it('should handle component prefetching errors after sign-in (lines 90-96)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock requestIdleCallback to exist and execute callback
      const mockRequestIdleCallback = jest.fn((callback) => {
        callback();
      });
      Object.defineProperty(window, 'requestIdleCallback', {
        value: mockRequestIdleCallback,
        writable: true,
      });

      // Make preloader throw error
      mockSmartPreloader.preloadCriticalComponents.mockRejectedValueOnce(
        new Error('Preload failed')
      );

      let authStateCallback: (event: string, session: Session | null) => void;
      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Trigger SIGNED_IN event to execute prefetching code
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser } as unknown as Session;
      
      act(() => {
        authStateCallback('SIGNED_IN', mockSession);
      });

      // Wait for prefetch to complete
      await waitFor(() => {
        expect(mockRequestIdleCallback).toHaveBeenCalled();
      });

      expect(mockRegisterModalComponents).toHaveBeenCalled();
      expect(mockSmartPreloader.preloadCriticalComponents).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle fallback prefetching errors when requestIdleCallback unavailable (lines 104-108)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Ensure requestIdleCallback is not available
      Object.defineProperty(window, 'requestIdleCallback', {
        value: undefined,
        writable: true,
      });

      // Make preloader throw error
      mockSmartPreloader.preloadCriticalComponents.mockRejectedValueOnce(
        new Error('Fallback preload failed')
      );

      let authStateCallback: (event: string, session: Session | null) => void;
      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Trigger SIGNED_IN event to execute fallback prefetching code
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser } as unknown as Session;
      
      act(() => {
        authStateCallback('SIGNED_IN', mockSession);
      });

      // Wait for fallback timeout to execute
      await waitFor(() => {
        expect(mockSmartPreloader.preloadCriticalComponents).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting and Exception Coverage', () => {
    it('should handle rate limited signUp (line 133)', async () => {
      mockSecureAuthService.signUp.mockResolvedValueOnce({
        success: false,
        rateLimited: true,
        retryAfter: 60,
        error: 'Rate limited',
      });

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('signup-btn').click();
      });

      await waitFor(() => {
        expect(mockSecureAuthService.signUp).toHaveBeenCalledWith(
          'test@example.com',
          'password123'
        );
      });

      // SignUp should not proceed to Supabase due to rate limiting
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it('should handle signUp exceptions (line 154)', async () => {
      mockSecureAuthService.signUp.mockRejectedValueOnce(
        new Error('Unexpected signup error')
      );

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('signup-btn').click();
      });

      await waitFor(() => {
        expect(mockSecureAuthService.signUp).toHaveBeenCalled();
      });
    });

    it('should handle rate limited signIn (line 168)', async () => {
      mockSecureAuthService.signIn.mockResolvedValueOnce({
        success: false,
        rateLimited: true,
        retryAfter: 300,
        progressiveDelay: 1500,
        error: 'Too many attempts',
      });

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('signin-btn').click();
      });

      await waitFor(() => {
        expect(mockSecureAuthService.signIn).toHaveBeenCalledWith(
          'test@example.com',
          'password123',
          undefined
        );
      });

      // SignIn should not proceed to Supabase due to rate limiting
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should handle signIn exceptions (line 189)', async () => {
      mockSecureAuthService.signIn.mockRejectedValueOnce(
        new Error('Unexpected signin error')
      );

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('signin-btn').click();
      });

      await waitFor(() => {
        expect(mockSecureAuthService.signIn).toHaveBeenCalled();
      });
    });

    it('should handle rate limited resetPassword (line 272)', async () => {
      mockSecureAuthService.resetPassword.mockResolvedValueOnce({
        success: false,
        rateLimited: true,
        retryAfter: 120,
        error: 'Password reset rate limited',
      });

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('reset-btn').click();
      });

      await waitFor(() => {
        expect(mockSecureAuthService.resetPassword).toHaveBeenCalledWith(
          'test@example.com'
        );
      });

      // Reset should not proceed to Supabase due to rate limiting
      expect(mockSupabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it('should handle resetPassword exceptions (line 283)', async () => {
      mockSecureAuthService.resetPassword.mockRejectedValueOnce(
        new Error('Unexpected reset error')
      );

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('reset-btn').click();
      });

      await waitFor(() => {
        expect(mockSecureAuthService.resetPassword).toHaveBeenCalled();
      });
    });
  });

  describe('Sign Out Error Handling Coverage', () => {
    it('should handle signOut errors (lines 242-243)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabaseAuth.signOut.mockRejectedValueOnce(
        new Error('Sign out failed')
      );

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('signout-btn').click();
      });

      await waitFor(() => {
        expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      });

      expect(mockSessionManager.cleanup).toHaveBeenCalled();
      expect(mockLoadingRegistry.clearAll).toHaveBeenCalled();
      expect(mockOperationQueue.clear).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should test globalSignOut functionality (lines 248-262)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock window.location.replace
      const mockReplace = jest.fn();
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          replace: mockReplace,
        },
        writable: true,
      });

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('global-signout-btn').click();
      });

      await waitFor(() => {
        expect(mockSupabaseAuth.signOut).toHaveBeenCalledWith({ scope: 'global' });
      });

      expect(mockSessionManager.cleanup).toHaveBeenCalled();
      expect(mockLoadingRegistry.clearAll).toHaveBeenCalled();
      expect(mockOperationQueue.clear).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle globalSignOut errors (lines 261-262)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabaseAuth.signOut.mockRejectedValueOnce(
        new Error('Global sign out failed')
      );

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('global-signout-btn').click();
      });

      await waitFor(() => {
        expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Session Management Coverage', () => {
    it('should handle session info periodic updates (line 118)', async () => {
      jest.useFakeTimers();
      
      const updatedSessionInfo = {
        isActive: true,
        lastActivity: Date.now(),
        sessionStart: Date.now() - 1000,
      };
      
      mockSessionManager.getSessionInfo
        .mockReturnValueOnce({ isActive: false })
        .mockReturnValueOnce(updatedSessionInfo);

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Fast-forward 30 seconds to trigger session info update
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockSessionManager.getSessionInfo).toHaveBeenCalledTimes(2);
      });
      
      jest.useRealTimers();
    });

    it('should test extendSession functionality (lines 288-289)', async () => {
      const extendedSessionInfo = {
        isActive: true,
        lastActivity: Date.now(),
        sessionStart: Date.now() - 5000,
      };
      
      mockSessionManager.getSessionInfo.mockReturnValue(extendedSessionInfo);

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('extend-session-btn').click();
      });

      expect(mockSessionManager.extendSession).toHaveBeenCalled();
      expect(mockSessionManager.getSessionInfo).toHaveBeenCalled();
    });
  });

  describe('Service Worker and Cleanup Coverage', () => {
    it('should handle service worker message posting (line 222)', async () => {
      const mockPostMessage = jest.fn();
      
      Object.defineProperty(window, 'navigator', {
        value: {
          serviceWorker: {
            controller: {
              postMessage: mockPostMessage,
            },
          },
        },
        writable: true,
      });

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      act(() => {
        screen.getByTestId('signout-btn').click();
      });

      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith({ type: 'CLEAR_CACHE' });
      });
    });

    it('should handle cleanup utility errors gracefully', async () => {
      // Make cleanup utilities throw errors
      mockLoadingRegistry.clearAll.mockImplementationOnce(() => {
        throw new Error('Loading registry error');
      });
      mockOperationQueue.clear.mockImplementationOnce(() => {
        throw new Error('Operation queue error');
      });
      mockAuthAwareStorageManager.handleSignOutCleanup!.mockImplementationOnce(() => {
        throw new Error('Storage cleanup error');
      });

      await renderWithAuthProvider(<ComprehensiveTestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Should not throw despite cleanup errors
      act(() => {
        screen.getByTestId('signout-btn').click();
      });

      await waitFor(() => {
        expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      });
    });
  });
});