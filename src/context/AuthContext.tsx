'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@/types/supabase-types';
import { supabase } from '../lib/supabase';
import { sessionManager } from '../lib/security/sessionManager';
import { authAwareStorageManager } from '@/lib/storage';
import { loadingRegistry } from '@/utils/loadingRegistry';
import { operationQueue } from '@/utils/operationQueue';
import { SecureAuthService } from '../lib/security/rateLimiter';
import { SmartPreloader, registerModalComponents } from '@/services/ComponentRegistry';
import { perfMark } from '@/utils/performance';
import logger from '@/utils/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; rateLimited?: boolean; retryAfter?: number }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; rateLimited?: boolean; retryAfter?: number; progressiveDelay?: number }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null; rateLimited?: boolean; retryAfter?: number }>;
  extendSession: () => void;
  sessionInfo: {
    isActive: boolean;
    lastActivity?: number;
    sessionStart?: number;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState(() => sessionManager.getSessionInfo());

  useEffect(() => {
    // Initialize session manager
    sessionManager.initialize();

    // Get initial session
    const getInitialSession = async () => {
      try {
        logger.info('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          logger.error('Error getting session:', error);
        } else {
          logger.info('Initial session:', session ? 'Found session' : 'No session', session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
          if (session) {
            // Record activity for existing session
            sessionManager.recordActivity();
          }
        }
      } catch (error) {
        logger.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        logger.info('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Update session info
        setSessionInfo(sessionManager.getSessionInfo());
        
        // Clean up URL parameters after sign-out
        if (event === 'SIGNED_OUT' && !session) {
          setTimeout(() => {
            try {
              const url = new URL(window.location.href);
              if (url.searchParams.has('_signed_out')) {
                url.searchParams.delete('_signed_out');
                window.history.replaceState({}, '', url.toString());
                logger.debug('Cleaned up _signed_out parameter from URL');
              }
            } catch (error) {
              logger.warn('Failed to clean up URL after sign-out:', error);
            }
          }, 1000); // Short delay to allow redirect to complete
        }
        
        // PERFORMANCE: Prefetch modal components after successful sign-in
        if (event === 'SIGNED_IN' && session) {
          perfMark('auth:signInSuccess');
          
          // Register all modal components first
          registerModalComponents();
          
          // Use requestIdleCallback for non-blocking prefetch
          if (typeof window !== 'undefined' && window.requestIdleCallback) {
            window.requestIdleCallback(
              async () => {
                try {
                  perfMark('prefetch:start');
                  await SmartPreloader.preloadCriticalComponents();
                  perfMark('prefetch:complete');
                  logger.debug('[Auth] Critical modal components prefetched after sign-in');
                } catch (error) {
                  logger.warn('[Auth] Failed to prefetch components:', error);
                }
              },
              { timeout: 2000 } // Fallback after 2s
            );
          } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(async () => {
              try {
                await SmartPreloader.preloadCriticalComponents();
                logger.debug('[Auth] Critical modal components prefetched after sign-in (fallback)');
              } catch (error) {
                logger.warn('[Auth] Failed to prefetch components:', error);
              }
            }, 1500);
          }
        }
      }
    );

    // Update session info periodically
    const sessionInfoInterval = setInterval(() => {
      setSessionInfo(sessionManager.getSessionInfo());
    }, 30000); // Every 30 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionInfoInterval);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      // Use secure auth service with rate limiting
      const result = await SecureAuthService.signUp(email, password);
      
      if (!result.success) {
        return { 
          error: { message: result.error || 'Signup failed' } as AuthError,
          rateLimited: result.rateLimited,
          retryAfter: result.retryAfter
        };
      }

      // If rate limiting passed, proceed with actual Supabase signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      });
      
      // Log for debugging
      logger.debug('Supabase signup response:', { data, error });
      
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // For production, we'd get the client IP from a server-side endpoint
      // For now, we'll pass undefined
      const clientIP = undefined;
      
      // Use secure auth service with rate limiting
      const result = await SecureAuthService.signIn(email, password, clientIP);
      
      if (!result.success) {
        return { 
          error: { message: result.error || 'Sign in failed' } as AuthError,
          rateLimited: result.rateLimited,
          retryAfter: result.retryAfter,
          progressiveDelay: result.progressiveDelay
        };
      }

      // If rate limiting passed, proceed with actual Supabase sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error) {
        // Record activity on successful sign in
        sessionManager.recordActivity();
      }
      
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const immediateLocalCleanup = () => {
    // Cancel in-flight operations
    try { loadingRegistry.clearAll(); } catch {}
    try { operationQueue.clear(); } catch {}
    // Update storage manager immediately
    try { (authAwareStorageManager as { handleSignOutCleanup?: () => void })?.handleSignOutCleanup?.(); } catch {}
    // Broadcast to other tabs
    try {
      localStorage.setItem('mdc:signout', String(Date.now()));
      setTimeout(() => localStorage.removeItem('mdc:signout'), 0);
    } catch {}
    // Clear state
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  const clearSupabaseAuthKeys = () => {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => { if (key.startsWith('sb-')) localStorage.removeItem(key); });
    }
  };

  const postSignOutCleanup = () => {
    clearSupabaseAuthKeys();
    // Ask SW to clear caches, then navigate with cache-busting
    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set('_signed_out', String(Date.now()));
    window.location.replace(url.toString());
  };

  const signOut = async () => {
    try {
      logger.info('Starting sign out process...');
      // UI-first local cleanup
      immediateLocalCleanup();
      sessionManager.cleanup();
      // Background network sign out (ignore errors)
      const { error } = await supabase.auth.signOut();
      if (error) logger.error('Supabase sign out error:', error);
      postSignOutCleanup();
      return { error: null };
    } catch (error) {
      logger.error('Sign out error:', error);
      return { error: error as AuthError };
    }
  };

  const globalSignOut = async () => {
    try {
      logger.info('Starting GLOBAL sign out process (revoke all sessions)...');
      immediateLocalCleanup();
      sessionManager.cleanup();
      // Supabase: revoke all refresh tokens for this user
      // We do this by calling signOut with scope: 'global' if available
      // Fallback: call RPC endpoint if one exists; here we use built-in global sign out
      // @ts-expect-error - typings may not include scope yet in some SDK versions
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) logger.error('Global sign out error:', error); else logger.info('Global sign out successful');
      postSignOutCleanup();
      return { error: null };
    } catch (error) {
      logger.error('Global sign out exception:', error);
      return { error: error as AuthError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Use secure auth service with rate limiting
      const result = await SecureAuthService.resetPassword(email);
      
      if (!result.success) {
        return { 
          error: { message: result.error || 'Password reset failed' } as AuthError,
          rateLimited: result.rateLimited,
          retryAfter: result.retryAfter
        };
      }

      // If rate limiting passed, proceed with actual Supabase password reset  
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const extendSession = () => {
    sessionManager.extendSession();
    setSessionInfo(sessionManager.getSessionInfo());
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    // Expose global sign out for settings modal
    globalSignOut,
    extendSession,
    sessionInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}