'use client';

// 🔧 CUTOVER COMPLETE: No ModalProvider needed - pure Zustand modal state management
import HomePage from '@/components/HomePage';
import StartScreen from '@/components/StartScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useState, useEffect, Suspense } from 'react';
import { useAppStateDetection } from '@/hooks/useAppStateDetection';
import { useAuthStorage } from '@/hooks/useAuthStorage';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

// Component to handle verification toast that uses search params
function VerificationToast({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);


  useEffect(() => {
    const handlePasswordReset = async () => {
      // Only log URL info once on mount, not on every render
      logger.debug('Page loaded - URL info:', {
        href: window.location.href,
        hash: window.location.hash,
        search: window.location.search,
        pathname: window.location.pathname
      });
      
      // Check for password reset code parameter (PKCE flow)
      const code = searchParams.get('code');
      
      if (code) {
        logger.debug('Password reset code detected, attempting direct exchange...');
        try {
          const { error } = await supabase.auth.exchangeCodeForSession({ authCode: code });
          if (error) {
            logger.error('PKCE code exchange error:', error);
            // Clean up URL and show error
            window.history.replaceState({}, '', window.location.pathname);
            router.push('/password-reset-help');
            return;
          } else {
            logger.debug('PKCE code exchange successful, redirecting to reset page...');
            // Clean up URL and redirect to reset page
            window.history.replaceState({}, '', window.location.pathname);
            router.push('/auth/reset-password');
            return;
          }
        } catch (err) {
          logger.error('PKCE exchange failed:', err);
          window.history.replaceState({}, '', window.location.pathname);
          router.push('/password-reset-help');
          return;
        }
      }
      
      // Don't interfere with direct navigation to reset-password page
      if (window.location.pathname === '/auth/reset-password') {
        return;
      }
      
      // Check for password reset in hash fragment (legacy flow)
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const hashType = hashParams.get('type');
        
        logger.debug('Hash params found:', { accessToken: accessToken?.substring(0, 20) + '...', type: hashType });
        
        if (hashType === 'recovery' && accessToken) {
          logger.debug('Password reset detected! Redirecting to reset page...');
          // Preserve the hash fragment in the redirect
          router.push(`/auth/reset-password${window.location.hash}`);
          return;
        }
      }
    };

    // Only run password reset logic if there are relevant params
    const code = searchParams.get('code');
    const verified = searchParams.get('verified');
    const hasHashParams = window.location.hash.includes('type=recovery');
    
    if (code || hasHashParams) {
      handlePasswordReset();
    }

    if (verified === 'true') {
      // Prevent redirect loops: only replace when currently on root
      const onRoot = window.location.pathname === '/';
      setShow(true);
      // Clean up the URL parameter without causing navigation loops
      if (onRoot) {
        router.replace('/', undefined);
      } else {
        // If not on root, just remove the query param in-place
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('verified');
          window.history.replaceState({}, '', url.toString());
        } catch {}
      }
      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setShow(false);
        onClose();
      }, 5000);
    }
  }, [searchParams, router, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] max-w-sm">
      <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg border border-green-500">
        <div className="flex items-center">
          <div className="text-green-200 text-lg mr-3">✓</div>
          <div>
            <h4 className="font-semibold">Email Verified!</h4>
            <p className="text-sm text-green-100 mt-1">
              Your email has been successfully verified. You can now sign in to your account.
            </p>
          </div>
          <button
            onClick={() => {
              setShow(false);
              onClose();
            }}
            className="ml-4 text-green-200 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<'start' | 'home'>('start');
  const [initialAction, setInitialAction] = useState<'newGame' | 'loadGame' | 'resumeGame' | 'season' | 'stats' | null>(null);
  // Get auth state to listen for logout
  const { user } = useAuth();
  const detection = useAppStateDetection(user);
  
  // Sync auth state with storage manager
  useAuthStorage();

  // Reset to StartScreen when user logs out
  useEffect(() => {
    if (!user && screen === 'home') {
      setScreen('start');
      setInitialAction(null);
    }
  }, [user, screen]);


  const handleAction = (
    action: 'newGame' | 'loadGame' | 'resumeGame' | 'season' | 'stats'
  ) => {
    setInitialAction(action);
    setScreen('home');
  };

  logger.debug('[Home] Rendering with detection:', detection, 'screen:', screen, 'user:', !!user);
  
  return (
    <div className="min-h-screen">
      {/* Offline Banner - shows at top when offline/poor connection */}
      <OfflineBanner className="fixed top-0 left-0 right-0 z-30" />
      
      {screen === 'start' ? (
        <StartScreen
          onStartNewGame={() => handleAction('newGame')}
          onLoadGame={() => handleAction('loadGame')}
          onResumeGame={() => handleAction('resumeGame')}
          canResume={detection.canResume}
          onCreateSeason={() => handleAction('season')}
          onViewStats={() => handleAction('stats')}
          isAuthenticated={!!user}
          hasPlayers={detection.hasPlayers}
          hasSavedGames={detection.hasSavedGames}
          hasSeasonsTournaments={detection.hasSeasonsTournaments}
          isFirstTimeUser={detection.isFirstTimeUser}
        />
      ) : (
        <HomePage 
          initialAction={initialAction ?? undefined} 
          skipInitialSetup 
          appStateDetection={detection}
        />
      )}
      
      {/* Email Verification Success Toast - wrapped in Suspense */}
      <Suspense fallback={null}>
        <VerificationToast onClose={() => {}} />
      </Suspense>
    </div>
  );
}
