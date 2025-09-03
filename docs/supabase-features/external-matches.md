# External Matches (Player Stat Adjustments) - AI-Ready Implementation Plan

## Overview
Add a system for coaches to manually adjust player statistics for games played outside the MatchOps app. This includes games with external teams, tournaments not tracked in the app, and manual corrections to statistics.

## Prerequisites Verification
**BEFORE STARTING**: Verify all prerequisites are met

### Pre-Implementation Checks
- [ ] **Environment**: `npm run dev` starts without errors
- [ ] **Database Access**: Can access Supabase dashboard and run SQL queries
- [ ] **Player System**: Existing players table and player management working
- [ ] **Stats System**: Current player statistics calculation in place
- [ ] **Git State**: Working directory clean (`git status` shows no uncommitted changes)

### Understanding Current Architecture
**CRITICAL**: Read these files before proceeding:
1. `src/utils/playerStats.ts` - Current statistics calculation
2. `src/types/index.ts` - Current Player and stats interfaces
3. `src/components/GameStatsModal.tsx` - How stats are currently displayed
4. `src/lib/storage/supabaseProvider.ts` - Database operations

**Verification Commands:**
```bash
# Check these files exist
ls -la src/utils/playerStats.ts src/types/index.ts src/components/GameStatsModal.tsx

# Find current stats-related code
grep -r "goals\|assists" src/utils/ | head -5
```

## Progress Tracking

### Phase 1: Database Foundation (25 min total)
- [ ] **Step 1.1**: Create player_stat_adjustments table (8 min)
- [ ] **Step 1.2**: Create adjustment_categories table (5 min)
- [ ] **Step 1.3**: Test database tables with sample data (7 min)
- [ ] **Step 1.4**: Verify RLS policies work correctly (5 min)

### Phase 2: Type System Updates (15 min total)
- [ ] **Step 2.1**: Add PlayerStatAdjustment interface (3 min)
- [ ] **Step 2.2**: Add AdjustmentCategory interface (3 min)
- [ ] **Step 2.3**: Add ExternalMatchData interface (4 min)
- [ ] **Step 2.4**: Verify TypeScript compilation (5 min)

### Phase 3: Data Operations Layer (45 min total)
- [ ] **Step 3.1**: Create adjustments utility file structure (10 min)
- [ ] **Step 3.2**: Implement CRUD operations for adjustments (20 min)
- [ ] **Step 3.3**: Add validation and error handling (10 min)
- [ ] **Step 3.4**: Test operations in isolation (5 min)

### Phase 4: Statistics Integration (40 min total)
- [ ] **Step 4.1**: Extend playerStats.ts to include adjustments (15 min)
- [ ] **Step 4.2**: Update stats calculation functions (15 min)
- [ ] **Step 4.3**: Add adjustment impact display (10 min)

### Phase 5: React Hooks (35 min total)
- [ ] **Step 5.1**: Create useExternalMatches hook (15 min)
- [ ] **Step 5.2**: Create useStatAdjustments hook (15 min)
- [ ] **Step 5.3**: Test hooks in isolation (5 min)

### Phase 6: UI Components (60 min total)
- [ ] **Step 6.1**: Create ExternalMatchModal component (25 min)
- [ ] **Step 6.2**: Create StatAdjustmentsList component (20 min)
- [ ] **Step 6.3**: Create AdjustmentForm component (15 min)

### Phase 7: Integration & Testing (30 min total)
- [ ] **Step 7.1**: Integrate with GameStatsModal (15 min)
- [ ] **Step 7.2**: Add menu access points (10 min)
- [ ] **Step 7.3**: Manual integration testing (5 min)

### Phase 8: Testing & Validation (25 min total)
- [ ] **Step 8.1**: Write unit tests for utilities (15 min)
- [ ] **Step 8.2**: Write component tests (10 min)

## Detailed Implementation Steps

### Step 1.1: Create player_stat_adjustments Table
**Estimated Time**: 8 minutes
**Files Modified**: Supabase Database (via SQL Editor)

**Pre-Checks:**
- [ ] Can access Supabase dashboard
- [ ] Players table exists (run: `SELECT * FROM players LIMIT 1;`)
- [ ] Current database schema understood

