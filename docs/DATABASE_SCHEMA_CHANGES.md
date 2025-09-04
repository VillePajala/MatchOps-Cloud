# Database Schema Changes for Supabase Features

## Overview

This document outlines all database schema changes required to implement the documented Supabase features. The changes are organized into logical migrations to ensure safe, incremental deployment.

## Current Schema Analysis

Based on the existing codebase analysis, the following tables already exist:

### ✅ **Existing Tables (Implemented)**
- `players` - Basic player information with user isolation
- `seasons` - Season management with metadata
- `tournaments` - Tournament management with season association  
- `games` - Game state storage with JSONB data
- `app_settings` - User application settings
- `migration_status` - Migration tracking system

### 🔧 **Tables Requiring Enhancement**
- `players` - Needs additional columns for enhanced features
- `games` - Needs team_id reference (may already exist)

---

## Migration Plan Overview

### **Migration 1**: Team Management Foundation
**Priority**: 🔥 CRITICAL - Required for all other features  
**Estimated Downtime**: 2-3 minutes  
**Risk Level**: LOW

### **Migration 2**: Enhanced Player Management  
**Priority**: 🔥 HIGH - Core functionality enhancement  
**Estimated Downtime**: 3-4 minutes  
**Risk Level**: LOW

### **Migration 3**: User Experience Systems  
**Priority**: 🔶 MEDIUM - UX improvements  
**Estimated Downtime**: 1-2 minutes  
**Risk Level**: LOW

### **Migration 4**: Advanced Analytics & External Integration  
**Priority**: 🔷 LOW - Optional enhancements  
**Estimated Downtime**: 2-3 minutes  
**Risk Level**: LOW

---

# Migration 1: Team Management Foundation

**File**: `supabase/migrations/20240901_team_management_foundation.sql`

## New Tables

### teams
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  notes TEXT,
  color TEXT,
  badge TEXT,
  
  -- Constraints
  CONSTRAINT teams_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT teams_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  UNIQUE(user_id, name)
);

COMMENT ON TABLE teams IS 'User-owned teams for organizing players into groups';
COMMENT ON COLUMN teams.color IS 'Hex color code for team identification';
COMMENT ON COLUMN teams.badge IS 'Optional badge/icon identifier for team';
```

### team_rosters  
```sql
CREATE TABLE team_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(team_id, player_id)
);

COMMENT ON TABLE team_rosters IS 'Junction table linking teams to their players';
```

## Table Modifications

### games - Add team reference
```sql
-- Add team_id column to games table (if not exists)
ALTER TABLE games ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN games.team_id IS 'Optional team association for game organization';
```

## Row Level Security (RLS)

```sql
-- Teams RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own teams" ON teams
  FOR ALL 
  USING (auth.uid() = user_id);

-- Team rosters RLS  
ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage rosters for their teams" ON team_rosters
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_rosters.team_id 
      AND teams.user_id = auth.uid()
    )
  );
```

## Indexes for Performance

```sql
-- Teams indexes
CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_teams_user_active ON teams(user_id) WHERE NOT COALESCE(archived, false);
CREATE INDEX idx_teams_name_lower ON teams(user_id, lower(name)); -- For case-insensitive searches

-- Team rosters indexes
CREATE INDEX idx_team_rosters_team_id ON team_rosters(team_id);
CREATE INDEX idx_team_rosters_player_id ON team_rosters(player_id);
CREATE INDEX idx_team_rosters_team_player ON team_rosters(team_id, player_id); -- Composite for unique checks

