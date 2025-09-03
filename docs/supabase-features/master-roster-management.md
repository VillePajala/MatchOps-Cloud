# Master Roster Management - AI-Ready Implementation Plan

## Overview
Enhance the existing roster management system with advanced features including bulk operations, advanced search and filtering, player analytics, activity tracking, import/export capabilities, and intelligent roster insights.

## Prerequisites Verification
**BEFORE STARTING**: Verify all prerequisites are met

### Pre-Implementation Checks
- [ ] **Environment**: `npm run dev` starts without errors
- [ ] **Database Access**: Can access Supabase dashboard and run SQL queries
- [ ] **Player System**: Existing players table and RosterSettingsModal working
- [ ] **Current Roster**: Can add/edit/delete players in existing system
- [ ] **Git State**: Working directory clean (`git status` shows no uncommitted changes)

### Understanding Current Architecture
**CRITICAL**: Read these files before proceeding:
1. `src/components/RosterSettingsModal.tsx` - Current roster management modal
2. `src/utils/playerStats.ts` - Current player statistics calculations
3. `src/types/index.ts` - Current Player interface
4. `src/lib/storage/supabaseProvider.ts` - How player data is stored

**Verification Commands:**
```bash
# Check these files exist
ls -la src/components/RosterSettingsModal.tsx src/utils/playerStats.ts

# Find current player-related code
grep -r "Player" src/types/ | head -3
grep -r "roster\|player" src/components/ | head -5
```

## Progress Tracking

### Phase 1: Database Enhancements (30 min total)
- [ ] **Step 1.1**: Add player activity tracking table (8 min)
- [ ] **Step 1.2**: Add player tags system (7 min)
- [ ] **Step 1.3**: Add roster analytics table (8 min)
- [ ] **Step 1.4**: Add bulk operation logs table (7 min)

### Phase 2: Enhanced Player Types (20 min total)
- [ ] **Step 2.1**: Extend Player interface with new fields (5 min)
- [ ] **Step 2.2**: Add PlayerActivity interface (4 min)
- [ ] **Step 2.3**: Add PlayerTag and BulkOperation interfaces (6 min)
- [ ] **Step 2.4**: Add RosterAnalytics interface (5 min)

### Phase 3: Advanced Player Operations (60 min total)
- [ ] **Step 3.1**: Create enhanced player manager utility (20 min)
- [ ] **Step 3.2**: Implement advanced search and filtering (15 min)
- [ ] **Step 3.3**: Add bulk operations (delete, edit, tag) (15 min)
- [ ] **Step 3.4**: Implement player analytics calculations (10 min)

### Phase 4: Enhanced Roster Hooks (45 min total)
- [ ] **Step 4.1**: Create useAdvancedRoster hook (20 min)
- [ ] **Step 4.2**: Create usePlayerAnalytics hook (15 min)
- [ ] **Step 4.3**: Create useBulkOperations hook (10 min)

### Phase 5: Enhanced UI Components (90 min total)
- [ ] **Step 5.1**: Create AdvancedSearchFilter component (25 min)
- [ ] **Step 5.2**: Create BulkOperationsToolbar component (20 min)
- [ ] **Step 5.3**: Create PlayerAnalyticsCard component (20 min)
- [ ] **Step 5.4**: Create PlayerTagManager component (15 min)
- [ ] **Step 5.5**: Enhance existing RosterSettingsModal (10 min)

### Phase 6: Import/Export System (50 min total)
- [ ] **Step 6.1**: Create CSV import/export utilities (20 min)
- [ ] **Step 6.2**: Create ImportExportModal component (20 min)
- [ ] **Step 6.3**: Add validation and error handling (10 min)

### Phase 7: Activity Tracking (25 min total)
- [ ] **Step 7.1**: Implement activity logging (15 min)
- [ ] **Step 7.2**: Create ActivityTimeline component (10 min)

### Phase 8: Testing & Validation (30 min total)
- [ ] **Step 8.1**: Write unit tests for enhanced utilities (20 min)
- [ ] **Step 8.2**: Manual integration testing (10 min)

## Detailed Implementation Steps

### Step 1.1: Add Player Activity Tracking Table
**Estimated Time**: 8 minutes
**Files Modified**: Supabase Database (via SQL Editor)

**Pre-Checks:**
- [ ] Can access Supabase dashboard
- [ ] Players table exists (run: `SELECT * FROM players LIMIT 1;`)
- [ ] Current database schema understood