**Implementation:**
```sql
-- Step 1.1: Create player_stat_adjustments table
CREATE TABLE player_stat_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  external_team_name TEXT,
  opponent_name TEXT,
  score_for INTEGER,
  score_against INTEGER,
  game_date DATE,
  home_or_away TEXT CHECK (home_or_away IN ('home', 'away', 'neutral')),
  include_in_season_tournament BOOLEAN DEFAULT FALSE,
  games_played_delta INTEGER NOT NULL DEFAULT 1,
  goals_delta INTEGER NOT NULL DEFAULT 0,
  assists_delta INTEGER NOT NULL DEFAULT 0,
  yellow_cards_delta INTEGER DEFAULT 0,
  red_cards_delta INTEGER DEFAULT 0,
  note TEXT,
  adjustment_reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_deltas CHECK (
    games_played_delta >= 0 AND 
    goals_delta >= 0 AND 
    assists_delta >= 0 AND
    yellow_cards_delta >= 0 AND
    red_cards_delta >= 0
  )
);

-- Enable RLS
ALTER TABLE player_stat_adjustments ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Users can manage their own stat adjustments" ON player_stat_adjustments
  FOR ALL USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_player_stat_adjustments_user_id ON player_stat_adjustments(user_id);
CREATE INDEX idx_player_stat_adjustments_player_id ON player_stat_adjustments(player_id);
CREATE INDEX idx_player_stat_adjustments_date ON player_stat_adjustments(game_date DESC);
```

**Immediate Verification:**
```sql
-- Verify table structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'player_stat_adjustments' 
ORDER BY ordinal_position;

-- Should show 17 columns
SELECT COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'player_stat_adjustments';
```

**Validation Checklist:**
- [ ] SQL executed without errors
- [ ] Table appears in Supabase Dashboard → Database → Tables  
- [ ] Table has 17 columns as expected
- [ ] RLS policy appears in Dashboard → Authentication → Policies
- [ ] Three indexes created successfully
- [ ] CHECK constraint prevents negative values

**If This Step Fails:**
```sql
-- Rollback command
DROP TABLE IF EXISTS player_stat_adjustments;
-- Then retry the creation script
```

### Step 1.2: Create adjustment_categories Table
**Estimated Time**: 5 minutes
**Files Modified**: Supabase Database

**Pre-Checks:**
- [ ] Step 1.1 completed successfully
- [ ] Still in Supabase SQL Editor

**Implementation:**
```sql
-- Step 1.2: Create adjustment categories for better organization
CREATE TABLE adjustment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT, -- Hex color for UI
  icon TEXT, -- Icon identifier
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE adjustment_categories ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Users can manage their own adjustment categories" ON adjustment_categories
  FOR ALL USING (auth.uid() = user_id);

-- Add index
CREATE INDEX idx_adjustment_categories_user_id ON adjustment_categories(user_id);

-- Insert default categories for each user (via trigger)
CREATE OR REPLACE FUNCTION create_default_adjustment_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO adjustment_categories (user_id, name, description, color, icon, is_default)
  VALUES 
    (NEW.id, 'External Tournament', 'Games played in outside tournaments', '#3B82F6', '🏆', true),
    (NEW.id, 'Friend Match', 'Casual games with friends', '#10B981', '⚽', true),
    (NEW.id, 'Correction', 'Manual correction to statistics', '#F59E0B', '📝', true),
    (NEW.id, 'Other League', 'Games in different leagues', '#8B5CF6', '🏅', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add default categories for new users
CREATE TRIGGER create_default_categories_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_adjustment_categories();
```

**Immediate Verification:**
```sql
-- Verify table structure
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'adjustment_categories'
ORDER BY ordinal_position;

-- Test trigger works (if you have test user)
SELECT name, description FROM adjustment_categories LIMIT 3;
```

**Validation Checklist:**
- [ ] SQL executed without errors
- [ ] Table has 8 columns: id, user_id, name, description, color, icon, is_default, created_at
- [ ] RLS policy created
- [ ] Index created
- [ ] Trigger function created successfully

### Step 2.1: Add PlayerStatAdjustment Interface
**Estimated Time**: 3 minutes
**Files Modified**: `src/types/index.ts`

