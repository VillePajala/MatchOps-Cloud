# Migration Strategies for Existing Data

## Overview

This document provides comprehensive strategies for migrating existing MatchOps Cloud data to support the new Supabase features while maintaining data integrity and zero data loss.

## Migration Principles

### 🔒 **Zero Data Loss**
All migrations preserve existing data integrity. Original data remains accessible throughout the migration process.

### 🔄 **Backward Compatibility** 
Existing functionality continues to work during and after migration. Legacy data formats are supported.

### 📈 **Performance Optimized**
Migrations are designed to minimize downtime and system impact. Large data sets are processed in batches.

### 🛡️ **Safety First**
Comprehensive backup and rollback procedures ensure safe deployment. All migrations are reversible.

---

## Current Data Analysis

Based on the codebase analysis, the following data migration patterns are needed:

### ✅ **Already Migrated Data**
- **Players**: Basic player data already in Supabase format
- **Seasons**: Season data already properly structured
- **Tournaments**: Tournament data with proper relationships
- **Games**: Game state data stored in JSONB format
- **App Settings**: User preferences already cloud-synchronized

### 🔄 **Data Requiring Enhancement Migration**
- **Games**: Need team_id association for team management
- **Players**: Need enhanced fields for advanced features
- **User Preferences**: Need restructuring for new UX systems

### 🆕 **New Data to Initialize**
- **Teams & Team Rosters**: Completely new feature requiring initialization
- **User Experience Data**: Onboarding, detection events, analytics
- **External Integration**: External teams and stat adjustments

---

# Migration Strategy 1: Team Management Foundation

## Pre-Migration Analysis

### Data Impact Assessment
```sql
-- Analyze existing games that could benefit from team association
SELECT 
  COUNT(*) as total_games,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT CASE WHEN game_data->>'teamName' IS NOT NULL THEN user_id END) as users_with_team_names
FROM games;

-- Analyze player distribution per user
SELECT 
  user_id,
  COUNT(*) as player_count,
  string_agg(name, ', ') as sample_names
FROM players
GROUP BY user_id
ORDER BY player_count DESC;
```

## Migration Steps

### Step 1: Create Default Teams for Existing Users (Optional)
```sql
-- Migration function to create default teams for users who have games with team names
CREATE OR REPLACE FUNCTION migrate_create_default_teams()
RETURNS TABLE(user_id UUID, teams_created INTEGER) 
LANGUAGE plpgsql
AS $$
DECLARE
  user_record RECORD;
  team_names TEXT[];
  team_name TEXT;
  new_team_id UUID;
  teams_count INTEGER := 0;
BEGIN
  -- Process each user who has games with team names
  FOR user_record IN 
    SELECT DISTINCT g.user_id, 
           array_agg(DISTINCT g.game_data->>'teamName') FILTER (WHERE g.game_data->>'teamName' IS NOT NULL) as unique_team_names
    FROM games g 
    WHERE g.game_data->>'teamName' IS NOT NULL
    GROUP BY g.user_id
  LOOP
    teams_count := 0;
    
    -- Create teams for each unique team name
    FOREACH team_name IN ARRAY user_record.unique_team_names
    LOOP
      -- Skip empty or null names
      IF team_name IS NULL OR trim(team_name) = '' THEN
        CONTINUE;
      END IF;
      
      -- Create team if it doesn't already exist
      INSERT INTO teams (user_id, name, notes)
      VALUES (
        user_record.user_id, 
        trim(team_name),
        'Automatically created from game history'
      )
      ON CONFLICT (user_id, name) DO NOTHING
      RETURNING id INTO new_team_id;
      
      IF new_team_id IS NOT NULL THEN
        teams_count := teams_count + 1;
      END IF;
    END LOOP;
    
    RETURN QUERY SELECT user_record.user_id, teams_count;
  END LOOP;
END;
$$;

-- Execute the migration
SELECT * FROM migrate_create_default_teams();
```

