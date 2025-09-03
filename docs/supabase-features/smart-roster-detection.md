# Smart Roster Detection - AI-Ready Implementation Plan

## Overview
Add intelligent state detection to prevent users from encountering empty roster dead-ends. This feature builds on the existing Supabase infrastructure to provide cloud-aware state management and intelligent user guidance.

## Prerequisites Verification
**BEFORE STARTING**: Verify all prerequisites are met

### Pre-Implementation Checks
- [ ] **Environment**: `npm run dev` starts without errors
- [ ] **Database Access**: Can access Supabase dashboard and run SQL queries  
- [ ] **Authentication**: `src/context/AuthContext.tsx` exists and works
- [ ] **Types System**: `src/types/index.ts` exists and exports Player interface
- [ ] **Git State**: Working directory clean (`git status` shows no uncommitted changes)

### Understanding Current Architecture
**CRITICAL**: Read these files before proceeding:
1. `src/context/AuthContext.tsx` - How authentication currently works
2. `src/types/index.ts` - Current type definitions  
3. `src/lib/supabase.ts` - Current Supabase setup
4. `src/components/StartScreen.tsx` - Current StartScreen component
5. `src/lib/storage/supabaseProvider.ts` - How database queries work

**Verification Commands:**
```bash
# Check these files exist and are readable
ls -la src/context/AuthContext.tsx src/types/index.ts src/lib/supabase.ts src/app/page.tsx src/lib/storage/supabaseProvider.ts

# Verify current database tables
grep -r "\.from(" src/lib/storage/ | grep -E "(players|games|seasons|tournaments)"
```

## Progress Tracking

### Phase 1: Database Foundation (30 min total)
- [ ] **Step 1.1**: Create user_state_cache table (5 min)
- [ ] **Step 1.2**: Create detection_events table (5 min)  
- [ ] **Step 1.3**: Test database tables with sample queries (5 min)
- [ ] **Step 1.4**: Verify RLS policies work correctly (10 min)
- [ ] **Step 1.5**: Create rollback script for tables (5 min)

### Phase 2: Type System Updates (20 min total)
- [ ] **Step 2.1**: Add UserState interface to types (3 min)
- [ ] **Step 2.2**: Add DetectionEvent interface to types (3 min)
- [ ] **Step 2.3**: Export new interfaces (2 min)
- [ ] **Step 2.4**: Verify TypeScript compilation (2 min)
- [ ] **Step 2.5**: Test imports in a sample component (10 min)

### Phase 3: State Detection Hook (90 min total)
- [ ] **Step 3.1**: Create basic useStateDetection file structure (10 min)
- [ ] **Step 3.2**: Implement user state fetching logic (20 min)
- [ ] **Step 3.3**: Add state caching mechanism (20 min)
- [ ] **Step 3.4**: Implement state refresh logic (15 min)
- [ ] **Step 3.5**: Add error handling and fallbacks (15 min)
- [ ] **Step 3.6**: Test hook in isolation (10 min)

### Phase 4: Roster Guard Hook (60 min total)
- [ ] **Step 4.1**: Create useRosterGuard file structure (10 min)
- [ ] **Step 4.2**: Implement roster empty detection (15 min)
- [ ] **Step 4.3**: Add alert system integration (15 min)
- [ ] **Step 4.4**: Implement analytics tracking (10 min)
- [ ] **Step 4.5**: Test guard logic in isolation (10 min)

### Phase 5: StartScreen Integration (45 min total)
- [ ] **Step 5.1**: Import new hooks into StartScreen (5 min)
- [ ] **Step 5.2**: Add loading state handling (10 min)
- [ ] **Step 5.3**: Implement adaptive button states (15 min)
- [ ] **Step 5.4**: Add user state display (10 min)
- [ ] **Step 5.5**: Test integrated StartScreen (5 min)

### Phase 6: Real-time Updates (30 min total)
- [ ] **Step 6.1**: Create useStateSync hook (20 min)
- [ ] **Step 6.2**: Integrate with existing components (10 min)

### Phase 7: Testing & Validation (60 min total)
- [ ] **Step 7.1**: Write unit tests for useStateDetection (25 min)
- [ ] **Step 7.2**: Write unit tests for useRosterGuard (20 min)
- [ ] **Step 7.3**: Manual integration testing (15 min)

## Detailed Implementation Steps

### Step 1.1: Create user_state_cache Table
**Estimated Time**: 5 minutes
**Files Modified**: Supabase Database (via SQL Editor)

**Pre-Checks:**
- [ ] Can access Supabase dashboard
- [ ] Can run SQL queries in SQL editor
- [ ] Current database has auth.users table (run: `SELECT * FROM auth.users LIMIT 1;`)

**Implementation:**
1. Open Supabase Dashboard → SQL Editor
2. Run this EXACT SQL (copy-paste):