-- Games team association
CREATE INDEX idx_games_team_id ON games(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_games_user_team ON games(user_id, team_id) WHERE team_id IS NOT NULL;
```

## Database Functions

### replace_team_roster - Atomic roster management
```sql
CREATE OR REPLACE FUNCTION replace_team_roster(
  p_team_id UUID,
  p_player_ids UUID[],
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_owner_id UUID;
  invalid_players UUID[];
BEGIN
  -- Verify team exists and user owns it
  SELECT user_id INTO team_owner_id 
  FROM teams 
  WHERE id = p_team_id;
  
  IF team_owner_id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;
  
  IF team_owner_id != p_user_id THEN
    RAISE EXCEPTION 'Access denied: You do not own this team';
  END IF;
  
  -- Verify all players belong to the user
  SELECT ARRAY_AGG(player_id) INTO invalid_players
  FROM (
    SELECT unnest(p_player_ids) AS player_id
  ) AS input_players
  WHERE NOT EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = input_players.player_id 
    AND players.user_id = p_user_id
  );
  
  IF array_length(invalid_players, 1) > 0 THEN
    RAISE EXCEPTION 'Invalid player IDs: %', invalid_players;
  END IF;
  
  -- Perform atomic roster replacement
  DELETE FROM team_rosters WHERE team_id = p_team_id;
  
  INSERT INTO team_rosters (team_id, player_id)
  SELECT p_team_id, unnest(p_player_ids)
  WHERE array_length(p_player_ids, 1) > 0; -- Only insert if array not empty
  
  -- Update team timestamp
  UPDATE teams SET updated_at = NOW() WHERE id = p_team_id;
END;
$$;

COMMENT ON FUNCTION replace_team_roster IS 'Atomically replace team roster with new player list';
```

## Triggers for Maintenance

```sql
-- Auto-update teams.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_teams_updated_at 
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update team timestamp when roster changes
CREATE OR REPLACE FUNCTION update_team_on_roster_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE teams SET updated_at = NOW() 
  WHERE id = COALESCE(NEW.team_id, OLD.team_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_team_on_roster_insert
  AFTER INSERT ON team_rosters
  FOR EACH ROW EXECUTE FUNCTION update_team_on_roster_change();

CREATE TRIGGER update_team_on_roster_delete
  AFTER DELETE ON team_rosters
  FOR EACH ROW EXECUTE FUNCTION update_team_on_roster_change();
```

---

# Migration 2: Enhanced Player Management

**File**: `supabase/migrations/20240902_enhanced_player_management.sql`

## Table Enhancements

### players - Add enhanced fields
```sql
-- Add new columns to existing players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS height_cm INTEGER;
ALTER TABLE players ADD COLUMN IF NOT EXISTS weight_kg INTEGER;
ALTER TABLE players ADD COLUMN IF NOT EXISTS medical_info JSONB DEFAULT '{}';
ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';
ALTER TABLE players ADD COLUMN IF NOT EXISTS player_metadata JSONB DEFAULT '{}';

-- Add constraints
ALTER TABLE players ADD CONSTRAINT players_height_reasonable 
  CHECK (height_cm IS NULL OR (height_cm > 50 AND height_cm < 300));
  
ALTER TABLE players ADD CONSTRAINT players_weight_reasonable 
  CHECK (weight_kg IS NULL OR (weight_kg > 10 AND weight_kg < 300));
  
ALTER TABLE players ADD CONSTRAINT players_birth_date_reasonable 
  CHECK (birth_date IS NULL OR (birth_date > '1900-01-01' AND birth_date < CURRENT_DATE));

-- Add comments
COMMENT ON COLUMN players.photo_url IS 'URL to player photo in cloud storage';
COMMENT ON COLUMN players.position IS 'Primary playing position (Forward, Midfielder, Defender, Goalkeeper)';
COMMENT ON COLUMN players.medical_info IS 'JSON object with medical information (allergies, conditions, medications)';
COMMENT ON COLUMN players.emergency_contact IS 'JSON object with emergency contact details';
COMMENT ON COLUMN players.player_metadata IS 'Additional structured data for player attributes';
```

## New Supporting Tables

### player_stats_cache - Performance optimization
```sql
CREATE TABLE player_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Cached statistics
  games_played INTEGER DEFAULT 0,
  total_goals INTEGER DEFAULT 0,
  total_assists INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  avg_points DECIMAL(5,2) DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  fair_play_cards INTEGER DEFAULT 0,
  
  -- Cache metadata
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculation_version INTEGER DEFAULT 1,
  
  -- Constraints
  CONSTRAINT player_stats_cache_non_negative CHECK (
    games_played >= 0 AND total_goals >= 0 AND total_assists >= 0 
    AND total_score >= 0 AND minutes_played >= 0 AND fair_play_cards >= 0
  ),
  UNIQUE(player_id, season_id, tournament_id, team_id)
);

COMMENT ON TABLE player_stats_cache IS 'Cached player statistics for performance optimization';
COMMENT ON COLUMN player_stats_cache.calculation_version IS 'Version number to handle statistics calculation changes';
```

### player_activity - Usage tracking
```sql  
CREATE TABLE player_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT player_activity_valid_type CHECK (
    activity_type IN ('created', 'updated', 'added_to_team', 'removed_from_team', 
                     'played_game', 'scored_goal', 'got_assist', 'fair_play_card')
  )
);