**Pre-Checks:**
- [ ] File `src/types/index.ts` exists and is writable
- [ ] Current git status is clean
- [ ] Phase 1 database changes completed

**Implementation:**
Add these interfaces at the END of `src/types/index.ts`:

```typescript
// External Matches Types - Added [CURRENT_DATE]
export interface PlayerStatAdjustment {
  id: string;
  userId: string;
  playerId: string;
  seasonId?: string;
  tournamentId?: string;
  externalTeamName?: string;
  opponentName?: string;
  scoreFor?: number;
  scoreAgainst?: number;
  gameDate?: string; // YYYY-MM-DD format
  homeOrAway?: 'home' | 'away' | 'neutral';
  includeInSeasonTournament: boolean;
  gamesPlayedDelta: number;
  goalsDelta: number;
  assistsDelta: number;
  yellowCardsDelta: number;
  redCardsDelta: number;
  note?: string;
  adjustmentReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdjustmentCategory {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string; // Hex color like '#3B82F6'
  icon?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ExternalMatchData {
  categoryId: string;
  externalTeamName?: string;
  opponentName: string;
  gameDate: string;
  scoreFor?: number;
  scoreAgainst?: number;
  homeOrAway: 'home' | 'away' | 'neutral';
  playerAdjustments: Array<{
    playerId: string;
    gamesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  }>;
  includeInSeasonTournament: boolean;
  seasonId?: string;
  tournamentId?: string;
  note?: string;
}

export interface PlayerAdjustmentsSummary {
  playerId: string;
  totalGamesPlayed: number;
  totalGoals: number;
  totalAssists: number;
  totalYellowCards: number;
  totalRedCards: number;
  adjustmentCount: number;
  lastAdjustmentDate?: string;
}
```

**Immediate Verification:**
```bash
# Check TypeScript compilation
npx tsc --noEmit
# Should complete without errors

# Check file was updated correctly  
tail -20 src/types/index.ts
```

**Validation Checklist:**
- [ ] TypeScript compilation passes
- [ ] No import/export errors
- [ ] Interfaces added to end of file
- [ ] Git diff shows only expected additions

### Step 3.1: Create Adjustments Utility File Structure  
**Estimated Time**: 10 minutes
**Files Created**: `src/utils/externalMatches.ts`

**Pre-Checks:**
- [ ] Directory `src/utils/` exists
- [ ] Step 2.1 completed (types available)
- [ ] Can import from existing utilities

**Implementation:**
Create the new file:

