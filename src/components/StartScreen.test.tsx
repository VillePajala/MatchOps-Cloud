import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/context/AuthContext';

// Mock i18n module with specific functions for this test
const mockLoadLanguage = jest.fn();
const mockChangeLanguage = jest.fn();

jest.mock('@/i18n', () => {
  const mockI18n = {
    language: 'en',
    get changeLanguage() { return mockChangeLanguage; },
    isInitialized: true,
    on: jest.fn(),
    off: jest.fn(),
    hasResourceBundle: jest.fn().mockReturnValue(true),
    addResourceBundle: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockI18n,
    get loadLanguage() { return mockLoadLanguage; },
  };
});

jest.mock('@/utils/appSettings', () => ({
  __esModule: true,
  getAppSettings: jest.fn().mockResolvedValue({ language: 'en' }),
  updateAppSettings: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/supabase', () => ({
  __esModule: true,
  default: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signInAnonymously: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    }
  }
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

import i18n from '@/i18n';
import StartScreen from './StartScreen';

describe('StartScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18n.language = 'en';
    mockLoadLanguage.mockImplementation(async (lang: string) => {
      i18n.language = lang;
      return mockChangeLanguage(lang);
    });
  });

  it('renders onboarding buttons for first-time users and opens instructions modal', async () => {
    const handlers = {
      onStartNewGame: jest.fn(),
      onLoadGame: jest.fn(),
      onCreateSeason: jest.fn(),
      onViewStats: jest.fn(),
    };

    render(
      <AuthProvider>
        <StartScreen
          onStartNewGame={handlers.onStartNewGame}
          onLoadGame={handlers.onLoadGame}
          onCreateSeason={handlers.onCreateSeason}
          onViewStats={handlers.onViewStats}
          isAuthenticated
          isFirstTimeUser
        />
      </AuthProvider>
    );

    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How It Works' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(handlers.onStartNewGame).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'How It Works' }));
    expect(
      await screen.findByRole('heading', { name: 'instructionsModal.title' })
    ).toBeInTheDocument();
  });

  it('disables actions when data is missing in experienced mode', () => {
    const handlers = {
      onStartNewGame: jest.fn(),
      onLoadGame: jest.fn(),
      onCreateSeason: jest.fn(),
      onViewStats: jest.fn(),
    };

    render(
      <AuthProvider>
        <StartScreen
          onStartNewGame={handlers.onStartNewGame}
          onLoadGame={handlers.onLoadGame}
          onCreateSeason={handlers.onCreateSeason}
          onViewStats={handlers.onViewStats}
          isAuthenticated
          isFirstTimeUser={false}
          hasPlayers={false}
          hasSavedGames={false}
          hasSeasonsTournaments={false}
        />
      </AuthProvider>
    );

    expect(screen.getByRole('button', { name: 'Start New Game' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Load Game' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create Season/Tournament' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'View Stats' })).toBeDisabled();
  });

  it('switches language when language buttons are clicked', () => {
    const handlers = {
      onStartNewGame: jest.fn(),
      onLoadGame: jest.fn(),
      onCreateSeason: jest.fn(),
      onViewStats: jest.fn(),
    };

    render(
      <AuthProvider>
        <StartScreen
          onStartNewGame={handlers.onStartNewGame}
          onLoadGame={handlers.onLoadGame}
          onCreateSeason={handlers.onCreateSeason}
          onViewStats={handlers.onViewStats}
          isAuthenticated
        />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finnish' }));
    expect(
      screen.getByRole('button', { name: 'Finnish' })
    ).toHaveClass('bg-indigo-600');
  });

  describe('Disabled states and tooltips', () => {
    const handlers = {
      onStartNewGame: jest.fn(),
      onLoadGame: jest.fn(),
      onCreateSeason: jest.fn(),
      onViewStats: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows tooltip for Start New Game when no players exist', () => {
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            isAuthenticated
            isFirstTimeUser={false}
            hasPlayers={false}
          />
        </AuthProvider>
      );

      const startButton = screen.getByRole('button', { name: 'Start New Game' });
      expect(startButton).toBeDisabled();
      expect(startButton).toHaveAttribute('title', 'Add players to start a game');
    });

    it('shows tooltip for Load Game when no saved games exist', () => {
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            isAuthenticated
            isFirstTimeUser={false}
            hasPlayers={true}
            hasSavedGames={false}
          />
        </AuthProvider>
      );

      const loadButton = screen.getByRole('button', { name: 'Load Game' });
      expect(loadButton).toBeDisabled();
      expect(loadButton).toHaveAttribute('title', 'No saved games available');
    });

    it('shows tooltip for Create Season when no players exist', () => {
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            isAuthenticated
            isFirstTimeUser={false}
            hasPlayers={false}
          />
        </AuthProvider>
      );

      const seasonButton = screen.getByRole('button', { name: 'Create Season/Tournament' });
      expect(seasonButton).toBeDisabled();
      expect(seasonButton).toHaveAttribute('title', 'Add players to create a season');
    });

    it('shows tooltip for View Stats when no data exists', () => {
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            isAuthenticated
            isFirstTimeUser={false}
            hasPlayers={true}
            hasSavedGames={false}
            hasSeasonsTournaments={false}
          />
        </AuthProvider>
      );

      const statsButton = screen.getByRole('button', { name: 'View Stats' });
      expect(statsButton).toBeDisabled();
      expect(statsButton).toHaveAttribute('title', 'Save games or create a season to view stats');
    });

    it('enables buttons when prerequisite data exists', () => {
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            isAuthenticated
            isFirstTimeUser={false}
            hasPlayers={true}
            hasSavedGames={true}
            hasSeasonsTournaments={true}
          />
        </AuthProvider>
      );

      expect(screen.getByRole('button', { name: 'Start New Game' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Load Game' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Create Season/Tournament' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'View Stats' })).not.toBeDisabled();
    });

    it('enables View Stats when only saved games exist', () => {
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            isAuthenticated
            isFirstTimeUser={false}
            hasPlayers={true}
            hasSavedGames={true}
            hasSeasonsTournaments={false}
          />
        </AuthProvider>
      );

      expect(screen.getByRole('button', { name: 'View Stats' })).not.toBeDisabled();
    });

    it('enables View Stats when only seasons/tournaments exist', () => {
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            isAuthenticated
            isFirstTimeUser={false}
            hasPlayers={true}
            hasSavedGames={false}
            hasSeasonsTournaments={true}
          />
        </AuthProvider>
      );

      expect(screen.getByRole('button', { name: 'View Stats' })).not.toBeDisabled();
    });
  });

  describe('User mode switching', () => {
    const handlers = {
      onStartNewGame: jest.fn(),
      onLoadGame: jest.fn(),
      onCreateSeason: jest.fn(),
      onViewStats: jest.fn(),
    };

    it('shows first-time user interface for new users', () => {
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            isAuthenticated
            isFirstTimeUser={true}
          />
        </AuthProvider>
      );

      expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'How It Works' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Start New Game' })).not.toBeInTheDocument();
    });

    it('shows experienced user interface for returning users', () => {
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            isAuthenticated
            isFirstTimeUser={false}
            hasPlayers={true}
          />
        </AuthProvider>
      );

      expect(screen.getByRole('button', { name: 'Start New Game' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Get Started' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'How It Works' })).not.toBeInTheDocument();
    });

    it('shows resume button when user can resume and callback is provided', () => {
      const onResumeGame = jest.fn();
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            onResumeGame={onResumeGame}
            isAuthenticated
            isFirstTimeUser={false}
            canResume={true}
            hasPlayers={true}
          />
        </AuthProvider>
      );

      expect(screen.getByRole('button', { name: 'Resume Last Game' })).toBeInTheDocument();
    });

    it('hides resume button when user cannot resume', () => {
      const onResumeGame = jest.fn();
      render(
        <AuthProvider>
          <StartScreen
            {...handlers}
            onResumeGame={onResumeGame}
            isAuthenticated
            isFirstTimeUser={false}
            canResume={false}
            hasPlayers={true}
          />
        </AuthProvider>
      );

      expect(screen.queryByRole('button', { name: 'Resume Last Game' })).not.toBeInTheDocument();
    });
  });
});

