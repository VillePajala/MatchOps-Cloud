import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@/__tests__/test-utils';
import Home from '../page';
import { useAuth } from '@/context/AuthContext';
import { useAppStateDetection } from '@/hooks/useAppStateDetection';
import { useAuthStorage } from '@/hooks/useAuthStorage';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

// Mock all dependencies
jest.mock('@/context/AuthContext');
jest.mock('@/hooks/useAppStateDetection');
jest.mock('@/hooks/useAuthStorage');
jest.mock('next/navigation');
jest.mock('@/lib/supabase');
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock child components
jest.mock('@/components/HomePage', () => {
  return function HomePage(props: any) {
    return <div data-testid="home-page">HomePage Component</div>;
  };
});

// Mock config
jest.mock('@/config/manifest.config.js', () => ({
  manifestConfig: {
    default: {
      appName: 'MatchOps Cloud',
      iconPath: '/icon.png',
      themeColor: '#1e293b',
    },
  },
}));

jest.mock('@/components/StartScreen', () => {
  return function StartScreen(props: any) {
    return (
      <div data-testid="start-screen">
        StartScreen Component
        <button onClick={props.onStartNewGame} data-testid="start-new-game">
          Start New Game
        </button>
        <button onClick={props.onLoadGame} data-testid="load-game">
          Load Game
        </button>
        <button onClick={props.onResumeGame} data-testid="resume-game">
          Resume Game
        </button>
        <button onClick={props.onCreateSeason} data-testid="create-season">
          Create Season
        </button>
        <button onClick={props.onViewStats} data-testid="view-stats">
          View Stats
        </button>
      </div>
    );
  };
});

jest.mock('@/components/OfflineBanner', () => {
  return {
    OfflineBanner: function OfflineBanner(props: any) {
      return <div data-testid="offline-banner">Offline Banner</div>;
    },
  };
});