```typescript
// src/utils/externalMatches.ts
import { supabase } from '../lib/supabase';
import type { PlayerStatAdjustment, AdjustmentCategory, ExternalMatchData, PlayerAdjustmentsSummary } from '../types';
import { StorageError, NetworkError, AuthenticationError } from '../lib/storage/types';

export class ExternalMatchManager {
  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AuthenticationError('supabase', 'getCurrentUserId', error || new Error('No user'));
    }
    return user.id;
  }

  // Get all adjustment categories for current user
  async getAdjustmentCategories(): Promise<AdjustmentCategory[]> {
    try {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('adjustment_categories')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return (data || []).map(this.transformCategoryFromSupabase);
    } catch (error) {
      throw new StorageError('supabase', 'getAdjustmentCategories', error as Error);
    }
  }

  // Get all stat adjustments for a player
  async getPlayerAdjustments(playerId: string): Promise<PlayerStatAdjustment[]> {
    try {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('player_stat_adjustments')
        .select('*')
        .eq('user_id', userId)
        .eq('player_id', playerId)
        .order('game_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.transformAdjustmentFromSupabase);
    } catch (error) {
      throw new StorageError('supabase', 'getPlayerAdjustments', error as Error);
    }
  }

  // Create a new stat adjustment
  async createStatAdjustment(adjustment: Omit<PlayerStatAdjustment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<PlayerStatAdjustment> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('player_stat_adjustments')
        .insert({
          user_id: userId,
          player_id: adjustment.playerId,
          season_id: adjustment.seasonId || null,
          tournament_id: adjustment.tournamentId || null,
          external_team_name: adjustment.externalTeamName || null,
          opponent_name: adjustment.opponentName || null,
          score_for: adjustment.scoreFor || null,
          score_against: adjustment.scoreAgainst || null,
          game_date: adjustment.gameDate || null,
          home_or_away: adjustment.homeOrAway || null,
          include_in_season_tournament: adjustment.includeInSeasonTournament,
          games_played_delta: adjustment.gamesPlayedDelta,
          goals_delta: adjustment.goalsDelta,
          assists_delta: adjustment.assistsDelta,
          yellow_cards_delta: adjustment.yellowCardsDelta || 0,
          red_cards_delta: adjustment.redCardsDelta || 0,
          note: adjustment.note || null,
          adjustment_reason: adjustment.adjustmentReason
        })
        .select()
        .single();

      if (error) throw error;
      return this.transformAdjustmentFromSupabase(data);
    } catch (error) {
      throw new StorageError('supabase', 'createStatAdjustment', error as Error);
    }
  }

  // Update an existing adjustment
  async updateStatAdjustment(adjustmentId: string, updates: Partial<PlayerStatAdjustment>): Promise<PlayerStatAdjustment> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('player_stat_adjustments')
        .update({
          ...this.transformAdjustmentToSupabase(updates),
          updated_at: new Date().toISOString()
        })
        .eq('id', adjustmentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return this.transformAdjustmentFromSupabase(data);
    } catch (error) {
      throw new StorageError('supabase', 'updateStatAdjustment', error as Error);
    }
  }

  // Delete an adjustment
  async deleteStatAdjustment(adjustmentId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('player_stat_adjustments')
        .delete()
        .eq('id', adjustmentId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      throw new StorageError('supabase', 'deleteStatAdjustment', error as Error);
    }
  }

  // Get summary of all adjustments for a player
  async getPlayerAdjustmentsSummary(playerId: string): Promise<PlayerAdjustmentsSummary> {
    try {
      const adjustments = await this.getPlayerAdjustments(playerId);
      
      return {
        playerId,
        totalGamesPlayed: adjustments.reduce((sum, adj) => sum + adj.gamesPlayedDelta, 0),
        totalGoals: adjustments.reduce((sum, adj) => sum + adj.goalsDelta, 0),
        totalAssists: adjustments.reduce((sum, adj) => sum + adj.assistsDelta, 0),
        totalYellowCards: adjustments.reduce((sum, adj) => sum + adj.yellowCardsDelta, 0),
        totalRedCards: adjustments.reduce((sum, adj) => sum + adj.redCardsDelta, 0),
        adjustmentCount: adjustments.length,
        lastAdjustmentDate: adjustments[0]?.gameDate
      };
    } catch (error) {
      throw new StorageError('supabase', 'getPlayerAdjustmentsSummary', error as Error);
    }
  }

  // Transform data between app and database formats
  private transformAdjustmentFromSupabase(data: any): PlayerStatAdjustment {
    return {
      id: data.id,
      userId: data.user_id,
      playerId: data.player_id,
      seasonId: data.season_id,
      tournamentId: data.tournament_id,
      externalTeamName: data.external_team_name,
      opponentName: data.opponent_name,
      scoreFor: data.score_for,
      scoreAgainst: data.score_against,
      gameDate: data.game_date,
      homeOrAway: data.home_or_away,
      includeInSeasonTournament: data.include_in_season_tournament,
      gamesPlayedDelta: data.games_played_delta,
      goalsDelta: data.goals_delta,
      assistsDelta: data.assists_delta,
      yellowCardsDelta: data.yellow_cards_delta || 0,
      redCardsDelta: data.red_cards_delta || 0,
      note: data.note,
      adjustmentReason: data.adjustment_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private transformAdjustmentToSupabase(data: Partial<PlayerStatAdjustment>): Record<string, any> {
    const result: Record<string, any> = {};
    
    if (data.seasonId !== undefined) result.season_id = data.seasonId;
    if (data.tournamentId !== undefined) result.tournament_id = data.tournamentId;
    if (data.externalTeamName !== undefined) result.external_team_name = data.externalTeamName;
    if (data.opponentName !== undefined) result.opponent_name = data.opponentName;
    if (data.scoreFor !== undefined) result.score_for = data.scoreFor;
    if (data.scoreAgainst !== undefined) result.score_against = data.scoreAgainst;
    if (data.gameDate !== undefined) result.game_date = data.gameDate;
    if (data.homeOrAway !== undefined) result.home_or_away = data.homeOrAway;
    if (data.includeInSeasonTournament !== undefined) result.include_in_season_tournament = data.includeInSeasonTournament;
    if (data.gamesPlayedDelta !== undefined) result.games_played_delta = data.gamesPlayedDelta;
    if (data.goalsDelta !== undefined) result.goals_delta = data.goalsDelta;
    if (data.assistsDelta !== undefined) result.assists_delta = data.assistsDelta;
    if (data.yellowCardsDelta !== undefined) result.yellow_cards_delta = data.yellowCardsDelta;
    if (data.redCardsDelta !== undefined) result.red_cards_delta = data.redCardsDelta;
    if (data.note !== undefined) result.note = data.note;
    if (data.adjustmentReason !== undefined) result.adjustment_reason = data.adjustmentReason;

    return result;
  }

  private transformCategoryFromSupabase(data: any): AdjustmentCategory {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      isDefault: data.is_default,
      createdAt: data.created_at
    };
  }
}

// Export singleton instance
export const externalMatchManager = new ExternalMatchManager();
```