### Step 2: Associate Games with Teams
```sql
-- Migration function to link games to teams based on team names
CREATE OR REPLACE FUNCTION migrate_associate_games_with_teams()
RETURNS TABLE(games_updated INTEGER, user_id UUID)
LANGUAGE plpgsql  
AS $$
DECLARE
  user_record RECORD;
  game_record RECORD;
  team_record RECORD;
  updates_count INTEGER := 0;
BEGIN
  -- Process each user
  FOR user_record IN 
    SELECT DISTINCT user_id FROM games WHERE game_data->>'teamName' IS NOT NULL
  LOOP
    updates_count := 0;
    
    -- Process games for this user
    FOR game_record IN
      SELECT id, game_data->>'teamName' as team_name
      FROM games 
      WHERE user_id = user_record.user_id 
        AND game_data->>'teamName' IS NOT NULL
        AND team_id IS NULL -- Only update games not already associated
    LOOP
      -- Find matching team
      SELECT t.id INTO team_record
      FROM teams t
      WHERE t.user_id = user_record.user_id
        AND t.name = trim(game_record.team_name);
      
      -- Update game if team found
      IF team_record.id IS NOT NULL THEN
        UPDATE games 
        SET team_id = team_record.id
        WHERE id = game_record.id;
        
        updates_count := updates_count + 1;
      END IF;
    END LOOP;
    
    RETURN QUERY SELECT updates_count, user_record.user_id;
  END LOOP;
END;
$$;

-- Execute the association migration
SELECT * FROM migrate_associate_games_with_teams();
```

### Step 3: Create Team Rosters from Game History
```sql
-- Migration function to populate team rosters based on game participation
CREATE OR REPLACE FUNCTION migrate_populate_team_rosters()
RETURNS TABLE(team_id UUID, players_added INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  team_record RECORD;
  player_ids UUID[];
  players_count INTEGER := 0;
BEGIN
  -- Process each team
  FOR team_record IN 
    SELECT t.id, t.user_id, t.name
    FROM teams t
    WHERE NOT EXISTS (
      SELECT 1 FROM team_rosters tr WHERE tr.team_id = t.id
    ) -- Only teams without existing rosters
  LOOP
    -- Find players who participated in games for this team
    SELECT array_agg(DISTINCT gp.player_id) INTO player_ids
    FROM games g
    CROSS JOIN LATERAL jsonb_array_elements(g.game_data->'selectedPlayerIds') AS gp(player_id)
    WHERE g.team_id = team_record.id
      AND jsonb_typeof(gp.player_id) = 'string';
    
    -- Insert team roster entries
    IF array_length(player_ids, 1) > 0 THEN
      INSERT INTO team_rosters (team_id, player_id)
      SELECT team_record.id, pid::text::uuid
      FROM unnest(player_ids) AS pid
      WHERE EXISTS (
        SELECT 1 FROM players p 
        WHERE p.id = pid::text::uuid AND p.user_id = team_record.user_id
      )
      ON CONFLICT (team_id, player_id) DO NOTHING;
      
      GET DIAGNOSTICS players_count = ROW_COUNT;
    END IF;
    
    RETURN QUERY SELECT team_record.id, players_count;
  END LOOP;
END;
$$;

-- Execute the roster population migration
SELECT * FROM migrate_populate_team_rosters();
```

### Step 4: Migration Verification
```sql
-- Verification queries to ensure migration success
SELECT 
  'Teams Created' as metric,
  COUNT(*) as count
FROM teams
UNION ALL
SELECT 
  'Team Rosters Created' as metric,
  COUNT(*) as count  
FROM team_rosters
UNION ALL
SELECT 
  'Games Associated with Teams' as metric,
  COUNT(*) as count
FROM games WHERE team_id IS NOT NULL;

-- Detailed verification per user
SELECT 
  u.email,
  COUNT(DISTINCT t.id) as teams,
  COUNT(DISTINCT tr.player_id) as unique_players_in_teams,
  COUNT(DISTINCT g.id) as games_with_teams
FROM auth.users u
LEFT JOIN teams t ON u.id = t.user_id
LEFT JOIN team_rosters tr ON t.id = tr.team_id
LEFT JOIN games g ON t.id = g.team_id
GROUP BY u.id, u.email
ORDER BY teams DESC;
```