COMMENT ON TABLE player_activity IS 'Player activity log for analytics and timeline features';
```

### bulk_operations - Operation tracking
```sql
CREATE TABLE bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  operation_status TEXT NOT NULL DEFAULT 'pending',
  total_records INTEGER NOT NULL DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  operation_data JSONB DEFAULT '{}',
  error_log JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints  
  CONSTRAINT bulk_operations_valid_status CHECK (
    operation_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT bulk_operations_valid_type CHECK (
    operation_type IN ('player_import', 'player_export', 'team_import', 'stats_recalculation')
  )
);

COMMENT ON TABLE bulk_operations IS 'Tracking for bulk import/export and batch operations';
```

## RLS Policies for New Tables

```sql
-- player_stats_cache RLS
ALTER TABLE player_stats_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own player stats cache" ON player_stats_cache
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "System can manage player stats cache" ON player_stats_cache
  FOR ALL USING (auth.uid() = user_id);

-- player_activity RLS
ALTER TABLE player_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own player activity" ON player_activity
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "System can log player activity" ON player_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- bulk_operations RLS
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bulk operations" ON bulk_operations
  FOR ALL USING (auth.uid() = user_id);
```

## Performance Indexes

```sql
-- Enhanced player indexes
CREATE INDEX idx_players_user_position ON players(user_id, position) WHERE position IS NOT NULL;
CREATE INDEX idx_players_user_birth_date ON players(user_id, birth_date) WHERE birth_date IS NOT NULL;
CREATE INDEX idx_players_user_metadata ON players USING GIN(user_id, player_metadata);