```sql
-- Step 1.1: Create user_state_cache table
CREATE TABLE user_state_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_players BOOLEAN DEFAULT FALSE,
  player_count INTEGER DEFAULT 0,
  has_saved_games BOOLEAN DEFAULT FALSE,
  saved_games_count INTEGER DEFAULT 0,
  has_seasons_tournaments BOOLEAN DEFAULT FALSE,
  seasons_count INTEGER DEFAULT 0,
  tournaments_count INTEGER DEFAULT 0,
  can_resume_game BOOLEAN DEFAULT FALSE,
  is_first_time_user BOOLEAN DEFAULT TRUE,
  last_detection_run TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_state_cache ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Users can manage their own state cache" ON user_state_cache
  FOR ALL USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_user_state_cache_user_id ON user_state_cache(user_id);
```

**Immediate Verification:**
```sql
-- Run this to verify table was created correctly
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_state_cache' 
ORDER BY ordinal_position;

-- Should show 13 columns: id, user_id, has_players, player_count, etc.
```

**Validation Checklist:**
- [ ] SQL executed without errors
- [ ] Table appears in Supabase Dashboard → Database → Tables
- [ ] Table has 13 columns as expected
- [ ] RLS policy shows in Database → Authentication → Policies
- [ ] Index appears in table details

**If This Step Fails:**
```sql
-- Rollback command
DROP TABLE IF EXISTS user_state_cache;
-- Then retry the creation script
```

### Step 1.2: Create detection_events Table  
**Estimated Time**: 5 minutes
**Files Modified**: Supabase Database

**Pre-Checks:**
- [ ] Step 1.1 completed successfully
- [ ] Still in Supabase SQL Editor

**Implementation:**
```sql
-- Step 1.2: Create detection_events table
CREATE TABLE detection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('roster_empty_detected', 'guidance_accepted', 'guidance_dismissed')),
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE detection_events ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Users can manage their own detection events" ON detection_events
  FOR ALL USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_detection_events_user_type ON detection_events(user_id, event_type);
CREATE INDEX idx_detection_events_created ON detection_events(created_at DESC);
```

**Immediate Verification:**
```sql
-- Verify table structure
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'detection_events' 
ORDER BY ordinal_position;

-- Test constraint works
INSERT INTO detection_events (user_id, event_type) VALUES ('00000000-0000-0000-0000-000000000000', 'invalid_event');
-- Should fail with constraint violation
```

**Validation Checklist:**
- [ ] SQL executed without errors  
- [ ] Table appears in database tables list
- [ ] Has 5 columns: id, user_id, event_type, context, created_at
- [ ] Constraint test failed as expected (proves CHECK constraint works)
- [ ] Two indexes created

### Step 2.1: Add UserState Interface
**Estimated Time**: 3 minutes
**Files Modified**: `src/types/index.ts`

**Pre-Checks:**
- [ ] File `src/types/index.ts` exists
- [ ] File is readable and contains existing interfaces
- [ ] Current git status is clean

**Current File Inspection:**
```bash
# Check what's already in the types file
head -50 src/types/index.ts
```

**Implementation:**
1. Open `src/types/index.ts`
2. Add these exact interfaces at the END of the file:

```typescript
// Smart Roster Detection Types - Added [CURRENT_DATE]
export interface UserState {
  hasPlayers: boolean;
  playerCount: number;
  hasSavedGames: boolean;
  savedGamesCount: number;
  hasSeasonsTournaments: boolean;
  seasonsCount: number;
  tournamentsCount: number;
  canResumeGame: boolean;
  isFirstTimeUser: boolean;
  lastDetectionRun: string;
}

export interface DetectionEvent {
  id: string;
  userId: string;
  eventType: 'roster_empty_detected' | 'guidance_accepted' | 'guidance_dismissed';
  context: Record<string, unknown>;
  createdAt: string;
}
```

**Immediate Verification:**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Should complete without errors
```

**Test Import:**
```bash
# Create a temporary test file to verify exports work
cat > /tmp/test-types.ts << 'EOF'
import { UserState, DetectionEvent } from './src/types/index';

// Test that types are available
const testState: UserState = {
  hasPlayers: false,
  playerCount: 0,
  hasSavedGames: false,
  savedGamesCount: 0,
  hasSeasonsTournaments: false,
  seasonsCount: 0,
  tournamentsCount: 0,
  canResumeGame: false,
  isFirstTimeUser: true,
  lastDetectionRun: new Date().toISOString()
};

const testEvent: DetectionEvent = {
  id: '123',
  userId: '456', 
  eventType: 'roster_empty_detected',
  context: {},
  createdAt: new Date().toISOString()
};

console.log('Types work correctly');
EOF

# Compile the test file
npx tsc --noEmit /tmp/test-types.ts
rm /tmp/test-types.ts
```

**Validation Checklist:**
- [ ] TypeScript compilation passes
- [ ] Import test passes 
- [ ] Types are properly exported
- [ ] No existing functionality broken
- [ ] Git diff shows only the expected additions

### Step 3.1: Create Basic useStateDetection File Structure
**Estimated Time**: 10 minutes  
**Files Created**: `src/hooks/useStateDetection.ts`

**Pre-Checks:**
- [ ] Directory `src/hooks/` exists
- [ ] Step 2.1 completed (types available)
- [ ] Can import from existing hooks (check `src/context/AuthContext.tsx` or similar)

**Implementation:**
1. Create the new file:

```typescript
// src/hooks/useStateDetection.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { UserState } from '../types';