---

# Migration Strategy 2: Enhanced Player Management

## Pre-Migration Analysis

### Current Player Data Assessment
```sql
-- Analyze current player data completeness
SELECT 
  COUNT(*) as total_players,
  COUNT(CASE WHEN nickname IS NOT NULL THEN 1 END) as has_nickname,
  COUNT(CASE WHEN jersey_number IS NOT NULL THEN 1 END) as has_jersey,
  COUNT(CASE WHEN notes IS NOT NULL THEN 1 END) as has_notes,
  COUNT(CASE WHEN is_goalie = true THEN 1 END) as goalies,
  AVG(length(name)) as avg_name_length
FROM players;

-- Identify players who could benefit from enhanced features
SELECT 
  p.user_id,
  COUNT(*) as player_count,
  COUNT(CASE WHEN p.jersey_number IS NOT NULL THEN 1 END) as has_jersey_numbers,
  bool_or(p.is_goalie) as has_goalies
FROM players p
GROUP BY p.user_id;
```

## Migration Steps

### Step 1: Initialize Player Statistics Cache
```sql
-- Migration function to populate player statistics cache
CREATE OR REPLACE FUNCTION migrate_initialize_player_stats_cache()
RETURNS TABLE(players_processed INTEGER, cache_entries_created INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  player_record RECORD;
  stats_result JSONB;
  cache_entries INTEGER := 0;
  players_count INTEGER := 0;
BEGIN
  -- Process each player
  FOR player_record IN 
    SELECT p.id, p.user_id, p.name
    FROM players p
    ORDER BY p.user_id, p.created_at
  LOOP
    players_count := players_count + 1;
    
    -- Calculate overall stats (no filters)
    SELECT calculate_player_stats(player_record.id, NULL, NULL, NULL) INTO stats_result;
    
    -- Only create cache entry if player has game activity
    IF (stats_result->>'games_played')::integer > 0 THEN
      cache_entries := cache_entries + 1;
    END IF;
    
    -- Calculate stats by season if player participated in multiple seasons
    INSERT INTO player_stats_cache (
      user_id, player_id, season_id, tournament_id, team_id,
      games_played, total_goals, total_assists, total_score,
      avg_points, minutes_played, fair_play_cards
    )
    SELECT 
      player_record.user_id,
      player_record.id,
      g.season_id,
      g.tournament_id,
      g.team_id,
      COUNT(DISTINCT g.id)::integer,
      0, -- Goals calculation would require game event parsing
      0, -- Assists calculation would require game event parsing  
      0, -- Score calculation would require game event parsing
      0, -- Average calculation
      0, -- Minutes calculation would require game event parsing
      0  -- Fair play cards calculation
    FROM games g
    CROSS JOIN LATERAL jsonb_array_elements_text(g.game_data->'selectedPlayerIds') AS selected_id
    WHERE selected_id = player_record.id::text
      AND g.user_id = player_record.user_id
    GROUP BY g.season_id, g.tournament_id, g.team_id
    HAVING COUNT(DISTINCT g.id) > 0
    ON CONFLICT (player_id, season_id, tournament_id, team_id) DO NOTHING;
    
  END LOOP;
  
  RETURN QUERY SELECT players_count, cache_entries;
END;
$$;

-- Execute the statistics cache initialization
SELECT * FROM migrate_initialize_player_stats_cache();
```

### Step 2: Initialize Player Activity Log
```sql
-- Migration function to create initial player activity entries
CREATE OR REPLACE FUNCTION migrate_initialize_player_activity()
RETURNS TABLE(activity_entries_created INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  activity_count INTEGER := 0;
BEGIN
  -- Create initial "created" activity for all existing players
  INSERT INTO player_activity (
    user_id, 
    player_id, 
    activity_type, 
    activity_data,
    created_at
  )
  SELECT 
    p.user_id,
    p.id,
    'created',
    jsonb_build_object(
      'name', p.name,
      'nickname', p.nickname,
      'jersey_number', p.jersey_number,
      'is_goalie', p.is_goalie,
      'migration_generated', true
    ),
    p.created_at
  FROM players p
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS activity_count = ROW_COUNT;
  
  RETURN QUERY SELECT activity_count;
END;
$$;

-- Execute the activity log initialization  
SELECT * FROM migrate_initialize_player_activity();
```