-- Player stats cache indexes
CREATE INDEX idx_player_stats_cache_player ON player_stats_cache(player_id);
CREATE INDEX idx_player_stats_cache_season ON player_stats_cache(season_id) WHERE season_id IS NOT NULL;
CREATE INDEX idx_player_stats_cache_team ON player_stats_cache(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_player_stats_cache_last_calc ON player_stats_cache(last_calculated);

-- Player activity indexes
CREATE INDEX idx_player_activity_player ON player_activity(player_id);
CREATE INDEX idx_player_activity_type ON player_activity(user_id, activity_type);
CREATE INDEX idx_player_activity_created ON player_activity(created_at);

-- Bulk operations indexes
CREATE INDEX idx_bulk_operations_user_status ON bulk_operations(user_id, operation_status);
CREATE INDEX idx_bulk_operations_type ON bulk_operations(user_id, operation_type);
CREATE INDEX idx_bulk_operations_created ON bulk_operations(created_at);
```

## Database Functions for Enhanced Players

### calculate_player_stats - Statistics calculation
```sql
CREATE OR REPLACE FUNCTION calculate_player_stats(
  p_player_id UUID,
  p_season_id UUID DEFAULT NULL,
  p_tournament_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats_result JSONB;
  user_id_val UUID;
BEGIN
  -- Get user_id for the player
  SELECT players.user_id INTO user_id_val
  FROM players WHERE id = p_player_id;
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'Player not found';
  END IF;
  
  -- Calculate statistics from games
  SELECT jsonb_build_object(
    'games_played', COUNT(DISTINCT g.id),
    'total_goals', COALESCE(SUM(CASE WHEN ge.event_type = 'goal' THEN 1 ELSE 0 END), 0),
    'total_assists', COALESCE(SUM(CASE WHEN ge.event_type = 'assist' THEN 1 ELSE 0 END), 0),
    'total_score', COALESCE(SUM(ge.points), 0),
    'minutes_played', COALESCE(SUM(ge.minutes), 0),
    'fair_play_cards', COALESCE(SUM(CASE WHEN ge.event_type = 'fair_play' THEN 1 ELSE 0 END), 0),
    'avg_points', CASE 
      WHEN COUNT(DISTINCT g.id) > 0 
      THEN ROUND(COALESCE(SUM(ge.points), 0)::decimal / COUNT(DISTINCT g.id), 2)
      ELSE 0 
    END
  ) INTO stats_result
  FROM games g
  LEFT JOIN game_events ge ON g.id = ge.game_id AND ge.player_id = p_player_id
  WHERE g.user_id = user_id_val
    AND (p_season_id IS NULL OR g.season_id = p_season_id)
    AND (p_tournament_id IS NULL OR g.tournament_id = p_tournament_id)
    AND (p_team_id IS NULL OR g.team_id = p_team_id);
  
  -- Update cache table
  INSERT INTO player_stats_cache (
    user_id, player_id, season_id, tournament_id, team_id,
    games_played, total_goals, total_assists, total_score, 
    avg_points, minutes_played, fair_play_cards
  )
  VALUES (
    user_id_val, p_player_id, p_season_id, p_tournament_id, p_team_id,
    (stats_result->>'games_played')::integer,
    (stats_result->>'total_goals')::integer,
    (stats_result->>'total_assists')::integer,
    (stats_result->>'total_score')::integer,
    (stats_result->>'avg_points')::decimal,
    (stats_result->>'minutes_played')::integer,
    (stats_result->>'fair_play_cards')::integer
  )
  ON CONFLICT (player_id, season_id, tournament_id, team_id)
  DO UPDATE SET
    games_played = EXCLUDED.games_played,
    total_goals = EXCLUDED.total_goals,
    total_assists = EXCLUDED.total_assists,
    total_score = EXCLUDED.total_score,
    avg_points = EXCLUDED.avg_points,
    minutes_played = EXCLUDED.minutes_played,
    fair_play_cards = EXCLUDED.fair_play_cards,
    last_calculated = NOW();
  
  RETURN stats_result;
END;
$$;

COMMENT ON FUNCTION calculate_player_stats IS 'Calculate and cache player statistics for given filters';
```

---

# Migration 3: User Experience Systems

**File**: `supabase/migrations/20240903_user_experience_systems.sql`

## User Preferences System

### user_preferences - Centralized preferences
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_category TEXT NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_preferences_category_valid CHECK (
    preference_category IN ('ui', 'onboarding', 'notifications', 'privacy', 'gameplay', 'teams', 'analytics')
  ),
  UNIQUE(user_id, preference_category, preference_key)
);

COMMENT ON TABLE user_preferences IS 'User-specific preferences for all application features';
COMMENT ON COLUMN user_preferences.preference_category IS 'Category grouping for preferences (ui, onboarding, etc.)';
COMMENT ON COLUMN user_preferences.preference_key IS 'Specific preference identifier within category';
COMMENT ON COLUMN user_preferences.preference_value IS 'JSON value supporting any preference data structure';
```

## Onboarding System

### onboarding_progress - User onboarding tracking
```sql
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  step_category TEXT NOT NULL DEFAULT 'general',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  step_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT onboarding_progress_category_valid CHECK (
    step_category IN ('general', 'first_game', 'team_setup', 'player_management', 'advanced')
  ),
  UNIQUE(user_id, step_category, step_key)
);

COMMENT ON TABLE onboarding_progress IS 'Tracks user progress through onboarding steps';
COMMENT ON COLUMN onboarding_progress.step_key IS 'Unique identifier for onboarding step';
COMMENT ON COLUMN onboarding_progress.step_category IS 'Grouping for related onboarding steps';
```

### onboarding_content - Dynamic content management
```sql
CREATE TABLE onboarding_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_key TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  description TEXT,
  content_data JSONB DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT onboarding_content_language_valid CHECK (
    language_code IN ('en', 'fi', 'sv', 'de', 'fr', 'es')
  ),
  UNIQUE(step_key, language_code)
);

COMMENT ON TABLE onboarding_content IS 'Dynamic onboarding content with multi-language support';
COMMENT ON COLUMN onboarding_content.content_data IS 'Rich content data (images, videos, interactive elements)';
```

## Smart Detection System

### user_state_cache - State caching for detection
```sql
CREATE TABLE user_state_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL,
  state_value JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  cache_version INTEGER DEFAULT 1,
  
  -- Constraints
  UNIQUE(user_id, state_key)
);

COMMENT ON TABLE user_state_cache IS 'Cached user state for smart detection systems';
COMMENT ON COLUMN user_state_cache.state_key IS 'Unique identifier for cached state type';
COMMENT ON COLUMN user_state_cache.expires_at IS 'Optional expiration time for temporary state';
```

### detection_events - Event tracking
```sql
CREATE TABLE detection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  event_data JSONB NOT NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT detection_events_type_valid CHECK (
    event_type IN ('roster_empty', 'first_game', 'team_created', 'player_added', 'game_completed')
  ),
  CONSTRAINT detection_events_category_valid CHECK (
    event_category IN ('user_action', 'system_detection', 'guidance_shown', 'milestone_reached')
  )
);

COMMENT ON TABLE detection_events IS 'Event log for smart detection and user guidance systems';
```

## User Analytics

### user_analytics - Usage analytics
```sql
CREATE TABLE user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  event_data JSONB NOT NULL,
  session_id TEXT,
  user_agent TEXT,
  ip_address INET, -- Note: Be mindful of privacy laws
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_analytics_event_type_valid CHECK (
    event_type IN ('page_view', 'action_taken', 'feature_used', 'error_occurred', 'performance_metric')
  ),
  CONSTRAINT user_analytics_category_valid CHECK (
    event_category IN ('navigation', 'gameplay', 'team_management', 'player_management', 'settings')
  )
);

COMMENT ON TABLE user_analytics IS 'User behavior analytics for product improvement (privacy-compliant)';
```

## RLS Policies for UX Tables

```sql
-- user_preferences RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- onboarding_progress RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own onboarding progress" ON onboarding_progress
  FOR ALL USING (auth.uid() = user_id);

-- onboarding_content RLS (read-only for users, admin-managed)
ALTER TABLE onboarding_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read active onboarding content" ON onboarding_content
  FOR SELECT USING (is_active = true);

-- user_state_cache RLS
ALTER TABLE user_state_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own state cache" ON user_state_cache
  FOR ALL USING (auth.uid() = user_id);

-- detection_events RLS
ALTER TABLE detection_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own detection events" ON detection_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can log detection events" ON detection_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_analytics RLS
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own analytics" ON user_analytics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can log analytics" ON user_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Performance Indexes for UX Tables

```sql
-- user_preferences indexes
CREATE INDEX idx_user_preferences_category ON user_preferences(user_id, preference_category);
CREATE INDEX idx_user_preferences_updated ON user_preferences(updated_at);

-- onboarding_progress indexes
CREATE INDEX idx_onboarding_progress_category ON onboarding_progress(user_id, step_category);
CREATE INDEX idx_onboarding_progress_completed ON onboarding_progress(user_id, completed);

-- user_state_cache indexes
CREATE INDEX idx_user_state_cache_expires ON user_state_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_user_state_cache_updated ON user_state_cache(user_id, last_updated);

-- detection_events indexes
CREATE INDEX idx_detection_events_type ON detection_events(user_id, event_type);
CREATE INDEX idx_detection_events_session ON detection_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_detection_events_created ON detection_events(created_at);

-- user_analytics indexes
CREATE INDEX idx_user_analytics_type ON user_analytics(user_id, event_type);
CREATE INDEX idx_user_analytics_session ON user_analytics(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_user_analytics_created ON user_analytics(created_at);
```

---

# Migration 4: External Integration & Advanced Analytics

**File**: `supabase/migrations/20240904_external_integration_analytics.sql`

## External Match Integration

### external_teams - External team database
```sql
CREATE TABLE external_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  league TEXT,
  level TEXT,
  region TEXT,
  contact_info JSONB DEFAULT '{}',
  team_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT external_teams_name_not_empty CHECK (length(trim(name)) > 0),
  UNIQUE(user_id, name)
);

COMMENT ON TABLE external_teams IS 'External teams for tracking matches and statistics';
```

### player_stat_adjustments - External game statistics
```sql
CREATE TABLE player_stat_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  external_team_id UUID REFERENCES external_teams(id) ON DELETE SET NULL,
  adjustment_type TEXT NOT NULL,
  adjustment_value INTEGER NOT NULL,
  game_date DATE,
  notes TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT player_stat_adjustments_type_valid CHECK (
    adjustment_type IN ('goals', 'assists', 'games_played', 'minutes_played', 'fair_play_cards', 'yellow_cards', 'red_cards')
  ),
  CONSTRAINT player_stat_adjustments_value_reasonable CHECK (
    adjustment_value >= -1000 AND adjustment_value <= 1000
  )
);

COMMENT ON TABLE player_stat_adjustments IS 'Manual stat adjustments for external games and corrections';
```

## Advanced Analytics Tables

### team_analytics - Team performance analytics
```sql
CREATE TABLE team_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_data JSONB DEFAULT '{}',
  calculation_period DATERANGE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT team_analytics_metric_type_valid CHECK (
    metric_type IN ('win_rate', 'avg_goals_scored', 'avg_goals_conceded', 'player_utilization', 
                   'formation_effectiveness', 'substitution_impact')
  )
);