**Implementation:**
```sql
-- Step 1.1: Create player activity tracking
CREATE TABLE player_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created', 'updated', 'deleted', 'imported', 'exported',
    'tagged', 'untagged', 'bulk_updated', 'stats_reset'
  )),
  activity_description TEXT NOT NULL,
  changes JSONB DEFAULT '{}', -- What changed (before/after values)
  metadata JSONB DEFAULT '{}', -- Additional context like bulk operation ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for efficient queries
  INDEX (user_id, created_at DESC),
  INDEX (player_id, created_at DESC),
  INDEX (activity_type)
);

-- Enable RLS
ALTER TABLE player_activities ENABLE ROW LEVEL SECURITY;

-- Users can only see their own player activities
CREATE POLICY "Users can manage their own player activities" ON player_activities
  FOR ALL USING (auth.uid() = user_id);

-- Add indexes explicitly (in case the inline ones didn't work)
CREATE INDEX idx_player_activities_user_date ON player_activities(user_id, created_at DESC);
CREATE INDEX idx_player_activities_player ON player_activities(player_id);
CREATE INDEX idx_player_activities_type ON player_activities(activity_type);
```

**Immediate Verification:**
```sql
-- Verify table structure
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'player_activities' 
ORDER BY ordinal_position;

-- Should show 8 columns
SELECT COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'player_activities';

-- Test check constraint
INSERT INTO player_activities (user_id, player_id, activity_type, activity_description) 
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'invalid_type', 'test');
-- Should fail due to CHECK constraint
```

**Validation Checklist:**
- [ ] SQL executed without errors
- [ ] Table has 8 columns: id, user_id, player_id, activity_type, activity_description, changes, metadata, created_at
- [ ] CHECK constraint prevents invalid activity types
- [ ] RLS policy created
- [ ] Three indexes created successfully

### Step 1.2: Add Player Tags System
**Estimated Time**: 7 minutes
**Files Modified**: Supabase Database

**Pre-Checks:**
- [ ] Step 1.1 completed successfully
- [ ] Still in Supabase SQL Editor

**Implementation:**
```sql
-- Step 1.2: Create player tags system
CREATE TABLE player_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT, -- Hex color for UI display
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

-- Junction table for player-tag relationships
CREATE TABLE player_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES player_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id), -- Who assigned this tag
  
  UNIQUE(player_id, tag_id)
);

-- Enable RLS on both tables
ALTER TABLE player_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own player tags" ON player_tags
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own player tag assignments" ON player_tag_assignments
  FOR ALL USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_player_tags_user ON player_tags(user_id);
CREATE INDEX idx_player_tag_assignments_player ON player_tag_assignments(player_id);
CREATE INDEX idx_player_tag_assignments_tag ON player_tag_assignments(tag_id);

-- Insert some default tags for each user (via trigger)
CREATE OR REPLACE FUNCTION create_default_player_tags()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_tags (user_id, name, color, description)
  VALUES 
    (NEW.id, 'Starter', '#22C55E', 'Regular starting players'),
    (NEW.id, 'Substitute', '#F59E0B', 'Players who usually come off the bench'),
    (NEW.id, 'Goalkeeper', '#3B82F6', 'Goal keepers'),
    (NEW.id, 'Captain', '#8B5CF6', 'Team captains and leaders'),
    (NEW.id, 'Injured', '#EF4444', 'Currently injured players')
  ON CONFLICT (user_id, name) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER create_default_player_tags_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_player_tags();
```

**Immediate Verification:**
```sql
-- Verify both tables created
SELECT table_name, column_name FROM information_schema.columns 
WHERE table_name IN ('player_tags', 'player_tag_assignments')
ORDER BY table_name, ordinal_position;

-- Check if trigger function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'create_default_player_tags';
```

**Validation Checklist:**
- [ ] Both tables created successfully
- [ ] RLS policies on both tables
- [ ] Indexes created
- [ ] Trigger function created
- [ ] Foreign key constraints working

### Step 1.3: Add Roster Analytics Table
**Estimated Time**: 8 minutes
**Files Modified**: Supabase Database