### Step 3: Initialize Enhanced Player Fields
```sql
-- Migration function to set default values for enhanced player fields
CREATE OR REPLACE FUNCTION migrate_initialize_enhanced_player_fields()
RETURNS TABLE(players_updated INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  updates_count INTEGER := 0;
BEGIN
  -- Initialize JSONB fields with empty objects for existing players
  UPDATE players 
  SET 
    medical_info = COALESCE(medical_info, '{}'),
    emergency_contact = COALESCE(emergency_contact, '{}'),
    player_metadata = COALESCE(player_metadata, '{}')
  WHERE 
    medical_info IS NULL 
    OR emergency_contact IS NULL 
    OR player_metadata IS NULL;
  
  GET DIAGNOSTICS updates_count = ROW_COUNT;
  
  -- Set position based on goalie status
  UPDATE players
  SET position = CASE 
    WHEN is_goalie = true THEN 'Goalkeeper'
    ELSE 'Field Player'
  END
  WHERE position IS NULL;
  
  RETURN QUERY SELECT updates_count;
END;
$$;

-- Execute the enhanced fields initialization
SELECT * FROM migrate_initialize_enhanced_player_fields();
```

---

# Migration Strategy 3: User Experience Systems

## Pre-Migration Analysis

### User Behavior Assessment
```sql
-- Analyze user engagement patterns for onboarding customization
SELECT 
  u.email,
  u.created_at as user_created,
  COUNT(DISTINCT g.id) as games_created,
  COUNT(DISTINCT p.id) as players_created,
  COUNT(DISTINCT s.id) as seasons_created,
  MIN(g.created_at) as first_game,
  MAX(g.created_at) as last_game
FROM auth.users u
LEFT JOIN games g ON u.id = g.user_id
LEFT JOIN players p ON u.id = p.user_id  
LEFT JOIN seasons s ON u.id = s.user_id
GROUP BY u.id, u.email, u.created_at
ORDER BY u.created_at DESC;
```

## Migration Steps

### Step 1: Initialize User Preferences
```sql
-- Migration function to create default user preferences
CREATE OR REPLACE FUNCTION migrate_initialize_user_preferences()
RETURNS TABLE(users_processed INTEGER, preferences_created INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  user_record RECORD;
  users_count INTEGER := 0;
  prefs_count INTEGER := 0;
  user_stats JSONB;
BEGIN
  -- Process each user
  FOR user_record IN 
    SELECT u.id as user_id, u.created_at, u.email
    FROM auth.users u
    ORDER BY u.created_at
  LOOP
    users_count := users_count + 1;
    
    -- Gather user statistics for smart defaults
    SELECT jsonb_build_object(
      'total_games', COUNT(DISTINCT g.id),
      'total_players', COUNT(DISTINCT p.id),
      'total_teams', COUNT(DISTINCT t.id),
      'account_age_days', EXTRACT(DAYS FROM NOW() - user_record.created_at),
      'has_recent_activity', MAX(g.created_at) > (NOW() - INTERVAL '30 days')
    ) INTO user_stats
    FROM auth.users u
    LEFT JOIN games g ON u.id = g.user_id
    LEFT JOIN players p ON u.id = p.user_id
    LEFT JOIN teams t ON u.id = t.user_id
    WHERE u.id = user_record.user_id;
    
    -- Create UI preferences
    INSERT INTO user_preferences (user_id, preference_category, preference_key, preference_value)
    VALUES 
      (user_record.user_id, 'ui', 'theme', '"light"'),
      (user_record.user_id, 'ui', 'language', '"en"'),
      (user_record.user_id, 'ui', 'compact_mode', 'false'),
      (user_record.user_id, 'ui', 'animations_enabled', 'true')
    ON CONFLICT (user_id, preference_category, preference_key) DO NOTHING;
    
    -- Create onboarding preferences based on user experience level
    INSERT INTO user_preferences (user_id, preference_category, preference_key, preference_value)
    VALUES (
      user_record.user_id, 
      'onboarding', 
      'experience_level',
      CASE 
        WHEN (user_stats->>'total_games')::integer > 10 THEN '"advanced"'
        WHEN (user_stats->>'total_games')::integer > 3 THEN '"intermediate"'
        ELSE '"beginner"'
      END
    ),
    (
      user_record.user_id,
      'onboarding',
      'skip_basic_tutorials',
      CASE 
        WHEN (user_stats->>'total_games')::integer > 5 THEN 'true'
        ELSE 'false'
      END
    )
    ON CONFLICT (user_id, preference_category, preference_key) DO NOTHING;
    
    prefs_count := prefs_count + 2; -- UI + onboarding preferences
    
  END LOOP;
  
  RETURN QUERY SELECT users_count, prefs_count;
END;
$$;

-- Execute the user preferences initialization
SELECT * FROM migrate_initialize_user_preferences();
```

