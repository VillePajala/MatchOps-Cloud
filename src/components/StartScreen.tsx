'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { loadLanguage } from '@/i18n';
import {
  updateAppSettings,
  getAppSettings,
} from '@/utils/appSettings';
import { AuthModal } from '@/components/auth/AuthModal';
import { HiOutlineArrowRightOnRectangle, HiOutlineUserPlus, HiCheck } from 'react-icons/hi2';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import logger from '@/utils/logger';

interface StartScreenProps {
  onStartNewGame: () => void;
  onLoadGame: () => void;
  onResumeGame?: () => void;
  onCreateSeason: () => void;
  onViewStats: () => void;
  canResume?: boolean;
  isAuthenticated?: boolean;
  hasPlayers?: boolean;
  hasSavedGames?: boolean;
  hasSeasonsTournaments?: boolean;
  isFirstTimeUser?: boolean;
}

const StartScreen: React.FC<StartScreenProps> = ({
  onStartNewGame,
  onLoadGame,
  onResumeGame,
  onCreateSeason,
  onViewStats,
  canResume = false,
  isAuthenticated = false,
  hasPlayers: _hasPlayers = false,
  hasSavedGames: _hasSavedGames = false,
  hasSeasonsTournaments: _hasSeasonsTournaments = false,
  isFirstTimeUser: _isFirstTimeUser = true,
}) => {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [language, setLanguage] = useState<string>(i18n.language);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);

  const didInitializeLanguageRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const initAndSyncLanguage = async () => {
      try {
        const settings = await getAppSettings();
        let desired = language;
        // On first run, prefer saved setting if present; afterwards always honor explicit user choice
        if (!didInitializeLanguageRef.current && settings.language) {
          desired = settings.language;
        }

        if (!cancelled && desired && desired !== i18n.language) {
          await loadLanguage(desired);
          if (!cancelled) {
            setLanguage(desired);
            await updateAppSettings({ language: desired }).catch(() => { });
          }
        }

        didInitializeLanguageRef.current = true;
      } catch (error) {
        logger.warn('[StartScreen] Language init/sync failed:', error);
      }
    };
    initAndSyncLanguage();
    return () => { cancelled = true; };
  }, [language]);

  // Show success message when user logs in
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      setShowAuthModal(false);
      setShowLoginSuccess(true);
    }
  }, [isAuthenticated, showAuthModal]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (showLoginSuccess) {
      const timer = setTimeout(() => {
        setShowLoginSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showLoginSuccess]);

  const buttonFull = 'w-64 sm:w-64 md:w-56';

  const containerStyle =
    'relative flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 font-display overflow-hidden py-8 sm:py-16 md:py-24 px-4';

  const taglineStyle =
    'text-xl sm:text-2xl text-slate-200/95 text-center tracking-wide drop-shadow-md relative';

  const titleStyle =
    'text-6xl sm:text-7xl lg:text-9xl font-extrabold tracking-tight leading-tight drop-shadow-lg mb-2 text-center';


  return (
    <div className={containerStyle}>
      <div className="absolute inset-0 bg-noise-texture" />
      <div className="absolute inset-0 bg-gradient-radial from-slate-950 via-slate-900/80 to-slate-900" />
      {/* Animated aurora gradient (darker, moody) */}
      <div className="absolute inset-0 pointer-events-none animate-gradient [background:linear-gradient(120deg,theme(colors.indigo.950),theme(colors.blue.900),theme(colors.cyan.900),theme(colors.indigo.950))] opacity-25" />
      {/* Subtle grid for depth */}
      <div className="absolute inset-0 pointer-events-none sm:opacity-[0.04] opacity-[0.03] [background-image:linear-gradient(to_right,rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-sky-700/20 to-cyan-600/30 mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
      {/* Spotlight behind title */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 w-[60vw] h-[32vh] pointer-events-none opacity-70 [background:radial-gradient(closest-side,rgba(56,189,248,0.14),transparent_70%)] blur-[28px]" />
      <div className="absolute -inset-[50px] bg-sky-400/10 blur-3xl top-0 opacity-50" />
      <div className="absolute -inset-[50px] bg-indigo-600/10 blur-3xl bottom-0 opacity-50" />
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(60%_50%_at_12%_12%,theme(colors.indigo.700)/0.25_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(50%_40%_at_88%_78%,theme(colors.sky.500)/0.25_0%,transparent_70%)]" />
      {/* Vignette for focus */}
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(120%_90%_at_50%_50%,transparent_60%,rgba(0,0,0,0.35)_100%)]" />
      {/* Elegant rotating conic highlight */}
      <div className="absolute inset-0 pointer-events-none animate-rotate-slow opacity-10 [background:conic-gradient(from_150deg_at_65%_38%,theme(colors.cyan.400)/0.35_0deg,transparent_60deg,transparent_300deg,theme(colors.indigo.500)/0.35_360deg)]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm sm:max-w-md mt-[-6vh] sm:mt-[-5vh]">
        <h1 className={`${titleStyle} relative`}>
          <span className="block relative text-yellow-400 title-outline">
            {/* Neon inner glow */}
            <span className="absolute inset-0 -z-10 blur-[6px] opacity-60 [background:radial-gradient(closest-side,rgba(234,179,8,0.35),transparent_70%)]" />
            MatchOps
          </span>
          <span className="block -mt-1 relative text-yellow-400 title-outline">
            <span className="absolute inset-0 -z-10 blur-[6px] opacity-60 [background:radial-gradient(closest-side,rgba(234,179,8,0.35),transparent_70%)]" />
            Cloud
          </span>
          {/* Remove sheen sweep; rely on animated gradient text */}
        </h1>
        <p className={taglineStyle}>
          {t('startScreen.tagline', 'Elevate Your Game')}
          <span className="absolute inset-0 -z-10 mx-auto w-[80%] h-full pointer-events-none [background:radial-gradient(closest-side,rgba(99,102,241,0.12),transparent_70%)] blur-md" />
        </p>
        <div className="h-px w-44 sm:w-64 bg-gradient-to-r from-transparent via-sky-400/70 to-transparent mx-auto mt-6 sm:mt-8 mb-8 sm:mb-12" />

        {/* Show different content based on auth state */}
        {!isAuthenticated ? (
          <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
            <Button
              className={buttonFull}
              variant="primary"
              onClick={() => {
                setAuthModalMode('signin');
                setShowAuthModal(true);
              }}
            >
              <span className="flex items-center justify-center w-full">
                <span className="w-6 text-left">
                  <HiOutlineArrowRightOnRectangle className="w-4 sm:w-5 h-4 sm:h-5" />
                </span>
                <span className="flex-1 text-center">{t('auth.signIn')}</span>
                <span className="w-6" />
              </span>
            </Button>
            <Button
              className={buttonFull}
              variant="secondary"
              onClick={() => {
                setAuthModalMode('signup');
                setShowAuthModal(true);
              }}
            >
              <span className="flex items-center justify-center w-full">
                <span className="w-6 text-left">
                  <HiOutlineUserPlus className="w-4 sm:w-5 h-4 sm:h-5" />
                </span>
                <span className="flex-1 text-center">{t('auth.signUp')}</span>
                <span className="w-6" />
              </span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 sm:space-y-4 w-full max-h-[60vh] sm:max-h-none overflow-y-auto">
            {(() => {
              logger.debug('[StartScreen] Render: canResume =', canResume, 'onResumeGame =', !!onResumeGame);
              return canResume && onResumeGame ? (
                <Button className={buttonFull} variant="primary" onClick={onResumeGame}>
                  {t('startScreen.resumeGame', 'Resume Last Game')}
                </Button>
              ) : null;
            })()}
            <Button className={buttonFull} variant="primary" onClick={onStartNewGame}>
              {t('startScreen.startNewGame', 'Start New Game')}
            </Button>
            <Button className={buttonFull} variant="secondary" onClick={onLoadGame}>
              {t('startScreen.loadGame', 'Load Game')}
            </Button>
            <Button className={buttonFull} variant="secondary" onClick={onCreateSeason}>
              {t('startScreen.createSeasonTournament', 'Create Season/Tournament')}
            </Button>
            <Button className={buttonFull} variant="secondary" onClick={onViewStats}>
              {t('startScreen.viewStats', 'View Stats')}
            </Button>
            <Button
              className={buttonFull}
              variant="destructive"
              onClick={signOut}
            >
              <span className="flex items-center justify-center w-full">
                <span className="w-6 text-left">
                  <HiOutlineArrowRightOnRectangle className="w-4 sm:w-5 h-4 sm:h-5 rotate-180" />
                </span>
                <span className="flex-1 text-center">{t('auth.signOut')}</span>
                <span className="w-6" />
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Success toast notification - positioned in top area */}
      {showLoginSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600/90 backdrop-blur-sm border border-green-500/70 text-green-100 px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          <HiCheck className="w-5 h-5" />
          <span className="font-medium">{t('auth.loginSuccess')}</span>
        </div>
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode={authModalMode}
        />
      )}

      <div className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center bottom-8 md:bottom-6">
        <div className="flex rounded-lg bg-slate-800/70 border border-slate-600 backdrop-blur-sm overflow-hidden">
          <button
            aria-label={t('startScreen.languageEnglish', 'English')}
            onClick={() => setLanguage('en')}
            className={`px-3 h-8 text-xs font-bold transition-colors focus:outline-none ${language === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/60'}`}
          >
            EN
          </button>
          <button
            aria-label={t('startScreen.languageFinnish', 'Finnish')}
            onClick={() => setLanguage('fi')}
            className={`px-3 h-8 text-xs font-bold transition-colors focus:outline-none border-l border-slate-600/60 ${language === 'fi' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/60'}`}
          >
            FI
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