COMMENT ON TABLE team_analytics IS 'Advanced team performance analytics and insights';
```

### system_metrics - Application performance metrics
```sql
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_data JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT system_metrics_type_valid CHECK (
    metric_type IN ('active_users', 'games_created', 'api_response_time', 'error_rate', 
                   'feature_usage', 'database_performance')
  )
);

COMMENT ON TABLE system_metrics IS 'System-wide performance and usage metrics';
```

## RLS Policies for External Integration

```sql
-- external_teams RLS
ALTER TABLE external_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own external teams" ON external_teams
  FOR ALL USING (auth.uid() = user_id);

-- player_stat_adjustments RLS
ALTER TABLE player_stat_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own player stat adjustments" ON player_stat_adjustments
  FOR ALL USING (auth.uid() = user_id);

-- team_analytics RLS
ALTER TABLE team_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own team analytics" ON team_analytics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create team analytics" ON team_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- system_metrics RLS (admin only)
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage system metrics" ON system_metrics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

## Performance Indexes for Analytics

```sql
-- external_teams indexes
CREATE INDEX idx_external_teams_user ON external_teams(user_id);
CREATE INDEX idx_external_teams_league ON external_teams(user_id, league) WHERE league IS NOT NULL;

-- player_stat_adjustments indexes
CREATE INDEX idx_player_stat_adjustments_player ON player_stat_adjustments(player_id);
CREATE INDEX idx_player_stat_adjustments_external_team ON player_stat_adjustments(external_team_id) WHERE external_team_id IS NOT NULL;
CREATE INDEX idx_player_stat_adjustments_date ON player_stat_adjustments(game_date) WHERE game_date IS NOT NULL;

-- team_analytics indexes
CREATE INDEX idx_team_analytics_team ON team_analytics(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_team_analytics_metric ON team_analytics(user_id, metric_type);
CREATE INDEX idx_team_analytics_period ON team_analytics(calculation_period) WHERE calculation_period IS NOT NULL;

-- system_metrics indexes
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_recorded ON system_metrics(recorded_at);
```