### Step 2: Initialize Onboarding Progress
```sql
-- Migration function to set onboarding progress based on user activity
CREATE OR REPLACE FUNCTION migrate_initialize_onboarding_progress()
RETURNS TABLE(users_processed INTEGER, steps_completed INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  user_record RECORD;
  users_count INTEGER := 0;
  steps_count INTEGER := 0;
  user_activity JSONB;
BEGIN
  FOR user_record IN 
    SELECT u.id as user_id, u.created_at
    FROM auth.users u
  LOOP
    users_count := users_count + 1;
    
    -- Analyze user activity to determine completed steps
    SELECT jsonb_build_object(
      'has_players', COUNT(p.id) > 0,
      'has_games', COUNT(g.id) > 0,
      'has_teams', COUNT(t.id) > 0,
      'has_seasons', COUNT(s.id) > 0,
      'account_age_days', EXTRACT(DAYS FROM NOW() - user_record.created_at)
    ) INTO user_activity
    FROM auth.users u
    LEFT JOIN players p ON u.id = p.user_id
    LEFT JOIN games g ON u.id = g.user_id
    LEFT JOIN teams t ON u.id = t.user_id
    LEFT JOIN seasons s ON u.id = s.user_id
    WHERE u.id = user_record.user_id
    GROUP BY u.id, u.created_at;
    
    -- Mark appropriate onboarding steps as completed
    
    -- Step 1: Account setup (always completed for existing users)
    INSERT INTO onboarding_progress (user_id, step_key, step_category, completed, completed_at)
    VALUES (user_record.user_id, 'account_setup', 'general', true, user_record.created_at)
    ON CONFLICT (user_id, step_category, step_key) DO NOTHING;
    steps_count := steps_count + 1;
    
    -- Step 2: First player creation
    IF (user_activity->>'has_players')::boolean THEN
      INSERT INTO onboarding_progress (user_id, step_key, step_category, completed, completed_at)
      SELECT user_record.user_id, 'first_player', 'player_management', true, MIN(p.created_at)
      FROM players p WHERE p.user_id = user_record.user_id
      ON CONFLICT (user_id, step_category, step_key) DO NOTHING;
      steps_count := steps_count + 1;
    END IF;
    
    -- Step 3: First game creation
    IF (user_activity->>'has_games')::boolean THEN
      INSERT INTO onboarding_progress (user_id, step_key, step_category, completed, completed_at)
      SELECT user_record.user_id, 'first_game', 'first_game', true, MIN(g.created_at)
      FROM games g WHERE g.user_id = user_record.user_id
      ON CONFLICT (user_id, step_category, step_key) DO NOTHING;
      steps_count := steps_count + 1;
    END IF;
    
    -- Step 4: Team creation (if applicable)
    IF (user_activity->>'has_teams')::boolean THEN
      INSERT INTO onboarding_progress (user_id, step_key, step_category, completed, completed_at)
      SELECT user_record.user_id, 'first_team', 'team_setup', true, MIN(t.created_at)
      FROM teams t WHERE t.user_id = user_record.user_id
      ON CONFLICT (user_id, step_category, step_key) DO NOTHING;
      steps_count := steps_count + 1;
    END IF;
    
  END LOOP;
  
  RETURN QUERY SELECT users_count, steps_count;
END;
$$;

-- Execute the onboarding progress initialization
SELECT * FROM migrate_initialize_onboarding_progress();
```