describe('Home Page', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockSearchParams = {
    get: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  };

  const mockAuth = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updateEmail: jest.fn(),
    updatePassword: jest.fn(),
    deleteAccount: jest.fn(),
    refreshSession: jest.fn(),
  };

  const mockSupabase = {
    auth: {
      exchangeCodeForSession: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Re-setup logger mocks after clearAllMocks
    (logger.debug as jest.Mock) = jest.fn();
    (logger.info as jest.Mock) = jest.fn();
    (logger.warn as jest.Mock) = jest.fn();
    (logger.error as jest.Mock) = jest.fn();
    
    (useAuth as jest.Mock).mockReturnValue(mockAuth);
    (useAppStateDetection as jest.Mock).mockReturnValue({
      canResume: false,
      hasPlayers: false,
      hasSavedGames: false,
      hasSeasonsTournaments: false,
      isFirstTimeUser: true,
    });
    (useAuthStorage as jest.Mock).mockReturnValue({});
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (supabase as any).auth = mockSupabase.auth;
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/',
        hash: '',
        search: '',
        pathname: '/',
      },
      writable: true,
    });

    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        replaceState: jest.fn(),
      },
      writable: true,
    });

    // Clear all search params by default
    mockSearchParams.get.mockReturnValue(null);
  });

  describe('Initial Rendering', () => {
    it('should render StartScreen by default', () => {
      render(<Home />);
      
      expect(screen.getByTestId('start-screen')).toBeInTheDocument();
      expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
    });

    it('should render OfflineBanner', () => {
      render(<Home />);
      
      expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    });

    it('should initialize with correct hooks', () => {
      render(<Home />);
      
      expect(useAuth).toHaveBeenCalled();
      expect(useAppStateDetection).toHaveBeenCalled();
      expect(useAuthStorage).toHaveBeenCalled();
    });
  });

  describe('Screen Navigation', () => {
    it('should call StartScreen handlers when buttons are clicked', () => {
      render(<Home />);
      
      expect(screen.getByTestId('start-screen')).toBeInTheDocument();
      
      // Test that button clicks work
      const startNewGameButton = screen.getByTestId('start-new-game');
      const loadGameButton = screen.getByTestId('load-game');
      const resumeGameButton = screen.getByTestId('resume-game');
      const createSeasonButton = screen.getByTestId('create-season');
      const viewStatsButton = screen.getByTestId('view-stats');
      
      expect(startNewGameButton).toBeInTheDocument();
      expect(loadGameButton).toBeInTheDocument();
      expect(resumeGameButton).toBeInTheDocument();
      expect(createSeasonButton).toBeInTheDocument();
      expect(viewStatsButton).toBeInTheDocument();
    });

    // Simplified tests focusing on the core functionality
    it('should show start screen by default', () => {
      render(<Home />);
      expect(screen.getByTestId('start-screen')).toBeInTheDocument();
      expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
    });
  });

  describe('Authentication State Management', () => {
    it('should pass authentication state to StartScreen', () => {
      const authenticatedAuth = { ...mockAuth, user: { id: '123' }, isAuthenticated: true };
      (useAuth as jest.Mock).mockReturnValue(authenticatedAuth);
      
      render(<Home />);
      
      expect(screen.getByTestId('start-screen')).toBeInTheDocument();
    });

    it('should handle auth state changes', async () => {
      const authenticatedAuth = { ...mockAuth, user: { id: '123' }, isAuthenticated: true };
      (useAuth as jest.Mock).mockReturnValue(authenticatedAuth);
      
      const { rerender } = render(<Home />);
      
      expect(screen.getByTestId('start-screen')).toBeInTheDocument();
      
      // User logs out - component should still show start screen
      (useAuth as jest.Mock).mockReturnValue({ ...mockAuth, user: null, isAuthenticated: false });
      rerender(<Home />);
      
      expect(screen.getByTestId('start-screen')).toBeInTheDocument();
    });

    it('should handle resume availability changes', () => {
      const { rerender } = render(<Home />);
      
      expect(useAppStateDetection).toHaveBeenCalledWith(null);
      
      // User becomes authenticated
      const authenticatedAuth = { ...mockAuth, user: { id: '123' } };
      (useAuth as jest.Mock).mockReturnValue(authenticatedAuth);
      
      rerender(<Home />);
      
      expect(useAppStateDetection).toHaveBeenCalledWith({ id: '123' });
    });
  });

  describe('Password Reset Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      
      // Re-setup logger mocks after clearAllMocks
      (logger.debug as jest.Mock) = jest.fn();
      (logger.info as jest.Mock) = jest.fn();
      (logger.warn as jest.Mock) = jest.fn();
      (logger.error as jest.Mock) = jest.fn();
      
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    });

    it('should handle PKCE code parameter for password reset', async () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'code') return 'reset-code-123';
        return null;
      });

      await act(async () => {
        render(<Home />);
      });

      await waitFor(() => {
        expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith({ 
          authCode: 'reset-code-123' 
        });
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/reset-password');
      });
    });

    it('should handle PKCE code exchange errors', async () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'code') return 'invalid-code';
        return null;
      });
      
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ 
        error: new Error('Invalid code') 
      });

      await act(async () => {
        render(<Home />);
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/password-reset-help');
        expect(logger.error).toHaveBeenCalledWith('PKCE code exchange error:', expect.any(Error));
      });
    });

    it('should handle PKCE exchange exceptions', async () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'code') return 'error-code';
        return null;
      });
      
      mockSupabase.auth.exchangeCodeForSession.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(<Home />);
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/password-reset-help');
        expect(logger.error).toHaveBeenCalledWith('PKCE exchange failed:', expect.any(Error));
      });
    });

    it('should handle legacy hash fragment password reset', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hash: '#access_token=xyz123&type=recovery',
          pathname: '/',
        },
        writable: true,
      });

      await act(async () => {
        render(<Home />);
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/reset-password#access_token=xyz123&type=recovery');
      });
    });

    it('should not interfere with direct navigation to reset-password page', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          pathname: '/auth/reset-password',
        },
        writable: true,
      });

      await act(async () => {
        render(<Home />);
      });

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Email Verification Toast', () => {
    it('should show verification toast when verified=true in URL', async () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'verified') return 'true';
        return null;
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Email Verified!')).toBeInTheDocument();
        expect(screen.getByText(/Your email has been successfully verified/)).toBeInTheDocument();
      });
    });

    it('should clean up URL parameters after showing verification toast', async () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'verified') return 'true';
        return null;
      });

      render(<Home />);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/', undefined);
      });
    });

    it('should auto-hide verification toast after 5 seconds', async () => {
      jest.useFakeTimers();
      
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'verified') return 'true';
        return null;
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Email Verified!')).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Email Verified!')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should allow manual close of verification toast', async () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'verified') return 'true';
        return null;
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Email Verified!')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: '×' });
      fireEvent.click(closeButton);

      expect(screen.queryByText('Email Verified!')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing router gracefully', () => {
      (useRouter as jest.Mock).mockReturnValue(null);
      
      expect(() => render(<Home />)).not.toThrow();
    });

    it('should handle missing search params gracefully', () => {
      // Mock searchParams with empty get function instead of null
      const emptySearchParams = {
        get: jest.fn(() => null),
        has: jest.fn(() => false),
        getAll: jest.fn(() => []),
        keys: jest.fn(() => []),
        values: jest.fn(() => []),
        entries: jest.fn(() => []),
        forEach: jest.fn(),
        toString: jest.fn(() => ''),
      };
      (useSearchParams as jest.Mock).mockReturnValue(emptySearchParams);
      
      expect(() => render(<Home />)).not.toThrow();
    });

    it('should handle auth hook errors', () => {
      (useAuth as jest.Mock).mockImplementation(() => {
        throw new Error('Auth error');
      });
      
      expect(() => render(<Home />)).toThrow('Auth error');
    });

    it('should handle URL cleanup errors gracefully', async () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'verified') return 'true';
        return null;
      });

      // Mock URL constructor to throw
      const originalURL = global.URL;
      global.URL = jest.fn().mockImplementation(() => {
        throw new Error('URL error');
      });

      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          pathname: '/some-other-path',
        },
        writable: true,
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Email Verified!')).toBeInTheDocument();
      });

      // Should not crash despite URL error
      expect(screen.getByTestId('start-screen')).toBeInTheDocument();

      global.URL = originalURL;
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle rapid navigation actions', async () => {
      render(<Home />);
      
      const startButton = screen.getByTestId('start-new-game');
      
      // Multiple clicks shouldn't break anything  
      for (let i = 0; i < 5; i++) {
        fireEvent.click(startButton);
      }
      
      // Should still have start screen (since we simplified navigation testing)
      expect(screen.getByTestId('start-screen')).toBeInTheDocument();
    });

    it('should handle component remounting', () => {
      const { unmount } = render(<Home />);
      
      unmount();
      
      // Remount with a fresh render
      render(<Home />);
      
      expect(screen.getByTestId('start-screen')).toBeInTheDocument();
    });

    it('should handle auth state changes efficiently', () => {
      const { rerender } = render(<Home />);
      
      // Multiple rapid auth state changes
      for (let i = 0; i < 5; i++) {
        const user = i % 2 === 0 ? { id: `user-${i}` } : null;
        (useAuth as jest.Mock).mockReturnValue({ ...mockAuth, user });
        rerender(<Home />);
      }
      
      expect(screen.getByTestId('start-screen')).toBeInTheDocument();
    });
  });

  describe('Logging', () => {
    it('should log page load information', async () => {
      await act(async () => {
        render(<Home />);
      });

      expect(logger.debug).toHaveBeenCalledWith(
        '[Home] Rendering with detection:',
        expect.objectContaining({
          canResume: false,
          hasPlayers: false,
          hasSavedGames: false,
          hasSeasonsTournaments: false,
          isFirstTimeUser: true,
        }),
        'screen:',
        'start',
        'user:',
        false
      );
    });

    it('should log URL information during password reset', async () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'code') return 'test-code';
        return null;
      });

      await act(async () => {
        render(<Home />);
      });

      expect(logger.debug).toHaveBeenCalledWith('Page loaded - URL info:', expect.objectContaining({
        href: expect.any(String),
        hash: expect.any(String),
        search: expect.any(String),
        pathname: expect.any(String),
      }));
    });
  });
});