export const useStateDetection = () => {
  const { user } = useAuth();
  const [userState, setUserState] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Implement actual state detection logic
  const refreshUserState = useCallback(async () => {
    if (!user) {
      setUserState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Basic fallback state for now
      const fallbackState: UserState = {
        hasPlayers: false,
        playerCount: 0,
        hasSavedGames: false,
        savedGamesCount: 0,
        hasSeasonsTournaments: false,
        seasonsCount: 0,
        tournamentsCount: 0,
        canResumeGame: false,
        isFirstTimeUser: true,
        lastDetectionRun: new Date().toISOString()
      };

      setUserState(fallbackState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshUserState();
  }, [refreshUserState]);

  return {
    userState,
    isLoading,
    error,
    refreshUserState
  };
};
```

**Immediate Verification:**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Verify file was created correctly
ls -la src/hooks/useStateDetection.ts
wc -l src/hooks/useStateDetection.ts  # Should be around 50-60 lines
```

**Test the Hook in Isolation:**
```bash
# Create a temporary test component
cat > /tmp/test-hook.tsx << 'EOF'
import React from 'react';
import { useStateDetection } from './src/hooks/useStateDetection';

const TestComponent = () => {
  const { userState, isLoading, error } = useStateDetection();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <p>Has Players: {userState?.hasPlayers ? 'Yes' : 'No'}</p>
      <p>Player Count: {userState?.playerCount}</p>
    </div>
  );
};

export default TestComponent;
EOF

# Compile the test component
npx tsc --noEmit /tmp/test-hook.tsx
rm /tmp/test-hook.tsx
```

**Validation Checklist:**
- [ ] File created at correct location
- [ ] TypeScript compilation passes
- [ ] Hook structure follows React hook patterns
- [ ] Imports work correctly
- [ ] Test component compiles successfully
- [ ] No existing functionality broken

### [Continue with remaining steps following same detailed pattern...]

## Error Recovery Procedures

### Database Rollback
If database steps fail:
```sql
-- Full rollback of all tables
DROP TABLE IF EXISTS detection_events;
DROP TABLE IF EXISTS user_state_cache;
```

### Code Rollback  
If code steps fail:
```bash
# See what changed
git diff

# Rollback specific files
git checkout HEAD -- src/hooks/useStateDetection.ts
git checkout HEAD -- src/types/index.ts

# Or full rollback
git reset --hard HEAD
```

### Common Issues & Solutions

**"TypeScript errors after adding types"**
1. Check that interfaces are exported correctly
2. Verify import paths are correct
3. Run `npx tsc --noEmit` for detailed error info
4. Check for naming conflicts with existing types

**"Supabase queries fail"** 
1. Verify tables were created correctly in dashboard
2. Check RLS policies allow current user access
3. Test queries directly in Supabase SQL editor first
4. Verify environment variables are loaded

**"Hook causes infinite re-renders"**
1. Check useCallback dependencies are correct
2. Verify useEffect dependency array
3. Make sure state updates don't cause unnecessary re-renders

## Testing Validation

### Manual Testing Checklist
After completing all steps:
- [ ] **StartScreen loads** without errors
- [ ] **Console shows no errors** in browser dev tools  
- [ ] **User state displays** correctly for authenticated users
- [ ] **Loading states** work properly
- [ ] **Error states** handle failures gracefully
- [ ] **State updates** when data changes
- [ ] **Performance** is acceptable (no noticeable slowdown)

### Automated Testing
```bash
# Run existing tests to ensure no regressions
npm test

# Run TypeScript checking
npx tsc --noEmit

# Run linting if available
npm run lint
```

## Definition of Done
This feature is complete when:
- [ ] All progress tracking checkboxes are checked
- [ ] All validation checklists pass
- [ ] Manual testing completed successfully
- [ ] No existing functionality is broken
- [ ] Performance is acceptable
- [ ] Code follows existing project patterns
- [ ] Database changes are properly secured with RLS
- [ ] Error handling is robust
- [ ] Feature works for both new and existing users

## Time Tracking Template

```
## Smart Roster Detection Implementation Log
**Start Time**: [FILL IN]
**Estimated Total**: 4.5 hours
**Actual Total**: [UPDATE AS YOU GO]

### Phase 1: Database Foundation (Est: 30min)
- Step 1.1: [ACTUAL TIME] vs 5min estimated
- Step 1.2: [ACTUAL TIME] vs 5min estimated  
- [Continue for each step...]

### Issues Encountered:
- [LOG ANY PROBLEMS AND SOLUTIONS]

### Notes:
- [ANY OBSERVATIONS OR MODIFICATIONS TO THE PLAN]
```

This implementation plan is designed to be followed step-by-step by an AI with verification at each stage to ensure quality and prevent regression.