// Unit tests for AuthContext
import { render, screen, waitFor, act } from '@testing-library/react';
import { useAuth, AuthProvider } from '../AuthContext';
import { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

// Manual mocks
jest.mock('../../lib/supabase');
jest.mock('../../lib/security/rateLimiter');
jest.mock('../../lib/security/sessionManager');
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// Import after mocks
import { supabase } from '../../lib/supabase';
import { SecureAuthService } from '../../lib/security/rateLimiter';

// Test component to access auth context
const TestComponent = ({ testId = 'test-component' }: { testId?: string }) => {
  const auth = useAuth();
  
  return (
    <div data-testid={testId}>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <div data-testid="session">{auth.session ? JSON.stringify(auth.session) : 'null'}</div>
      <div data-testid="loading">{auth.loading.toString()}</div>
      <button 
        data-testid="signup-btn" 
        onClick={() => auth.signUp('test@example.com', 'password123')}
      >
        Sign Up
      </button>
      <button 
        data-testid="signin-btn" 
        onClick={() => auth.signIn('test@example.com', 'password123')}
      >
        Sign In
      </button>
      <button data-testid="signout-btn" onClick={() => auth.signOut()}>
        Sign Out
      </button>
      <button 
        data-testid="reset-btn" 
        onClick={() => auth.resetPassword('test@example.com')}
      >
        Reset Password
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

describe('AuthContext', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
    
    // Mock window.location.replace to prevent navigation errors in tests
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        replace: jest.fn(),
      },
      writable: true,
    });
    
    // Default mock implementations
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
  });

  describe('Initialization', () => {
    it('should initialize with null user and session, and loading becomes false', async () => {
      await renderWithAuthProvider(<TestComponent />);
      
      // Since useEffect runs immediately, loading should already be false after render
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    it('should call getSession on mount', async () => {
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
      });
    });

    it('should set up auth state change listener', async () => {
      await renderWithAuthProvider(<TestComponent />);
      
      expect(mockSupabaseAuth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('Auth State Management', () => {
    it('should update state when session is available', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };
      
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
        expect(screen.getByTestId('session')).toHaveTextContent(JSON.stringify(mockSession));
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    it('should handle auth state changes', async () => {
      let authStateCallback: (event: string, session: Session | null) => void;
      
      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });
      
      await renderWithAuthProvider(<TestComponent />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      // Simulate auth state change
      const newUser = { id: 'user-2', email: 'new@example.com' };
      const newSession = { access_token: 'new-token', user: newUser } as unknown as Session;
      
      act(() => {
        authStateCallback('SIGNED_IN', newSession);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(newUser));
        expect(screen.getByTestId('session')).toHaveTextContent(JSON.stringify(newSession));
      });
    });
  });

  describe('Authentication Methods', () => {
    it('should handle successful sign up', async () => {
      const mockUser = { id: 'new-user', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };
      
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      
      await renderWithAuthProvider(<TestComponent />);
      
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
    });

    it('should handle sign up errors', async () => {
      const mockError = { message: 'Invalid email' };
      
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });
      
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      act(() => {
        screen.getByTestId('signup-btn').click();
      });
      
      await waitFor(() => {
        expect(mockSupabaseAuth.signUp).toHaveBeenCalled();
      });
    });

    it('should handle successful sign in', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };
      
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      
      await renderWithAuthProvider(<TestComponent />);
      
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
    });

    it('should handle sign out', async () => {
      await renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      act(() => {
        screen.getByTestId('signout-btn').click();
      });
      
      await waitFor(() => {
        expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      });
    });

    it('should handle password reset', async () => {
      await renderWithAuthProvider(<TestComponent />);
      
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
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', async () => {
      const { unmount } = await renderWithAuthProvider(<TestComponent />);
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle getSession errors gracefully', async () => {
      // Mock console.error to avoid noise during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabaseAuth.getSession.mockRejectedValue(new Error('Session error'));
      
      await renderWithAuthProvider(<TestComponent />);
      
      // Wait for loading to finish and error to be handled
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      }, { timeout: 5000 });
      
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('session')).toHaveTextContent('null');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Hook Usage', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();
      
      expect(() => {
        render(<TestComponent testId="outside-provider" />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      console.error = originalError;
    });
  });
});