**Implementation:**
```sql
-- Step 1.3: Create roster analytics cache
CREATE TABLE roster_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_players INTEGER DEFAULT 0,
  active_players INTEGER DEFAULT 0,
  goalkeepers_count INTEGER DEFAULT 0,
  average_age DECIMAL(4,1),
  position_distribution JSONB DEFAULT '{}', -- {"forward": 5, "midfielder": 8, "defender": 7, "goalkeeper": 2}
  tag_distribution JSONB DEFAULT '{}', -- {"starter": 11, "substitute": 11, "injured": 2}
  activity_summary JSONB DEFAULT '{}', -- Recent activity counts
  last_game_participation JSONB DEFAULT '{}', -- Who played in recent games
  performance_trends JSONB DEFAULT '{}', -- Goals/assists trends
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE roster_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analytics
CREATE POLICY "Users can manage their own roster analytics" ON roster_analytics
  FOR ALL USING (auth.uid() = user_id);

-- Add index
CREATE INDEX idx_roster_analytics_user ON roster_analytics(user_id);
CREATE INDEX idx_roster_analytics_calculated ON roster_analytics(calculated_at DESC);

-- Function to recalculate roster analytics
CREATE OR REPLACE FUNCTION recalculate_roster_analytics(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- This will be implemented in the application layer for complex calculations
  -- This function serves as a placeholder for potential future use
  UPDATE roster_analytics 
  SET calculated_at = NOW() 
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;
```

**Immediate Verification:**
```sql
-- Verify table structure
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'roster_analytics'
ORDER BY ordinal_position;

-- Verify function was created
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'recalculate_roster_analytics';
```

**Validation Checklist:**
- [ ] Table created with 11 columns
- [ ] RLS policy created
- [ ] Two indexes created
- [ ] Placeholder function created
- [ ] JSONB columns for complex data storage

### Step 2.1: Extend Player Interface with New Fields
**Estimated Time**: 5 minutes
**Files Modified**: `src/types/index.ts`

**Pre-Checks:**
- [ ] File `src/types/index.ts` exists and is writable
- [ ] Current Player interface exists in the file
- [ ] Phase 1 database changes completed successfully

**Implementation:**
Add these interfaces and extend existing Player at the END of `src/types/index.ts`:

```typescript
// Master Roster Management Types - Added [CURRENT_DATE]

// Enhanced Player interface (extends existing)
export interface PlayerTag {
  id: string;
  userId: string;
  name: string;
  color?: string; // Hex color like '#22C55E'
  description?: string;
  createdAt: string;
}

export interface PlayerActivity {
  id: string;
  userId: string;
  playerId: string;
  activityType: 'created' | 'updated' | 'deleted' | 'imported' | 'exported' | 
                'tagged' | 'untagged' | 'bulk_updated' | 'stats_reset';
  activityDescription: string;
  changes: Record<string, any>; // Before/after values
  metadata: Record<string, any>; // Additional context
  createdAt: string;
}

export interface PlayerTagAssignment {
  id: string;
  userId: string;
  playerId: string;
  tagId: string;
  assignedAt: string;
  assignedBy?: string;
  // Populated from joins
  tag?: PlayerTag;
}

// Enhanced player with additional computed fields
export interface EnhancedPlayer extends Player {
  tags?: PlayerTag[];
  tagAssignments?: PlayerTagAssignment[];
  recentActivity?: PlayerActivity[];
  gamesPlayedCount?: number;
  goalsPerGame?: number;
  assistsPerGame?: number;
  lastGameDate?: string;
  performanceTrend?: 'improving' | 'declining' | 'stable';
  activityScore?: number; // How active/engaged this player is
}

export interface RosterAnalytics {
  id: string;
  userId: string;
  totalPlayers: number;
  activePlayers: number;
  goalkeepersCount: number;
  averageAge?: number;
  positionDistribution: Record<string, number>; // {forward: 5, midfielder: 8}
  tagDistribution: Record<string, number>; // {starter: 11, substitute: 11}
  activitySummary: Record<string, any>;
  lastGameParticipation: Record<string, any>;
  performanceTrends: Record<string, any>;
  calculatedAt: string;
}

export interface BulkOperation {
  id: string;
  type: 'delete' | 'tag' | 'untag' | 'update_field';
  playerIds: string[];
  parameters: Record<string, any>; // Operation-specific parameters
  results: {
    successful: number;
    failed: number;
    errors: string[];
  };
  executedAt: string;
  executedBy: string;
}

export interface PlayerSearchFilters {
  query?: string; // Text search in name/nickname
  tags?: string[]; // Filter by tag IDs
  positions?: string[]; // Filter by positions
  isGoalie?: boolean;
  hasPlayedRecently?: boolean; // Played in last X games
  performanceTrend?: 'improving' | 'declining' | 'stable';
  ageRange?: {
    min?: number;
    max?: number;
  };
  statsRange?: {
    goals?: { min?: number; max?: number };
    assists?: { min?: number; max?: number };
    gamesPlayed?: { min?: number; max?: number };
  };
}

export interface RosterImportResult {
  totalRows: number;
  successful: number;
  failed: number;
  duplicates: number;
  newPlayers: EnhancedPlayer[];
  errors: Array<{
    row: number;
    field: string;
    value: any;
    error: string;
  }>;
}

export interface RosterExportOptions {
  format: 'csv' | 'json';
  includeStats: boolean;
  includeTags: boolean;
  includeActivity: boolean;
  filterByTags?: string[];
  customFields?: string[]; // Additional fields to include
}
```

