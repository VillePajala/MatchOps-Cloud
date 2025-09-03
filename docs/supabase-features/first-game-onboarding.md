# First Game Onboarding - Implementation Plan

## Overview
Add a comprehensive three-layer onboarding system to guide new users through their first game creation process with visual overlays, progress tracking, and cloud-synced completion state.

## Prerequisites

### 🚨 CRITICAL DEPENDENCY REQUIREMENT
**MUST INSTALL FIRST**: `npm install framer-motion`
This package is required for animation components in this implementation.

### Feature Dependencies
- ✅ Smart Roster Detection implemented (provides user state)
- ✅ Adaptive Start Screen implemented (provides preferences system)
- ✅ Existing HomePage component at `src/components/HomePage.tsx`
- ✅ Existing InstructionsModal component

## Progress Tracking

### Phase 1: Onboarding State Management
- [ ] **Step 1.1**: Add onboarding tables to Supabase (5 min)
- [ ] **Step 1.2**: Create onboarding types in `src/types/index.ts` (5 min)
- [ ] **Step 1.3**: Create `useOnboarding` hook (20 min)
- [ ] **Step 1.4**: Test onboarding state persistence (10 min)

### Phase 2: Welcome Overlay System
- [ ] **Step 2.1**: Create `WelcomeOverlay` component (25 min)
- [ ] **Step 2.2**: Add overlay positioning and styling (15 min)
- [ ] **Step 2.3**: Implement animated entrance/exit (10 min)
- [ ] **Step 2.4**: Add responsive design for mobile (15 min)

### Phase 3: Warning Banner System
- [ ] **Step 3.1**: Create `OnboardingBanner` component (15 min)
- [ ] **Step 3.2**: Add persistent banner logic (10 min)
- [ ] **Step 3.3**: Implement banner dismissal tracking (10 min)

### Phase 4: Enhanced Instructions Modal
- [ ] **Step 4.1**: Enhance existing InstructionsModal with progress tracking (20 min)
- [ ] **Step 4.2**: Add step completion markers (15 min)
- [ ] **Step 4.3**: Implement guided carousel navigation (20 min)
- [ ] **Step 4.4**: Add context-aware content (15 min)

### Phase 5: Integration with HomePage
- [ ] **Step 5.1**: Add onboarding detection to HomePage (10 min)
- [ ] **Step 5.2**: Implement conditional rendering logic (15 min)
- [ ] **Step 5.3**: Add onboarding completion triggers (15 min)
- [ ] **Step 5.4**: Test full onboarding flow (20 min)

### Phase 6: Testing & Polish
- [ ] **Step 6.1**: Write unit tests for onboarding hook (25 min)
- [ ] **Step 6.2**: Write integration tests for full flow (20 min)
- [ ] **Step 6.3**: Manual testing across devices (15 min)
- [ ] **Step 6.4**: Performance testing and optimization (10 min)

## Implementation Details

### Step 1.1: Add Onboarding Tables
**File**: Supabase SQL Editor
**Time**: 5 minutes
**Validation**: Tables created successfully

```sql
-- Onboarding progress tracking
CREATE TABLE user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  welcome_overlay_seen BOOLEAN DEFAULT FALSE,
  welcome_overlay_dismissed_at TIMESTAMP WITH TIME ZONE,
  instructions_modal_opened BOOLEAN DEFAULT FALSE,
  instructions_completed_steps INTEGER DEFAULT 0,
  first_roster_setup_completed BOOLEAN DEFAULT FALSE,
  first_game_created BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Onboarding analytics for improvement
CREATE TABLE onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'overlay_shown', 'overlay_dismissed', 'instructions_opened', 'step_completed', etc.
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can manage their own onboarding" ON user_onboarding
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own onboarding analytics" ON onboarding_analytics
  FOR ALL USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_user_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX idx_onboarding_analytics_user_event ON onboarding_analytics(user_id, event_type);
```

### Step 1.2: Create Onboarding Types
**File**: `src/types/index.ts`
**Time**: 5 minutes
**Validation**: TypeScript compiles without errors

```typescript
export interface UserOnboarding {
  id: string;
  userId: string;
  welcomeOverlaySeen: boolean;
  welcomeOverlayDismissedAt?: string;
  instructionsModalOpened: boolean;
  instructionsCompletedSteps: number;
  firstRosterSetupCompleted: boolean;
  firstGameCreated: boolean;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingAnalytics {
  id: string;
  userId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: string;
}

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  required: boolean;
}
```

### Step 1.3: Create useOnboarding Hook
**File**: `src/hooks/useOnboarding.ts`
**Time**: 20 minutes
**Validation**: Hook manages onboarding state correctly

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { UserOnboarding, OnboardingStep } from '../types';

