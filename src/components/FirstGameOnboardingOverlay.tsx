'use client';

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import { HiOutlineUsers, HiOutlinePlayCircle, HiOutlineXMark, HiOutlineTrophy } from 'react-icons/hi2';

// Constants for maintainability
const FOCUSABLE_SELECTOR = '[data-onboarding-overlay] button, [data-onboarding-overlay] [tabindex]:not([tabindex="-1"])';

interface FirstGameOnboardingOverlayProps {
  phase: 'no-players' | 'has-players' | 'tutorial';
  hasPlayers: boolean;
  hasTeams?: boolean;
  hasSeasons?: boolean;
  hasTournaments?: boolean;
  onCreateRoster: () => void;
  onCreateGame: () => void;
  onManageTeams?: () => void;
  onManageSeasons?: () => void;
  onDismiss: () => void;
  isVisible: boolean;
  // Tutorial phase specific
  tutorialStep?: number;
  onTutorialNext?: () => void;
  onTutorialPrev?: () => void;
  onTutorialClose?: () => void;
}

const FirstGameOnboardingOverlay: React.FC<FirstGameOnboardingOverlayProps> = memo(({
  phase,
  hasPlayers: _hasPlayers,
  hasTeams: _hasTeams = false,
  hasSeasons: _hasSeasons = false,
  hasTournaments: _hasTournaments = false,
  onCreateRoster,
  onCreateGame,
  onManageTeams,
  onManageSeasons,
  onDismiss,
  isVisible,
  tutorialStep = 0,
  onTutorialNext,
  onTutorialPrev,
  onTutorialClose,
}) => {
  const { t } = useTranslation();

  // Handle backdrop click to dismiss
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onDismiss();
    }
  };

  // Handle escape key and focus management with Tab cycling
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      } else if (e.key === 'Tab') {
        // Implement focus cycling within the modal
        const focusableElements = document.querySelectorAll(FOCUSABLE_SELECTOR);
        const focusableArray = Array.from(focusableElements) as HTMLElement[];
        
        if (focusableArray.length === 0) return;
        
        const currentFocusIndex = focusableArray.findIndex(el => el === document.activeElement);
        
        if (e.shiftKey) {
          // Shift+Tab - move backwards
          const prevIndex = currentFocusIndex <= 0 ? focusableArray.length - 1 : currentFocusIndex - 1;
          focusableArray[prevIndex]?.focus();
        } else {
          // Tab - move forwards
          const nextIndex = currentFocusIndex >= focusableArray.length - 1 ? 0 : currentFocusIndex + 1;
          focusableArray[nextIndex]?.focus();
        }
        
        e.preventDefault();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      
      // Focus trap - focus the first interactive element
      const focusableElements = document.querySelectorAll(FOCUSABLE_SELECTOR);
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isVisible, onDismiss]);

  if (!isVisible) {
    return null;
  }

  const renderPhase1 = () => (
    <div className="text-center space-y-4">
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-indigo-500/20 rounded-full">
          <HiOutlineUsers className="w-8 h-8 text-indigo-400" />
        </div>
      </div>
      
      <h2 id="onboarding-title" className="text-xl font-semibold text-slate-100 mb-2">
        {t('firstGame.phase1.title', 'Valmis aloittamaan?')}
      </h2>
      
      <p className="text-slate-300 text-sm leading-relaxed mb-6">
        {t('firstGame.phase1.message', 'Lisää ensin pelaajia, jotta voit luoda ensimmäisen joukkuesi ja ottelusi.')}
      </p>

      <div className="space-y-3">
        <Button
          className="w-full"
          variant="primary"
          onClick={() => {
            onCreateRoster();
            onDismiss();
          }}
        >
          <HiOutlineUsers className="w-4 h-4 mr-2" />
          {t('firstGame.phase1.createRoster', 'Luo kokoonpano')}
        </Button>
      </div>
    </div>
  );

  const renderPhase2 = () => (
    <div className="text-center space-y-4">
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-emerald-500/20 rounded-full">
          <HiOutlinePlayCircle className="w-8 h-8 text-emerald-400" />
        </div>
      </div>
      
      <h2 id="onboarding-title" className="text-xl font-semibold text-slate-100 mb-2">
        {t('firstGame.phase2.title', 'Kaikki valmista ensimmäiseen otteluun!')}
      </h2>
      
      <p className="text-slate-300 text-sm leading-relaxed mb-6">
        {t('firstGame.phase2.message', 'Haluatseesi voit luoda ensimmäisen joukkuesi, turnauksei tai kautesi.')}
      </p>

      <div className="space-y-3">
        {/* Primary action: Create first match */}
        <Button
          className="w-full"
          variant="primary"
          onClick={() => {
            onCreateGame();
            onDismiss();
          }}
        >
          <HiOutlinePlayCircle className="w-4 h-4 mr-2" />
          {t('firstGame.phase2.createFirstMatch', 'Luo ensimmäinen ottelu')}
        </Button>
        
        {/* Secondary action: Manage teams */}
        <Button
          className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600"
          variant="secondary"
          onClick={() => {
            if (onManageTeams) onManageTeams();
            onDismiss();
          }}
        >
          <HiOutlineUsers className="w-4 h-4 mr-2" />
          {t('firstGame.phase2.manageTeams', 'Hallinnoi joukkueita')}
        </Button>
        
        {/* Secondary action: Create season/tournament */}
        <Button
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          variant="secondary"
          onClick={() => {
            if (onManageSeasons) onManageSeasons();
            onDismiss();
          }}
        >
          <HiOutlineTrophy className="w-4 h-4 mr-2" />
          {t('firstGame.phase2.createSeasonTournament', 'Luo ensin kausi/turnaus')}
        </Button>
      </div>
    </div>
  );

  const renderTutorialPhase = () => (
    <div className="text-center space-y-4">
      <h2 id="onboarding-title" className="text-xl font-semibold text-slate-100 mb-2">
        {t('firstGame.tutorial.title', 'Tervetuloa ensimmäiseen otteluusi!')}
      </h2>
      
      <p className="text-slate-400 text-sm mb-4">
        {t('firstGame.tutorial.subtitle', 'Käydään nopeastit läpi perustoimimat')}
      </p>

      <div className="text-left space-y-4 bg-slate-900/50 rounded-lg p-4">
        <h3 className="font-semibold text-indigo-200 text-base">
          {t('firstGame.tutorial.playerSelection', 'Pelaajien valinta (yläpalkki)')}
        </h3>
        <ul className="text-sm text-slate-300 space-y-2 list-disc pl-4 marker:text-slate-400">
          <li>{t('firstGame.tutorial.steps.selectPlayer', 'Napeauta pelaajekiekkoa aktivoidaaksei pelaaja')}</li>
          <li>{t('firstGame.tutorial.steps.setGoalie', 'Kun pelaaja on valiituna, paina kilven kuvaa asettaaksi hänet maalivahdoksi')}</li>
          <li>{t('firstGame.tutorial.steps.placePlayer', 'Pelaajan ollessa valittuna, napauta kenttää sijoittaksesei pelaaja')}</li>
        </ul>
      </div>

      {/* Navigation with step indicators */}
      <div className="flex justify-between items-center pt-4">
        <button 
          onClick={onTutorialPrev}
          disabled={tutorialStep === 0}
          className="px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('firstGame.tutorial.back', 'Takaisin')}
        </button>
        
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === tutorialStep ? 'bg-indigo-400' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>
        
        <button 
          onClick={tutorialStep === 6 ? onTutorialClose : onTutorialNext}
          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          {tutorialStep === 6 ? 'Valmis!' : t('firstGame.tutorial.next', 'Seuraava')}
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (phase) {
      case 'no-players':
        return renderPhase1();
      case 'has-players':
        return renderPhase2();
      case 'tutorial':
        return renderTutorialPhase();
      default:
        return renderPhase1();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="absolute inset-0 flex items-center justify-center z-[70] bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-300"
      onClick={handleBackdropClick}
      data-onboarding-overlay
    >
      <div className="bg-slate-800/95 border border-slate-600 rounded-xl p-6 max-w-md mx-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Close button - only for phases 1 and 2, not tutorial */}
        {phase !== 'tutorial' && (
          <div className="flex justify-end mb-2">
            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-700/50"
              aria-label="Close"
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
});

FirstGameOnboardingOverlay.displayName = 'FirstGameOnboardingOverlay';

export default FirstGameOnboardingOverlay;