---

# Materialized Views for Performance

## User Activity Summary
```sql
CREATE MATERIALIZED VIEW user_activity_summary AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT g.id) as total_games,
  COUNT(DISTINCT p.id) as total_players,
  COUNT(DISTINCT t.id) as total_teams,
  COUNT(DISTINCT s.id) as total_seasons,
  MAX(g.created_at) as last_game_created,
  MIN(g.created_at) as first_game_created,
  EXTRACT(DAYS FROM NOW() - MIN(g.created_at)) as days_active
FROM auth.users u
LEFT JOIN games g ON u.id = g.user_id
LEFT JOIN players p ON u.id = p.user_id
LEFT JOIN teams t ON u.id = t.user_id
LEFT JOIN seasons s ON u.id = s.user_id
GROUP BY u.id, u.email;

CREATE UNIQUE INDEX idx_user_activity_summary_user_id ON user_activity_summary(user_id);

COMMENT ON MATERIALIZED VIEW user_activity_summary IS 'Summary of user activity across all features';
```

## Team Performance Summary
```sql
CREATE MATERIALIZED VIEW team_performance_summary AS
SELECT 
  t.id as team_id,
  t.user_id,
  t.name as team_name,
  COUNT(DISTINCT g.id) as games_played,
  COUNT(DISTINCT tr.player_id) as roster_size,
  AVG(g.home_score) as avg_goals_scored,
  AVG(g.away_score) as avg_goals_conceded,
  COUNT(DISTINCT g.season_id) as seasons_participated,
  MAX(g.created_at) as last_game,
  (COUNT(DISTINCT g.id) * 100.0 / NULLIF(
    (SELECT COUNT(*) FROM games WHERE user_id = t.user_id), 0
  )) as game_participation_rate
FROM teams t
LEFT JOIN games g ON t.id = g.team_id
LEFT JOIN team_rosters tr ON t.id = tr.team_id
GROUP BY t.id, t.user_id, t.name;

CREATE UNIQUE INDEX idx_team_performance_summary_team_id ON team_performance_summary(team_id);

COMMENT ON MATERIALIZED VIEW team_performance_summary IS 'Performance statistics for all teams';
```