export const useOnboarding = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Create default onboarding record if none exists
      if (!data) {
        const { data: newData, error: createError } = await supabase
          .from('user_onboarding')
          .insert({
            user_id: user.id,
            welcome_overlay_seen: false,
            instructions_modal_opened: false,
            instructions_completed_steps: 0,
            first_roster_setup_completed: false,
            first_game_created: false,
            onboarding_completed: false
          })
          .select()
          .single();
        
        if (createError) throw createError;
        return transformOnboardingFromSupabase(newData);
      }

      return transformOnboardingFromSupabase(data);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const updateOnboarding = useMutation({
    mutationFn: async (updates: Partial<UserOnboarding>) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('user_onboarding')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return transformOnboardingFromSupabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboarding', user?.id]);
    },
  });

  const trackOnboardingEvent = useMutation({
    mutationFn: async ({ eventType, eventData }: { eventType: string; eventData?: Record<string, unknown> }) => {
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('onboarding_analytics')
        .insert({
          user_id: user.id,
          event_type: eventType,
          event_data: eventData || {}
        });

      if (error) throw error;
    },
  });

  // Helper functions for common operations
  const markWelcomeOverlaySeen = () => {
    updateOnboarding.mutate({
      welcomeOverlaySeen: true,
      welcomeOverlayDismissedAt: new Date().toISOString()
    });
    trackOnboardingEvent.mutate({ eventType: 'welcome_overlay_dismissed' });
  };

  const markInstructionsOpened = () => {
    updateOnboarding.mutate({ instructionsModalOpened: true });
    trackOnboardingEvent.mutate({ eventType: 'instructions_opened' });
  };

  const updateCompletedSteps = (stepCount: number) => {
    updateOnboarding.mutate({ instructionsCompletedSteps: stepCount });
    trackOnboardingEvent.mutate({ 
      eventType: 'instruction_step_completed', 
      eventData: { stepCount } 
    });
  };

  const markRosterSetupCompleted = () => {
    updateOnboarding.mutate({ firstRosterSetupCompleted: true });
    trackOnboardingEvent.mutate({ eventType: 'first_roster_setup_completed' });
  };

  const markFirstGameCreated = () => {
    const updates: Partial<UserOnboarding> = {
      firstGameCreated: true,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString()
    };
    
    updateOnboarding.mutate(updates);
    trackOnboardingEvent.mutate({ eventType: 'onboarding_completed' });
  };

  const getOnboardingSteps = (onboarding: UserOnboarding | null): OnboardingStep[] => [
    {
      id: 1,
      title: 'Welcome to MatchOps',
      description: 'Learn about the key features',
      icon: '👋',
      completed: onboarding?.welcomeOverlaySeen || false,
      required: false
    },
    {
      id: 2,
      title: 'Set Up Your Roster',
      description: 'Add players to your team',
      icon: '👥',
      completed: onboarding?.firstRosterSetupCompleted || false,
      required: true
    },
    {
      id: 3,
      title: 'Create Your First Game',
      description: 'Start tracking your match',
      icon: '⚽',
      completed: onboarding?.firstGameCreated || false,
      required: true
    }
  ];

  const shouldShowOnboarding = (onboarding: UserOnboarding | null): boolean => {
    return !onboarding?.onboardingCompleted;
  };

  const shouldShowWelcomeOverlay = (onboarding: UserOnboarding | null): boolean => {
    return !onboarding?.welcomeOverlaySeen && shouldShowOnboarding(onboarding);
  };

  return {
    onboarding: query.data,
    isLoading: query.isLoading,
    steps: getOnboardingSteps(query.data),
    shouldShowOnboarding: shouldShowOnboarding(query.data),
    shouldShowWelcomeOverlay: shouldShowWelcomeOverlay(query.data),
    markWelcomeOverlaySeen,
    markInstructionsOpened,
    updateCompletedSteps,
    markRosterSetupCompleted,
    markFirstGameCreated,
    isUpdating: updateOnboarding.isPending
  };
};

function transformOnboardingFromSupabase(data: any): UserOnboarding {
  return {
    id: data.id,
    userId: data.user_id,
    welcomeOverlaySeen: data.welcome_overlay_seen,
    welcomeOverlayDismissedAt: data.welcome_overlay_dismissed_at,
    instructionsModalOpened: data.instructions_modal_opened,
    instructionsCompletedSteps: data.instructions_completed_steps,
    firstRosterSetupCompleted: data.first_roster_setup_completed,
    firstGameCreated: data.first_game_created,
    onboardingCompleted: data.onboarding_completed,
    onboardingCompletedAt: data.onboarding_completed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}
```

### Step 2.1: Create WelcomeOverlay Component
**File**: `src/components/onboarding/WelcomeOverlay.tsx`
**Time**: 25 minutes
**Validation**: Overlay displays correctly over soccer field

**⚠️ DEPENDENCY NOTE**: This component uses framer-motion for animations. Install with `npm install framer-motion` or replace motion elements with CSS transitions.

```typescript
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiPlay, HiQuestionMarkCircle } from 'react-icons/hi';
import { useRouter } from 'next/navigation';