**Immediate Verification:**
```bash
# Check TypeScript compilation
npx tsc --noEmit
# Should complete without errors

# Verify interfaces were added
tail -50 src/types/index.ts | grep -E "(interface|export)"
```

**Validation Checklist:**
- [ ] TypeScript compilation passes
- [ ] All new interfaces properly exported
- [ ] EnhancedPlayer extends existing Player interface
- [ ] No naming conflicts with existing types
- [ ] Git diff shows only expected additions

### Step 3.1: Create Enhanced Player Manager Utility
**Estimated Time**: 20 minutes
**Files Created**: `src/utils/enhancedPlayerManager.ts`

**Pre-Checks:**
- [ ] Directory `src/utils/` exists
- [ ] Step 2.1 completed (types available)
- [ ] Can import from existing utilities

**Implementation:**
Create the new file:

```typescript
// src/utils/enhancedPlayerManager.ts
import { supabase } from '../lib/supabase';
import type { 
  EnhancedPlayer, PlayerTag, PlayerActivity, PlayerTagAssignment, 
  RosterAnalytics, BulkOperation, PlayerSearchFilters, RosterImportResult 
} from '../types';
import { StorageError, NetworkError, AuthenticationError } from '../lib/storage/types';

export class EnhancedPlayerManager {
  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AuthenticationError('supabase', 'getCurrentUserId', error || new Error('No user'));
    }
    return user.id;
  }

  // Get enhanced players with tags, activity, and computed stats
  async getEnhancedPlayers(filters?: PlayerSearchFilters): Promise<EnhancedPlayer[]> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Base query with joins for tags and recent activity
      let query = supabase
        .from('players')
        .select(`
          *,
          player_tag_assignments!inner(
            *,
            player_tags(*)
          ),
          player_activities!left(
            *
          )
        `)
        .eq('user_id', userId);

      // Apply filters
      if (filters?.query) {
        query = query.or(`name.ilike.%${filters.query}%,nickname.ilike.%${filters.query}%`);
      }

      if (filters?.isGoalie !== undefined) {
        query = query.eq('is_goalie', filters.isGoalie);
      }

      if (filters?.tags && filters.tags.length > 0) {
        // This requires a more complex query - we'll handle it in post-processing
      }

      const { data, error } = await query.order('name');
      if (error) throw error;

      // Transform and enhance the data
      const enhancedPlayers = await Promise.all((data || []).map(async (playerData) => {
        const enhanced = await this.enhancePlayerData(playerData);
        
        // Apply complex filters that couldn't be done in SQL
        if (filters && !this.playerMatchesFilters(enhanced, filters)) {
          return null;
        }
        
        return enhanced;
      }));

      return enhancedPlayers.filter(Boolean) as EnhancedPlayer[];
    } catch (error) {
      throw new StorageError('Failed to get enhanced players', 'supabase', 'getEnhancedPlayers', error as Error);
    }
  }

  // Get or create player tags
  async getPlayerTags(): Promise<PlayerTag[]> {
    try {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('player_tags')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      return (data || []).map(this.transformTagFromSupabase);
    } catch (error) {
      throw new StorageError('Failed to get player tags', 'supabase', 'getPlayerTags', error as Error);
    }
  }

  // Create a new player tag
  async createPlayerTag(tag: Omit<PlayerTag, 'id' | 'userId' | 'createdAt'>): Promise<PlayerTag> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('player_tags')
        .insert({
          user_id: userId,
          name: tag.name.trim(),
          color: tag.color || '#6B7280',
          description: tag.description?.trim() || null
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new StorageError('Tag name already exists', 'supabase', 'createPlayerTag', new Error('Tag name already exists'));
        }
        throw error;
      }

      return this.transformTagFromSupabase(data);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('Failed to create player tag', 'supabase', 'createPlayerTag', error as Error);
    }
  }

  // Assign tag to player
  async assignTagToPlayer(playerId: string, tagId: string): Promise<PlayerTagAssignment> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('player_tag_assignments')
        .insert({
          user_id: userId,
          player_id: playerId,
          tag_id: tagId,
          assigned_by: userId
        })
        .select(`
          *,
          player_tags(*)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new StorageError('supabase', 'assignTagToPlayer', new Error('Player already has this tag'));
        }
        throw error;
      }

      // Log the activity
      await this.logPlayerActivity(playerId, 'tagged', `Tagged with "${data.player_tags.name}"`, {
        tagId,
        tagName: data.player_tags.name
      });

      return this.transformTagAssignmentFromSupabase(data);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('supabase', 'assignTagToPlayer', error as Error);
    }
  }

  // Remove tag from player
  async removeTagFromPlayer(playerId: string, tagId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      // Get tag name for logging
      const { data: tagData } = await supabase
        .from('player_tag_assignments')
        .select(`
          *,
          player_tags(name)
        `)
        .eq('user_id', userId)
        .eq('player_id', playerId)
        .eq('tag_id', tagId)
        .single();

      const { error } = await supabase
        .from('player_tag_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('player_id', playerId)
        .eq('tag_id', tagId);

      if (error) throw error;

      // Log the activity
      if (tagData?.player_tags?.name) {
        await this.logPlayerActivity(playerId, 'untagged', `Removed tag "${tagData.player_tags.name}"`, {
          tagId,
          tagName: tagData.player_tags.name
        });
      }
    } catch (error) {
      throw new StorageError('supabase', 'removeTagFromPlayer', error as Error);
    }
  }

  // Bulk operations
  async executeBulkOperation(operation: Omit<BulkOperation, 'id' | 'executedAt' | 'executedBy'>): Promise<BulkOperation> {
    const userId = await this.getCurrentUserId();
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      for (const playerId of operation.playerIds) {
        try {
          switch (operation.type) {
            case 'tag':
              await this.assignTagToPlayer(playerId, operation.parameters.tagId);
              results.successful++;
              break;
            case 'untag':
              await this.removeTagFromPlayer(playerId, operation.parameters.tagId);
              results.successful++;
              break;
            case 'delete':
              await supabase.from('players').delete().eq('id', playerId).eq('user_id', userId);
              results.successful++;
              break;
            default:
              throw new Error(`Unsupported operation type: ${operation.type}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const bulkOp: BulkOperation = {
        id: crypto.randomUUID(),
        type: operation.type,
        playerIds: operation.playerIds,
        parameters: operation.parameters,
        results,
        executedAt: new Date().toISOString(),
        executedBy: userId
      };

      // Log bulk operation activity for each affected player
      const successfulPlayerIds = operation.playerIds.slice(0, results.successful);
      for (const playerId of successfulPlayerIds) {
        await this.logPlayerActivity(
          playerId, 
          'bulk_updated', 
          `Bulk ${operation.type} operation`,
          { bulkOperationId: bulkOp.id }
        );
      }

      return bulkOp;
    } catch (error) {
      throw new StorageError('supabase', 'executeBulkOperation', error as Error);
    }
  }

  // Calculate roster analytics
  async calculateRosterAnalytics(): Promise<RosterAnalytics> {
    try {
      const userId = await this.getCurrentUserId();
      const players = await this.getEnhancedPlayers();
      
      const analytics: RosterAnalytics = {
        id: crypto.randomUUID(),
        userId,
        totalPlayers: players.length,
        activePlayers: players.filter(p => !p.tags?.some(t => t.name === 'Injured')).length,
        goalkeepersCount: players.filter(p => p.isGoalie).length,
        averageAge: this.calculateAverageAge(players),
        positionDistribution: this.calculatePositionDistribution(players),
        tagDistribution: this.calculateTagDistribution(players),
        activitySummary: {},
        lastGameParticipation: {},
        performanceTrends: {},
        calculatedAt: new Date().toISOString()
      };

      // Cache the analytics
      await supabase
        .from('roster_analytics')
        .upsert({
          user_id: userId,
          total_players: analytics.totalPlayers,
          active_players: analytics.activePlayers,
          goalkeepers_count: analytics.goalkeepersCount,
          average_age: analytics.averageAge,
          position_distribution: analytics.positionDistribution,
          tag_distribution: analytics.tagDistribution,
          activity_summary: analytics.activitySummary,
          last_game_participation: analytics.lastGameParticipation,
          performance_trends: analytics.performanceTrends,
          calculated_at: analytics.calculatedAt
        }, {
          onConflict: 'user_id'
        });

      return analytics;
    } catch (error) {
      throw new StorageError('supabase', 'calculateRosterAnalytics', error as Error);
    }
  }

  // Private helper methods
  private async enhancePlayerData(playerData: any): Promise<EnhancedPlayer> {
    // Transform base player data
    const basePlayer = this.transformPlayerFromSupabase(playerData);
    
    // Add tags
    const tags = (playerData.player_tag_assignments || [])
      .map((assignment: any) => this.transformTagFromSupabase(assignment.player_tags))
      .filter(Boolean);

    // Add recent activity
    const recentActivity = (playerData.player_activities || [])
      .slice(0, 10) // Last 10 activities
      .map((activity: any) => this.transformActivityFromSupabase(activity));

    // Calculate performance metrics (simplified for example)
    const gamesPlayedCount = await this.calculateGamesPlayed(basePlayer.id);
    const goalsPerGame = gamesPlayedCount > 0 ? (basePlayer.goals || 0) / gamesPlayedCount : 0;
    const assistsPerGame = gamesPlayedCount > 0 ? (basePlayer.assists || 0) / gamesPlayedCount : 0;

    const enhanced: EnhancedPlayer = {
      ...basePlayer,
      tags,
      recentActivity,
      gamesPlayedCount,
      goalsPerGame: Math.round(goalsPerGame * 100) / 100,
      assistsPerGame: Math.round(assistsPerGame * 100) / 100,
      performanceTrend: 'stable', // Simplified
      activityScore: this.calculateActivityScore(recentActivity)
    };

    return enhanced;
  }

  private async calculateGamesPlayed(playerId: string): Promise<number> {
    // This would query games where the player participated
    // Simplified implementation
    return 0;
  }

  private calculateActivityScore(activities: PlayerActivity[]): number {
    // Simple scoring based on recent activity
    const recentActivities = activities.filter(a => 
      new Date(a.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    );
    return recentActivities.length * 10;
  }

  private playerMatchesFilters(player: EnhancedPlayer, filters: PlayerSearchFilters): boolean {
    if (filters.tags && filters.tags.length > 0) {
      const playerTagIds = player.tags?.map(t => t.id) || [];
      const hasRequiredTag = filters.tags.some(tagId => playerTagIds.includes(tagId));
      if (!hasRequiredTag) return false;
    }

    if (filters.ageRange) {
      // Would need to calculate age from birth date or age field
      // Simplified implementation
    }

    return true;
  }

  private calculateAverageAge(players: EnhancedPlayer[]): number | undefined {
    // Would need age data on players
    return undefined;
  }

  private calculatePositionDistribution(players: EnhancedPlayer[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    players.forEach(player => {
      const position = player.position || 'unknown';
      distribution[position] = (distribution[position] || 0) + 1;
    });
    return distribution;
  }

  private calculateTagDistribution(players: EnhancedPlayer[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    players.forEach(player => {
      player.tags?.forEach(tag => {
        distribution[tag.name] = (distribution[tag.name] || 0) + 1;
      });
    });
    return distribution;
  }

  // Log player activity
  private async logPlayerActivity(
    playerId: string, 
    activityType: PlayerActivity['activityType'], 
    description: string, 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      
      await supabase
        .from('player_activities')
        .insert({
          user_id: userId,
          player_id: playerId,
          activity_type: activityType,
          activity_description: description,
          metadata
        });
    } catch (error) {
      // Log activity failures shouldn't break the main operation
      console.warn('Failed to log player activity:', error);
    }
  }

  // Transform functions
  private transformPlayerFromSupabase(data: any): any {
    // This would transform the base player data
    // Implementation depends on existing player structure
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      nickname: data.nickname,
      position: data.position,
      jerseyNumber: data.jersey_number,
      isGoalie: data.is_goalie,
      goals: data.goals || 0,
      assists: data.assists || 0,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private transformTagFromSupabase(data: any): PlayerTag {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      color: data.color,
      description: data.description,
      createdAt: data.created_at
    };
  }

  private transformTagAssignmentFromSupabase(data: any): PlayerTagAssignment {
    return {
      id: data.id,
      userId: data.user_id,
      playerId: data.player_id,
      tagId: data.tag_id,
      assignedAt: data.assigned_at,
      assignedBy: data.assigned_by,
      tag: data.player_tags ? this.transformTagFromSupabase(data.player_tags) : undefined
    };
  }

  private transformActivityFromSupabase(data: any): PlayerActivity {
    return {
      id: data.id,
      userId: data.user_id,
      playerId: data.player_id,
      activityType: data.activity_type,
      activityDescription: data.activity_description,
      changes: data.changes || {},
      metadata: data.metadata || {},
      createdAt: data.created_at
    };
  }
}

// Export singleton instance
export const enhancedPlayerManager = new EnhancedPlayerManager();
```

**Immediate Verification:**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Verify file created correctly
ls -la src/utils/enhancedPlayerManager.ts
wc -l src/utils/enhancedPlayerManager.ts  # Should be around 350+ lines
```

**Validation Checklist:**
- [ ] File created at correct location
- [ ] TypeScript compilation passes
- [ ] All imports resolve correctly
- [ ] Class structure follows existing patterns
- [ ] Bulk operations implemented
- [ ] Activity logging included
- [ ] Analytics calculations present

### [Continue with remaining steps following the same detailed format...]

## Error Recovery Procedures

### Database Rollback
If database steps fail:
```sql
-- Full rollback of all tables and functions
DROP TRIGGER IF EXISTS create_default_player_tags_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_default_player_tags();
DROP FUNCTION IF EXISTS recalculate_roster_analytics(UUID);
DROP TABLE IF EXISTS roster_analytics;
DROP TABLE IF EXISTS player_tag_assignments;
DROP TABLE IF EXISTS player_tags;
DROP TABLE IF EXISTS player_activities;
```

### Code Rollback  
If code steps fail:
```bash
# See what changed
git diff

# Rollback specific files
git checkout HEAD -- src/utils/enhancedPlayerManager.ts
git checkout HEAD -- src/types/index.ts
git checkout HEAD -- src/components/RosterSettingsModal.tsx

# Or full rollback
git reset --hard HEAD
```

### Common Issues & Solutions

**"Complex query performance issues"**
1. Ensure indexes are created on frequently queried columns
2. Consider pagination for large datasets
3. Use LIMIT and OFFSET for better performance
4. Profile queries in Supabase dashboard

**"Bulk operations timing out"**
1. Implement batch processing (process in chunks of 10-20)
2. Add progress tracking for long operations
3. Use background processing for large bulk operations
4. Provide user feedback during processing

**"Tag assignment conflicts"**
1. Handle unique constraint violations gracefully
2. Check if tag already assigned before attempting assignment
3. Provide clear error messages to users
4. Implement optimistic locking for concurrent operations

## Testing Validation

### Manual Testing Checklist
After completing all steps:
- [ ] **Enhanced roster loads** with tags and analytics
- [ ] **Search and filtering** works across all criteria
- [ ] **Bulk operations** complete successfully without errors
- [ ] **Tag management** allows creating, assigning, and removing tags
- [ ] **Activity tracking** records all player changes
- [ ] **Analytics calculations** provide meaningful insights
- [ ] **Performance** remains acceptable with large rosters

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
- [ ] Enhanced roster management UI works smoothly
- [ ] Bulk operations handle errors gracefully
- [ ] Activity tracking provides useful history
- [ ] Analytics give meaningful insights
- [ ] Search and filtering perform well
- [ ] Import/export functionality works correctly
- [ ] No existing functionality is broken

## Time Tracking Template
```
## Master Roster Management Implementation Log
**Start Time**: [FILL IN]
**Estimated Total**: 6.2 hours
**Actual Total**: [UPDATE AS YOU GO]

### Phase 1: Database Enhancements (Est: 30min)
- Step 1.1: [ACTUAL TIME] vs 8min estimated
- Step 1.2: [ACTUAL TIME] vs 7min estimated

### Issues Encountered:
- [LOG ANY PROBLEMS AND SOLUTIONS]

### Notes:
- [ANY OBSERVATIONS OR MODIFICATIONS TO THE PLAN]
```

This master roster management system will provide coaches with powerful tools to organize, analyze, and manage their player rosters efficiently with comprehensive tracking and insights.