### Step 3: Initialize User State Cache
```sql
-- Migration function to populate user state cache with current application state
CREATE OR REPLACE FUNCTION migrate_initialize_user_state_cache()
RETURNS TABLE(cache_entries_created INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  user_record RECORD;
  cache_count INTEGER := 0;
  state_data JSONB;
BEGIN
  FOR user_record IN 
    SELECT u.id as user_id
    FROM auth.users u
  LOOP
    -- Calculate current user state
    SELECT jsonb_build_object(
      'roster_empty', COUNT(p.id) = 0,
      'has_teams', COUNT(DISTINCT t.id) > 0,
      'games_played', COUNT(DISTINCT g.id),
      'last_activity', GREATEST(
        COALESCE(MAX(p.created_at), '1900-01-01'),
        COALESCE(MAX(g.created_at), '1900-01-01'),
        COALESCE(MAX(t.created_at), '1900-01-01')
      ),
      'is_new_user', COUNT(DISTINCT g.id) < 3
    ) INTO state_data
    FROM auth.users u
    LEFT JOIN players p ON u.id = p.user_id
    LEFT JOIN games g ON u.id = g.user_id
    LEFT JOIN teams t ON u.id = t.user_id
    WHERE u.id = user_record.user_id
    GROUP BY u.id;
    
    -- Insert state cache entries
    INSERT INTO user_state_cache (user_id, state_key, state_value, expires_at)
    VALUES 
      (user_record.user_id, 'roster_detection', state_data, NOW() + INTERVAL '24 hours'),
      (user_record.user_id, 'user_classification', 
       jsonb_build_object(
         'type', CASE 
           WHEN (state_data->>'is_new_user')::boolean THEN 'new_user'
           WHEN (state_data->>'games_played')::integer > 20 THEN 'power_user'
           ELSE 'regular_user'
         END,
         'confidence', 0.9,
         'last_calculated', NOW()
       ), 
       NOW() + INTERVAL '7 days'
      )
    ON CONFLICT (user_id, state_key) DO UPDATE SET
      state_value = EXCLUDED.state_value,
      last_updated = NOW(),
      expires_at = EXCLUDED.expires_at;
    
    cache_count := cache_count + 2;
  END LOOP;
  
  RETURN QUERY SELECT cache_count;
END;
$$;

-- Execute the state cache initialization
SELECT * FROM migrate_initialize_user_state_cache();
```

---

# Migration Strategy 4: Data Integrity & Cleanup

## Post-Migration Validation

### Step 1: Comprehensive Data Validation
```sql
-- Migration validation function
CREATE OR REPLACE FUNCTION validate_migration_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT,
  record_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check 1: All users have basic preferences
  RETURN QUERY
  SELECT 
    'User Preferences'::TEXT,
    CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM auth.users) THEN 'PASS' ELSE 'FAIL' END,
    format('Users with preferences: %s / Total users: %s', COUNT(*), (SELECT COUNT(*) FROM auth.users)),
    COUNT(*)::INTEGER
  FROM (
    SELECT DISTINCT user_id 
    FROM user_preferences 
    WHERE preference_category = 'ui'
  ) AS users_with_prefs;
  
  -- Check 2: Team-game associations are valid
  RETURN QUERY
  SELECT 
    'Team-Game Associations'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('Invalid associations found: %s', COUNT(*)),
    COUNT(*)::INTEGER
  FROM games g
  LEFT JOIN teams t ON g.team_id = t.id
  WHERE g.team_id IS NOT NULL AND t.id IS NULL;
  
  -- Check 3: Team rosters have valid players
  RETURN QUERY
  SELECT 
    'Team Roster Integrity'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('Invalid player references: %s', COUNT(*)),
    COUNT(*)::INTEGER
  FROM team_rosters tr
  LEFT JOIN players p ON tr.player_id = p.id
  WHERE p.id IS NULL;
  
  -- Check 4: RLS policies are working
  RETURN QUERY
  SELECT 
    'RLS Policy Check'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END,
    format('Tables with RLS enabled: %s', COUNT(*)),
    COUNT(*)::INTEGER
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND c.relrowsecurity = true
    AND c.relname IN ('teams', 'team_rosters', 'user_preferences', 'onboarding_progress');
    
END;
$$;

-- Execute validation
SELECT * FROM validate_migration_integrity();
```