interface WelcomeOverlayProps {
  isVisible: boolean;
  onDismiss: () => void;
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({
  isVisible,
  onDismiss,
  onGetStarted,
  onLearnMore,
}) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Delay content appearance for smooth animation
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10" />
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-xl" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-500/20 to-transparent rounded-full blur-xl" />
            
            {/* Close Button */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors z-10"
              aria-label="Close welcome overlay"
            >
              <HiX className="w-5 h-5" />
            </button>

            <div className="relative p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="text-6xl mb-4"
                >
                  ⚽
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-bold text-white mb-2"
                >
                  Welcome to MatchOps!
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-slate-300"
                >
                  Let's get you set up to track your first soccer match
                </motion.p>
              </div>

              {/* Features Preview */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3 mb-8"
              >
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                  Track goals, assists, and player performance
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  Manage multiple teams and tournaments
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  Analyze statistics and team insights
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <button
                  onClick={onGetStarted}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-colors"
                >
                  <HiPlay className="w-5 h-5" />
                  Get Started
                </button>
                <button
                  onClick={onLearnMore}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <HiQuestionMarkCircle className="w-5 h-5" />
                  How It Works
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

### Step 5.1: Add Onboarding Detection to HomePage
**File**: `src/components/HomePage.tsx`
**Time**: 10 minutes
**Validation**: Onboarding appears for new users

```typescript
// Add imports
import { useOnboarding } from '@/hooks/useOnboarding';
import { useRosterSettingsModalWithHandlers } from '@/hooks/useRosterSettingsModalState';
import { WelcomeOverlay } from './onboarding/WelcomeOverlay';
import { OnboardingBanner } from './onboarding/OnboardingBanner';

// In HomePage component (assuming existing isInstructionsModalOpen state exists)
export const HomePage = () => {
  const { 
    shouldShowOnboarding, 
    shouldShowWelcomeOverlay,
    markWelcomeOverlaySeen,
    markInstructionsOpened,
    markFirstGameCreated 
  } = useOnboarding();
  
  const rosterSettingsModal = useRosterSettingsModalWithHandlers();
  const router = useRouter();

  const handleGetStarted = () => {
    markWelcomeOverlaySeen();
    // Open roster settings modal to help user add players
    rosterSettingsModal.open();
  };

  const handleLearnMore = () => {
    markWelcomeOverlaySeen();
    markInstructionsOpened();
    // Open instructions modal (using existing HomePage pattern)
    setIsInstructionsModalOpen(true);
  };

  return (
    <div className="relative">
      {/* Existing HomePage content */}
      
      {/* Onboarding Overlay */}
      <WelcomeOverlay
        isVisible={shouldShowWelcomeOverlay}
        onDismiss={markWelcomeOverlaySeen}
        onGetStarted={handleGetStarted}
        onLearnMore={handleLearnMore}
      />

      {/* Onboarding Banner */}
      {shouldShowOnboarding && !shouldShowWelcomeOverlay && (
        <OnboardingBanner />
      )}
    </div>
  );
};
```

## Testing Checklist

### Unit Tests Required
- [ ] `useOnboarding` hook behavior
- [ ] WelcomeOverlay component rendering
- [ ] OnboardingBanner component logic
- [ ] Onboarding step progression

### Integration Tests Required  
- [ ] Full onboarding flow from start to finish
- [ ] Onboarding state persistence across sessions
- [ ] Analytics data collection
- [ ] Integration with roster setup

### Manual Testing Checklist
- [ ] New user sees welcome overlay on first visit
- [ ] Overlay animations work smoothly
- [ ] Banner appears after overlay dismissal
- [ ] Instructions modal tracks progress
- [ ] Onboarding completes when first game created
- [ ] Experienced users don't see onboarding

## Definition of Done
- [ ] All checkboxes above completed
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Welcome overlay displays correctly
- [ ] Banner system works persistently
- [ ] Instructions modal enhanced with progress
- [ ] Analytics flowing to Supabase
- [ ] No regression in existing functionality

## Dependencies
- **Requires**: Smart Roster Detection, Adaptive Start Screen  
- **Enables**: Enhanced user onboarding experience

This onboarding system will guide new users through their first experience while providing valuable analytics for continuous improvement.