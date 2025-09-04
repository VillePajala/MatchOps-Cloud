import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

jest.mock('@/utils/fullBackup', () => ({
  __esModule: true,
  exportFullBackup: jest.fn().mockResolvedValue('{}'),
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
    // Reset i18n language to initial state
    i18n.language = 'en';
    mockLoadLanguage.mockImplementation(async (lang: string) => {
      // Simulate the real loadLanguage behavior - this happens in the actual function
      i18n.language = lang; // Update the language property
      return mockChangeLanguage(lang);
    });
  });
  
  it('renders all action buttons', () => {
    const handlers = {
      onStartNewGame: jest.fn(),
      onLoadGame: jest.fn(),
      onResumeGame: jest.fn(),
      onCreateSeason: jest.fn(),
      onViewStats: jest.fn(),
    };

    render(
      <AuthProvider>
        <StartScreen
          onStartNewGame={handlers.onStartNewGame}
          onLoadGame={handlers.onLoadGame}
          onResumeGame={handlers.onResumeGame}
          canResume
          isAuthenticated
          onCreateSeason={handlers.onCreateSeason}
          onViewStats={handlers.onViewStats}
        />
      </AuthProvider>
    );

    expect(screen.getByRole('button', { name: 'Resume Last Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start New Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Season/Tournament' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Stats' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finnish' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start New Game' }));
    expect(handlers.onStartNewGame).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Resume Last Game' }));
    expect(handlers.onResumeGame).toHaveBeenCalled();

    // Test that language buttons are clickable (detailed language change logic tested elsewhere)
    fireEvent.click(screen.getByRole('button', { name: 'Finnish' }));
    // Button click should not throw error - language change is complex async behavior
  });
});