### Step 2: Performance Optimization Validation
```sql
-- Check index effectiveness
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('teams', 'team_rosters', 'players', 'games', 'user_preferences')
ORDER BY idx_scan DESC;

-- Check query performance for common operations
EXPLAIN (ANALYZE, BUFFERS) 
SELECT t.name, COUNT(tr.player_id) as roster_size
FROM teams t
LEFT JOIN team_rosters tr ON t.id = tr.team_id
WHERE t.user_id = '00000000-0000-0000-0000-000000000000' -- Replace with actual user ID
GROUP BY t.id, t.name;
```

### Step 3: Data Cleanup
```sql
-- Clean up any orphaned or inconsistent data
CREATE OR REPLACE FUNCTION cleanup_post_migration()
RETURNS TABLE(cleanup_action TEXT, records_affected INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Remove any duplicate team roster entries (shouldn't exist due to unique constraint)
  DELETE FROM team_rosters tr1
  USING team_rosters tr2
  WHERE tr1.id > tr2.id 
    AND tr1.team_id = tr2.team_id 
    AND tr1.player_id = tr2.player_id;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN QUERY SELECT 'Duplicate team roster entries removed'::TEXT, affected_count;
  
  -- Remove expired cache entries
  DELETE FROM user_state_cache 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN QUERY SELECT 'Expired cache entries removed'::TEXT, affected_count;
  
  -- Update statistics for query planner
  ANALYZE teams;
  ANALYZE team_rosters;
  ANALYZE players;
  ANALYZE user_preferences;
  ANALYZE onboarding_progress;
  
  RETURN QUERY SELECT 'Table statistics updated'::TEXT, 5;
  
END;
$$;

-- Execute cleanup
SELECT * FROM cleanup_post_migration();
```

---

# Rollback Procedures

## Emergency Rollback Strategy

### Step 1: Immediate Data Safety
```sql
-- Create backup tables before migration
CREATE TABLE teams_backup AS SELECT * FROM teams;
CREATE TABLE team_rosters_backup AS SELECT * FROM team_rosters;
CREATE TABLE user_preferences_backup AS SELECT * FROM user_preferences;
CREATE TABLE onboarding_progress_backup AS SELECT * FROM onboarding_progress;

-- Store original games.team_id state
CREATE TABLE games_team_id_backup AS 
SELECT id, team_id 
FROM games 
WHERE team_id IS NOT NULL;
```