---

# Database Maintenance Functions

## Cleanup Functions
```sql
-- Clean up expired state cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_state_cache 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY team_performance_summary;
END;
$$;
```

## Migration Rollback Procedures

### Rollback Migration 4
```sql
-- Rollback script for Migration 4
DROP MATERIALIZED VIEW IF EXISTS team_performance_summary;
DROP MATERIALIZED VIEW IF EXISTS user_activity_summary;
DROP TABLE IF EXISTS system_metrics;
DROP TABLE IF EXISTS team_analytics;
DROP TABLE IF EXISTS player_stat_adjustments;
DROP TABLE IF EXISTS external_teams;
```

### Rollback Migration 3
```sql  
-- Rollback script for Migration 3
DROP TABLE IF EXISTS user_analytics;
DROP TABLE IF EXISTS detection_events;
DROP TABLE IF EXISTS user_state_cache;
DROP TABLE IF EXISTS onboarding_content;
DROP TABLE IF EXISTS onboarding_progress;
DROP TABLE IF EXISTS user_preferences;
```

### Rollback Migration 2
```sql
-- Rollback script for Migration 2
DROP TABLE IF EXISTS bulk_operations;
DROP TABLE IF EXISTS player_activity;
DROP TABLE IF EXISTS player_stats_cache;

-- Remove added columns from players table
ALTER TABLE players 
DROP COLUMN IF EXISTS photo_url,
DROP COLUMN IF EXISTS position,
DROP COLUMN IF EXISTS birth_date,
DROP COLUMN IF EXISTS height_cm,
DROP COLUMN IF EXISTS weight_kg,
DROP COLUMN IF EXISTS medical_info,
DROP COLUMN IF EXISTS emergency_contact,
DROP COLUMN IF EXISTS player_metadata;
```

### Rollback Migration 1
```sql
-- Rollback script for Migration 1
DROP FUNCTION IF EXISTS replace_team_roster;
DROP TABLE IF EXISTS team_rosters;
DROP TABLE IF EXISTS teams;
ALTER TABLE games DROP COLUMN IF EXISTS team_id;
```

---

# Summary

This comprehensive database schema provides:

- **Team Management**: Complete multi-team support with user isolation
- **Enhanced Player Management**: Rich player profiles with statistics caching
- **User Experience Systems**: Onboarding, preferences, and smart detection
- **External Integration**: External team and stat adjustment support  
- **Advanced Analytics**: Performance tracking and insights
- **Data Integrity**: Comprehensive RLS policies and constraints
- **Performance Optimization**: Strategic indexes and materialized views
- **Maintenance**: Cleanup functions and rollback procedures

The migrations are designed to be:
- **Safe**: Each migration can be applied independently
- **Reversible**: Complete rollback procedures provided
- **Performant**: Minimal downtime with optimized operations
- **Secure**: RLS policies ensure data privacy
- **Scalable**: Designed for growth with proper indexing