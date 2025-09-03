# Adaptive Start Screen - Implementation Plan

## Overview
Enhance the existing StartScreen component to intelligently adapt between first-time user and experienced user interfaces based on cloud-synced user state.

## Prerequisites
- ⚠️ Smart Roster Detection implemented (provides `useStateDetection` hook) OR implement basic state detection
- ✅ Existing StartScreen component at `src/components/StartScreen.tsx`
- ✅ Current authentication system working

## Progress Tracking

### Phase 1: User Preferences System
- [ ] **Step 1.1**: Add user preferences table to Supabase (5 min)
- [ ] **Step 1.2**: Create user preferences types in `src/types/index.ts` (5 min)
- [ ] **Step 1.3**: Create `useUserPreferences` hook (15 min)
- [ ] **Step 1.4**: Test preferences persistence (10 min)

### Phase 2: Analytics Foundation
- [ ] **Step 2.1**: Add start screen analytics table to Supabase (5 min)
- [ ] **Step 2.2**: Create `useStartScreenAnalytics` hook (15 min)
- [ ] **Step 2.3**: Test analytics tracking (10 min)

### Phase 3: Enhanced StartScreen Component
- [ ] **Step 3.1**: Extract current StartScreen logic to separate functions (10 min)
- [ ] **Step 3.2**: Add state detection integration (10 min)
- [ ] **Step 3.3**: Implement adaptive button states (15 min)
- [ ] **Step 3.4**: Add loading states and error handling (10 min)
- [ ] **Step 3.5**: Add analytics tracking to all interactions (15 min)

### Phase 4: Advanced Features
- [ ] **Step 4.1**: Add manual mode toggle (15 min)
- [ ] **Step 4.2**: Implement smart recommendations based on usage (20 min)
- [ ] **Step 4.3**: Add cross-device state indicators (15 min)

### Phase 5: Testing & Validation
- [ ] **Step 5.1**: Write unit tests for new hooks (20 min)
- [ ] **Step 5.2**: Write integration tests for adaptive behavior (15 min)
- [ ] **Step 5.3**: Manual testing of all user flows (15 min)

## Implementation Details

### Step 1.1: Extend App Settings Table
**File**: Supabase SQL Editor
**Time**: 5 minutes
**Validation**: Columns added successfully without conflicts

**⚠️ SCHEMA CHANGE**: Using existing `app_settings` table instead of creating duplicate `user_preferences`

```sql
-- Extend existing app_settings table for adaptive start screen
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS start_screen_mode TEXT DEFAULT 'auto' CHECK (start_screen_mode IN ('auto', 'simple', 'advanced'));

ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS last_active_feature TEXT;

-- Note: language and onboarding already exist as 'language' and 'has_seen_app_guide'

-- RLS already enabled on app_settings table
-- Verify existing policy covers user access to their own settings
-- Index already exists on app_settings(user_id) as UNIQUE constraint
```

### Step 1.2: Create User Preferences Types
**File**: `src/types/index.ts`
**Time**: 5 minutes
**Validation**: TypeScript compiles without errors

```typescript
// Add to existing types
export interface UserPreferences {
  id: string;
  userId: string;
  startScreenMode: 'auto' | 'simple' | 'advanced';
  preferredLanguage: string;
  lastActiveFeature?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Step 1.3: Create useUserPreferences Hook
**File**: `src/hooks/useUserPreferences.ts`
**Time**: 15 minutes
**Validation**: Hook returns data and mutations work

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { UserPreferences } from '../types';

export const useUserPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['userPreferences', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Create default preferences if none exist
      if (!data) {
        const { data: newData, error: createError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            start_screen_mode: 'auto',
            preferred_language: 'en',
            onboarding_completed: false
          })
          .select()
          .single();
        
        if (createError) throw createError;
        return transformPreferencesFromSupabase(newData);
      }

      return transformPreferencesFromSupabase(data);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return transformPreferencesFromSupabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userPreferences', user?.id]);
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending
  };
};

function transformPreferencesFromSupabase(data: any): UserPreferences {
  return {
    id: data.id,
    userId: data.user_id,
    startScreenMode: data.start_screen_mode,
    preferredLanguage: data.preferred_language,
    lastActiveFeature: data.last_active_feature,
    onboardingCompleted: data.onboarding_completed,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}
```

