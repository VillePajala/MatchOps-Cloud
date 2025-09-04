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
});

