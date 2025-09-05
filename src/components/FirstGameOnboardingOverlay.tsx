'use client';

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import { HiOutlineUsers, HiOutlinePlayCircle, HiOutlineXMark } from 'react-icons/hi2';

// Constants for maintainability
const FOCUSABLE_SELECTOR = '[data-onboarding-overlay] button, [data-onboarding-overlay] [tabindex]:not([tabindex="-1"])';

interface FirstGameOnboardingOverlayProps {
  hasPlayers: boolean;
  onSetupRoster: () => void;
  onCreateNewGame: () => void;
  onDismiss: () => void;
  isVisible: boolean;
}

const FirstGameOnboardingOverlay: React.FC<FirstGameOnboardingOverlayProps> = memo(({
  hasPlayers,
  onSetupRoster,
  onCreateNewGame,
  onDismiss,
  isVisible,
}) => {
  const { t } = useTranslation();

  // Handle backdrop click to dismiss
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onDismiss();
    }
  };

  // Handle escape key and focus management
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      
      // Focus trap - focus the first interactive element
      const focusableElements = document.querySelectorAll(FOCUSABLE_SELECTOR);
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isVisible, onDismiss]);

  if (!isVisible) {
    return null;
  }

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
        {/* Close button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-700/50"
            aria-label="Close"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Content based on player state */}
        <div className="text-center space-y-4">
          {!hasPlayers ? (
            <>
              {/* No Players State */}
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-indigo-500/20 rounded-full">
                  <HiOutlineUsers className="w-8 h-8 text-indigo-400" />
                </div>
              </div>
              
              <h2 id="onboarding-title" className="text-xl font-semibold text-slate-100 mb-2">
                {t('firstGame.titleNoPlayers', 'Ready to set up your team?')}
              </h2>
              
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {t('firstGame.messageNoPlayers', 'Start by adding players to your roster. You\'ll need at least one player to create a game.')}
              </p>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  variant="primary"
                  onClick={() => {
                    onSetupRoster();
                    onDismiss();
                  }}
                >
                  <HiOutlineUsers className="w-4 h-4 mr-2" />
                  {t('firstGame.setupRoster', 'Set Up Team Roster')}
                </Button>
                
                <button
                  onClick={onDismiss}
                  className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors py-2 px-4 rounded-md hover:bg-slate-700/50"
                >
                  {t('firstGame.skipForNow', 'Skip for now')}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Has Players State */}
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-full">
                  <HiOutlinePlayCircle className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              
              <h2 id="onboarding-title" className="text-xl font-semibold text-slate-100 mb-2">
                {t('firstGame.titleHasPlayers', 'Ready to create your first match!')}
              </h2>
              
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {t('firstGame.messageHasPlayers', 'You have players ready! Create your first match to start tracking game statistics and player performance.')}
              </p>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  variant="primary"
                  onClick={() => {
                    onCreateNewGame();
                    onDismiss();
                  }}
                >
                  <HiOutlinePlayCircle className="w-4 h-4 mr-2" />
                  {t('firstGame.createNewGame', 'Create New Game')}
                </Button>
                
                <button
                  onClick={onDismiss}
                  className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors py-2 px-4 rounded-md hover:bg-slate-700/50"
                >
                  {t('firstGame.maybeLater', 'Maybe later')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

FirstGameOnboardingOverlay.displayName = 'FirstGameOnboardingOverlay';

export default FirstGameOnboardingOverlay;