### Step 1.4: Test Preferences Persistence
**Validation Criteria**: 
- [ ] Can create default preferences
- [ ] Can update preferences
- [ ] Changes persist across page reloads

### Step 2.1: Add Analytics Table
**File**: Supabase SQL Editor
**Time**: 5 minutes

```sql
CREATE TABLE start_screen_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  screen_mode TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  button_clicked TEXT,
  time_spent_seconds INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE start_screen_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own analytics" ON start_screen_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_start_screen_analytics_user ON start_screen_analytics(user_id, timestamp DESC);
```

### Step 3.1: Extract StartScreen Logic
**File**: `src/components/StartScreen.tsx`
**Time**: 10 minutes
**Validation**: Component still renders correctly

Extract button handling and state logic into separate functions:

```typescript
// Add these helper functions before the main component
const getButtonStates = (userState: UserState | null) => ({
  canStartNewGame: userState?.hasPlayers || false,
  canLoadGame: userState?.hasSavedGames || false,
  canResumeGame: userState?.canResumeGame || false,
});

const determineUIMode = (
  userState: UserState | null,
  preferences: UserPreferences | null
): 'simple' | 'advanced' => {
  if (preferences?.startScreenMode === 'simple') return 'simple';
  if (preferences?.startScreenMode === 'advanced') return 'advanced';
  
  // Auto mode - decide based on user state
  return userState?.isFirstTimeUser ? 'simple' : 'advanced';
};
```

### Step 3.2: Add State Detection Integration
**File**: `src/components/StartScreen.tsx`
**Time**: 10 minutes

```typescript
// Add to imports
import { useStateDetection } from '@/hooks/useStateDetection';
import { useUserPreferences } from '@/hooks/useUserPreferences';

// In component
export default function StartScreen() {
  const { userState, isLoading: stateLoading } = useStateDetection();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  
  const isLoading = stateLoading || prefsLoading;
  const uiMode = determineUIMode(userState, preferences);
  const buttonStates = getButtonStates(userState);

  // Rest of component...
}
```

### Step 3.3: Implement Adaptive Button States
**File**: `src/components/StartScreen.tsx`
**Time**: 15 minutes
**Validation**: Buttons show correct enabled/disabled states

Replace existing button logic with adaptive states:

```typescript
const handleNewGame = async () => {
  trackAnalytics('new_game_clicked');
  
  if (!buttonStates.canStartNewGame) {
    const shouldSetup = await showRosterEmptyAlert();
    if (shouldSetup) {
      router.push('/roster');
      return;
    }
  }
  
  router.push('/home?mode=new');
};

// Similar for other buttons...
```

## Testing Checklist

### Unit Tests Required
- [ ] `useUserPreferences` hook behavior
- [ ] Analytics tracking functions
- [ ] UI mode determination logic
- [ ] Button state calculations

### Integration Tests Required  
- [ ] Full user flow: first-time user → roster setup → experienced user
- [ ] Preference persistence across sessions
- [ ] Analytics data collection

### Manual Testing Checklist
- [ ] First-time user sees simplified interface
- [ ] Experienced user sees full interface
- [ ] Manual mode toggle works
- [ ] All buttons show correct states
- [ ] Analytics are recorded correctly

## Definition of Done
- [ ] All checkboxes above completed
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Component works in both simple and advanced modes
- [ ] Analytics data flowing to Supabase
- [ ] No regression in existing functionality

## Dependencies
- **Requires**: Smart Roster Detection (provides `useStateDetection`)
- **Enables**: First Game Onboarding (can detect completed onboarding)

This adaptive start screen will provide intelligent user guidance while maintaining the existing functionality for current users.