**Immediate Verification:**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Verify file created correctly
ls -la src/utils/externalMatches.ts
wc -l src/utils/externalMatches.ts  # Should be around 180-200 lines
```

**Validation Checklist:**
- [ ] File created at correct location
- [ ] TypeScript compilation passes
- [ ] All imports resolve correctly
- [ ] Class structure follows existing patterns
- [ ] No existing functionality broken

### [Continue with remaining steps using the same detailed format...]

## Error Recovery Procedures

### Database Rollback
If database steps fail:
```sql
-- Full rollback of all tables
DROP TRIGGER IF EXISTS create_default_categories_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_default_adjustment_categories();
DROP TABLE IF EXISTS adjustment_categories;
DROP TABLE IF EXISTS player_stat_adjustments;
```

### Code Rollback  
If code steps fail:
```bash
# See what changed
git diff

# Rollback specific files
git checkout HEAD -- src/utils/externalMatches.ts
git checkout HEAD -- src/types/index.ts

# Or full rollback
git reset --hard HEAD
```

### Common Issues & Solutions

**"TypeScript errors after adding interfaces"**
1. Check that interfaces are exported correctly
2. Verify no naming conflicts with existing types
3. Run `npx tsc --noEmit` for detailed error info

**"Database constraint violations"**
1. Verify that delta values are non-negative
2. Check that player_id references exist
3. Test constraints individually in SQL editor

**"Stats not updating after adjustments"**
1. Verify playerStats.ts includes adjustment calculations
2. Check that cache invalidation works properly
3. Test stats calculation functions in isolation

## Testing Validation

### Manual Testing Checklist
After completing all steps:
- [ ] **Can create stat adjustments** for existing players
- [ ] **Adjustments appear in stats** calculations correctly
- [ ] **UI shows external matches** in player statistics
- [ ] **Categories work** for organizing adjustments
- [ ] **Validation prevents** invalid data entry
- [ ] **Performance** is acceptable (no slowdowns)

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
- [ ] Player statistics include external match data
- [ ] UI provides intuitive adjustment management
- [ ] Database properly secured with RLS
- [ ] Error handling is robust

## Time Tracking Template
```
## External Matches Implementation Log
**Start Time**: [FILL IN]
**Estimated Total**: 4.5 hours
**Actual Total**: [UPDATE AS YOU GO]

### Phase 1: Database Foundation (Est: 25min)
- Step 1.1: [ACTUAL TIME] vs 8min estimated
- Step 1.2: [ACTUAL TIME] vs 5min estimated

### Issues Encountered:
- [LOG ANY PROBLEMS AND SOLUTIONS]

### Notes:
- [ANY OBSERVATIONS OR MODIFICATIONS TO THE PLAN]
```

This external matches system will allow coaches to maintain complete player statistics including games played outside the app.