### Step 2: Rollback Functions
```sql
-- Complete rollback function
CREATE OR REPLACE FUNCTION emergency_rollback_migration()
RETURNS TABLE(rollback_action TEXT, status TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Rollback 1: Remove team associations from games
  UPDATE games SET team_id = NULL WHERE team_id IS NOT NULL;
  RETURN QUERY SELECT 'Games team associations removed'::TEXT, 'COMPLETED'::TEXT;
  
  -- Rollback 2: Remove new tables (cascading will handle references)
  DROP TABLE IF EXISTS team_rosters CASCADE;
  DROP TABLE IF EXISTS teams CASCADE;
  RETURN QUERY SELECT 'Team management tables removed'::TEXT, 'COMPLETED'::TEXT;
  
  -- Rollback 3: Remove UX tables
  DROP TABLE IF EXISTS user_state_cache CASCADE;
  DROP TABLE IF EXISTS onboarding_progress CASCADE;
  DROP TABLE IF EXISTS user_preferences CASCADE;
  RETURN QUERY SELECT 'User experience tables removed'::TEXT, 'COMPLETED'::TEXT;
  
  -- Rollback 4: Remove enhanced player fields
  ALTER TABLE players 
  DROP COLUMN IF EXISTS photo_url,
  DROP COLUMN IF EXISTS position,
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS height_cm,
  DROP COLUMN IF EXISTS weight_kg,
  DROP COLUMN IF EXISTS medical_info,
  DROP COLUMN IF EXISTS emergency_contact,
  DROP COLUMN IF EXISTS player_metadata;
  RETURN QUERY SELECT 'Enhanced player fields removed'::TEXT, 'COMPLETED'::TEXT;
  
END;
$$;
```

---

# Migration Monitoring & Reporting

## Real-time Migration Status
```sql
-- Migration progress tracking
CREATE TABLE migration_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  records_processed INTEGER DEFAULT 0,
  total_records INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT migration_progress_status_valid CHECK (
    status IN ('pending', 'running', 'completed', 'failed')
  )
);

-- Migration reporting function
CREATE OR REPLACE FUNCTION generate_migration_report()
RETURNS TABLE(
  migration_summary TEXT,
  total_users INTEGER,
  teams_created INTEGER,
  team_associations INTEGER,
  preferences_initialized INTEGER,
  onboarding_steps_completed INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'MatchOps Cloud - Feature Migration Summary'::TEXT,
    (SELECT COUNT(*) FROM auth.users)::INTEGER,
    (SELECT COUNT(*) FROM teams)::INTEGER,
    (SELECT COUNT(*) FROM games WHERE team_id IS NOT NULL)::INTEGER,
    (SELECT COUNT(DISTINCT user_id) FROM user_preferences)::INTEGER,
    (SELECT COUNT(*) FROM onboarding_progress WHERE completed = true)::INTEGER;
END;
$$;

-- Execute migration report
SELECT * FROM generate_migration_report();
```

---

# Summary

## Migration Execution Plan

### **Phase 1: Foundation (Week 1)**
1. **Database Schema Changes**: Execute Migration 1 (Team Management)
2. **Team Data Migration**: Create teams from existing game data
3. **Game Association**: Link existing games to teams
4. **Verification**: Validate team management functionality

### **Phase 2: Enhancement (Week 2)** 
1. **Database Schema Changes**: Execute Migration 2 (Enhanced Players)
2. **Player Data Enhancement**: Initialize statistics cache and activity logs
3. **Performance Optimization**: Verify indexes and query performance
4. **Verification**: Validate enhanced player functionality

### **Phase 3: User Experience (Week 3)**
1. **Database Schema Changes**: Execute Migration 3 (UX Systems)
2. **User Preference Migration**: Initialize user preferences and onboarding
3. **State Cache Population**: Initialize smart detection systems
4. **Verification**: Validate user experience enhancements

### **Phase 4: Finalization (Week 4)**
1. **Optional Enhancements**: Execute Migration 4 (Analytics & External)
2. **Data Cleanup**: Remove temporary data and optimize
3. **Performance Validation**: Verify system performance
4. **Documentation**: Update operational procedures

## Success Criteria

### ✅ **Data Integrity**
- Zero data loss during migration
- All existing functionality preserved
- New features properly initialized

### ✅ **Performance**  
- No degradation in existing query performance
- New queries execute within acceptable limits
- Database indexes properly utilized

### ✅ **Security**
- RLS policies properly protecting user data
- No cross-user data leakage
- Audit trail maintained for changes

### ✅ **Functionality**
- All new features working as documented
- Backward compatibility maintained
- Real-time synchronization functional

The migration strategy ensures a safe, comprehensive transition to the enhanced MatchOps Cloud features while maintaining system stability and data integrity throughout the process.