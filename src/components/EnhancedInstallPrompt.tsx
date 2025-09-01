'use client';

import React, { useState, useEffect } from 'react';
import { 
  getPWASettings, 
  incrementInstallPromptCount, 
  setInstallPromptDismissed,
  getAppUsageCount,
  incrementAppUsageCount,
  setInstallPromptNeverShow 
} from '@/utils/pwaSettings';
import logger from '@/utils/logger';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface EnhancedInstallPromptProps {
  className?: string;
}

export default function EnhancedInstallPrompt({ className = '' }: EnhancedInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installCount, setInstallCount] = useState(0);
  const [lastPromptDismissed, setLastPromptDismissed] = useState<number | null>(null);

  useEffect(() => {
    // Check if app is already installed/running in standalone mode
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        Boolean((window.navigator as unknown as Record<string, unknown>).standalone) ||
                        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();

    // Load install stats from IndexedDB
    const loadPWASettings = async () => {
      const settings = await getPWASettings();
      setInstallCount(settings.installPromptCount);
      if (settings.installPromptLastDismissed) {
        setLastPromptDismissed(settings.installPromptLastDismissed);
      }
    };
    
    loadPWASettings();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      logger.debug('[Install] beforeinstallprompt event captured');
      
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show prompt based on smart logic
      shouldShowInstallPrompt().then(shouldShow => {
        setShowPrompt(shouldShow);
        
        if (shouldShow) {
          logger.debug('[Install] Showing install prompt');
        }
      });
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      logger.debug('[Install] App was installed');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      
      // Track successful installation
      incrementInstallPromptCount().then(newCount => {
        setInstallCount(newCount);
      });
    };

    // Smart logic to determine if we should show install prompt
    const shouldShowInstallPrompt = async (): Promise<boolean> => {
      // Don't show if already standalone
      if (isStandalone) return false;
      
      // Don't show if dismissed recently (within 7 days)
      if (lastPromptDismissed) {
        const daysSinceDismissed = (Date.now() - lastPromptDismissed) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          logger.debug('[Install] Prompt dismissed recently, waiting...');
          return false;
        }
      }
      
      // Don't show if prompted too many times (max 3)
      if (installCount >= 3) {
        logger.debug('[Install] Max prompt count reached');
        return false;
      }
      
      // Check if user has used the app enough (basic engagement check)
      const usageCount = await getAppUsageCount();
      
      // Show after user has used the app at least 3 times
      return usageCount >= 3;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [installCount, lastPromptDismissed, isStandalone]);

  // Track app usage for engagement-based prompting
  useEffect(() => {
    const incrementUsage = async () => {
      await incrementAppUsageCount();
    };

    // Increment usage count on mount (page visit)
    incrementUsage();
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      logger.warn('[Install] No deferred prompt available');
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice;
      logger.debug('[Install] User choice:', choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        logger.debug('[Install] User accepted the install prompt');
        setIsInstalled(true);
      } else {
        logger.debug('[Install] User dismissed the install prompt');
        handleDismiss();
      }
      
      // Clean up
      setDeferredPrompt(null);
      setShowPrompt(false);
      
    } catch (error) {
      logger.error('[Install] Error during installation:', error);
    }
  };

  const handleDismiss = async () => {
    const now = Date.now();
    setLastPromptDismissed(now);
    await setInstallPromptDismissed(now);
    
    const newCount = await incrementInstallPromptCount();
    setInstallCount(newCount);
    
    setShowPrompt(false);
    logger.debug('[Install] Install prompt dismissed');
  };

  const handleNeverShow = async () => {
    // Set count to max to prevent future prompts
    setInstallCount(999);
    await setInstallPromptNeverShow();
    setShowPrompt(false);
    logger.debug('[Install] Install prompt disabled permanently');
  };

  // Don't render anything if conditions aren't met
  if (!showPrompt || !deferredPrompt || isStandalone || isInstalled) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚽</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Install MatchOps Cloud</h3>
              <p className="text-sm text-gray-600">Plan • Track • Debrief</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Features */}
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-green-500">⚡</span>
              <span>Faster loading</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-blue-500">📱</span>
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-purple-500">🔔</span>
              <span>Push notifications</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-orange-500">🚀</span>
              <span>App shortcuts</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Install App
          </button>
          <button
            onClick={handleNeverShow}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            Don&apos;t ask again
          </button>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 mt-2 text-center">
          Installing adds a shortcut to your home screen. No personal data is collected during installation.
        </p>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}