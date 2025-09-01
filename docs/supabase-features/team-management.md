# Team Management (Multi‑Team Support) - Supabase Version

## Overview
Manage multiple teams as curated sub-rosters with cloud synchronization. Select a team during game creation to auto-load roster and persist `teamId` on the game. Filter Load/Stats by team across all devices.

## Key Behaviors
- Teams (CRUD) with per-team rosters stored in Supabase with user isolation
- Real-time sync across devices for team changes
- New Game: team dropdown ("No Team" uses master roster); roster auto-loads; team name auto-fills
- Load Game: filter by All / each Team / Legacy with server-side filtering
- Stats: team filter (optional), calculated server-side for performance

## Data Model (Supabase Tables)

### Core Tables
```sql
-- Teams table with RLS policy
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  notes TEXT,
  color TEXT,
  badge TEXT
);

-- Team rosters junction table
CREATE TABLE team_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, player_id)
);

-- Games table enhanced with team_id
-- teamId stored in games.team_id column
-- Existing games table already has team_id support
```

### Row Level Security (RLS)
```sql
-- Teams are user-scoped
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own teams" ON teams
  FOR ALL USING (auth.uid() = user_id);

-- Team rosters inherit user access through teams
ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage rosters for their teams" ON team_rosters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_rosters.team_id 
      AND teams.user_id = auth.uid()
    )
  );
```

## Files & Implementation

### Data Layer
- **Supabase Provider**: `src/lib/storage/supabaseProvider.ts` (enhanced with team operations)
- **Team Hooks**: `src/hooks/useTeamQueries.ts` (React Query + Supabase integration)
- **Real-time**: `src/hooks/useTeamRealtimeSync.ts` (live team updates)
- **Types**: Enhanced `src/types/index.ts` with Supabase team types

### UI Components (same files, enhanced)
- **New Game**: `src/components/NewGameSetupModal.tsx` (cloud-aware team selection)
- **Load**: `src/components/LoadGameModal.tsx` (server-side team filtering)
- **Stats**: `src/components/GameStatsModal.tsx`, `src/components/PlayerStatsView.tsx` (cloud stats)
- **Team Manager**: `src/components/TeamManagerModal.tsx`, `src/components/TeamRosterModal.tsx` (real-time sync)

### Supabase Integration
- **Transform Utils**: `src/utils/transforms/toSupabase.ts`, `src/utils/transforms/fromSupabase.ts`
- **Query Keys**: Enhanced `src/config/queryKeys.ts` with user-scoped team keys
- **Offline Support**: `src/utils/offline/teamCache.ts` (offline-first with sync)

## Architecture Changes vs localStorage Version

### Before (localStorage)
- Teams stored in `'soccerTeamsIndex'` and `'soccerTeamRosters'` localStorage keys
- No user isolation - single device only
- No real-time updates across sessions
- Manual cache invalidation

### Now (Supabase)
- Teams stored in normalized database tables with foreign key relationships
- **User Isolation**: RLS policies ensure users only see their own teams
- **Real-time Sync**: Supabase subscriptions for live updates across devices
- **Optimistic Updates**: Immediate UI feedback with server reconciliation
- **Offline Support**: Local cache with sync queue for offline operations

### Data Flow Enhancement
```
Component → Hook → React Query → Supabase Provider → Database
    ↓                                    ↓
Real-time ← Subscriptions ← Supabase ← Server Changes
```

## Enhanced Team Operations

### Team CRUD with Supabase
```typescript
// Enhanced team hooks with cloud sync
export const useTeams = () => {
  return useQuery({
    queryKey: queryKeys.teams(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      
      if (error) throw new StorageError('supabase', 'getTeams', error);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (team: Omit<Team, 'id'>) => {
      const supabaseTeam = transformTeamToSupabase(team, userId);
      const { data, error } = await supabase
        .from('teams')
        .insert([supabaseTeam])
        .select()
        .single();
      
      if (error) throw new StorageError('supabase', 'createTeam', error);
      return transformTeamFromSupabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.teams(userId));
    },
    // Optimistic update for immediate UI feedback
    onMutate: async (newTeam) => {
      await queryClient.cancelQueries(queryKeys.teams(userId));
      const previousTeams = queryClient.getQueryData(queryKeys.teams(userId));
      
      queryClient.setQueryData(queryKeys.teams(userId), (old: Team[] = []) => [
        ...old,
        { ...newTeam, id: `temp-${Date.now()}` }
      ]);
      
      return { previousTeams };
    },
    onError: (err, variables, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(queryKeys.teams(userId), context.previousTeams);
      }
    },
  });
};
```

### Team Roster Management
```typescript
export const useTeamRoster = (teamId: string) => {
  return useQuery({
    queryKey: queryKeys.teamRoster(teamId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_rosters')
        .select(`
          *,
          player:players(*)
        `)
        .eq('team_id', teamId);
      
      if (error) throw new StorageError('supabase', 'getTeamRoster', error);
      return data.map(tr => transformPlayerFromSupabase(tr.player));
    },
    enabled: !!teamId,
  });
};

export const useUpdateTeamRoster = (teamId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (playerIds: string[]) => {
      // Transaction to replace team roster
      const { error } = await supabase.rpc('replace_team_roster', {
        p_team_id: teamId,
        p_player_ids: playerIds
      });
      
      if (error) throw new StorageError('supabase', 'updateTeamRoster', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.teamRoster(teamId));
      queryClient.invalidateQueries(queryKeys.teams(userId));
    },
  });
};
```

## Real-time Synchronization

### Team Updates Subscription
```typescript
export const useTeamRealtimeSync = () => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel('teams_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Invalidate affected queries
          queryClient.invalidateQueries(queryKeys.teams(userId));
          
          if (payload.eventType === 'DELETE') {
            // Handle team deletion - clear related caches
            queryClient.removeQueries(queryKeys.teamRoster(payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_rosters',
        },
        (payload) => {
          // Invalidate team roster cache
          if (payload.new?.team_id) {
            queryClient.invalidateQueries(queryKeys.teamRoster(payload.new.team_id));
          }
          if (payload.old?.team_id) {
            queryClient.invalidateQueries(queryKeys.teamRoster(payload.old.team_id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
};
```

## Game Integration with Teams

### New Game Flow (Cloud-aware)
1. Team selection dropdown loads from Supabase with caching
2. Available list = full master roster (from cloud)
3. Pre-selected IDs fetched via team roster relationship
4. On Confirm: Game saved with `team_id` foreign key reference

### Enhanced Query Performance
```sql
-- Optimized queries for team-filtered games
CREATE INDEX idx_games_user_team ON games(user_id, team_id) 
WHERE team_id IS NOT NULL;

-- Stats queries with team filtering
SELECT 
  p.name,
  COUNT(g.id) as games_played,
  SUM(ge.goals) as total_goals
FROM players p
JOIN game_players gp ON p.id = gp.player_id  
JOIN games g ON gp.game_id = g.id
LEFT JOIN game_events ge ON ge.game_id = g.id AND ge.player_id = p.id
WHERE g.user_id = $1 
  AND ($2::uuid IS NULL OR g.team_id = $2)  -- Optional team filter
GROUP BY p.id, p.name;
```

## Migration from localStorage Version

### Data Migration Strategy
```typescript
export const migrateTeamsToSupabase = async (userId: string) => {
  // 1. Extract localStorage teams data
  const teamsIndex = localStorage.getItem(TEAMS_INDEX_KEY);
  const teamRosters = localStorage.getItem(TEAM_ROSTERS_KEY);
  
  if (!teamsIndex) return; // No teams to migrate
  
  const teams = JSON.parse(teamsIndex);
  const rosters = JSON.parse(teamRosters || '{}');
  
  // 2. Transform and insert teams
  for (const [localTeamId, team] of Object.entries(teams)) {
    const supabaseTeam = transformTeamToSupabase(team, userId);
    const { data: createdTeam } = await supabase
      .from('teams')
      .insert([supabaseTeam])
      .select()
      .single();
    
    // 3. Migrate team roster relationships
    const roster = rosters[localTeamId] || [];
    const rosterInserts = roster.map(teamPlayer => ({
      team_id: createdTeam.id,
      player_id: teamPlayer.playerId, // Assumes players already migrated
    }));
    
    if (rosterInserts.length > 0) {
      await supabase
        .from('team_rosters')
        .insert(rosterInserts);
    }
  }
  
  // 4. Update games with team references
  const savedGames = localStorage.getItem(SAVED_GAMES_KEY);
  if (savedGames) {
    const games = JSON.parse(savedGames);
    for (const [gameId, gameState] of Object.entries(games)) {
      if (gameState.teamId) {
        // Update game record with new team UUID
        await supabase
          .from('games')
          .update({ team_id: newTeamMapping[gameState.teamId] })
          .eq('id', gameId)
          .eq('user_id', userId);
      }
    }
  }
};
```

## Offline Support & Conflict Resolution

### Offline Team Operations
```typescript
export const useOfflineTeamSync = () => {
  const [offlineQueue, setOfflineQueue] = useLocalStorage('teamOfflineQueue', []);
  
  const addToQueue = useCallback((operation) => {
    setOfflineQueue(queue => [...queue, {
      id: crypto.randomUUID(),
      operation,
      timestamp: Date.now(),
      retry_count: 0
    }]);
  }, [setOfflineQueue]);
  
  const processQueue = useCallback(async () => {
    if (!navigator.onLine || offlineQueue.length === 0) return;
    
    for (const item of offlineQueue) {
      try {
        switch (item.operation.type) {
          case 'CREATE_TEAM':
            await supabase.from('teams').insert(item.operation.data);
            break;
          case 'UPDATE_ROSTER':
            await supabase.rpc('replace_team_roster', item.operation.data);
            break;
          // ... other operations
        }
        
        // Remove successful operation from queue
        setOfflineQueue(queue => queue.filter(q => q.id !== item.id));
      } catch (error) {
        // Increment retry count, remove if max retries exceeded
        if (item.retry_count >= 3) {
          setOfflineQueue(queue => queue.filter(q => q.id !== item.id));
        } else {
          setOfflineQueue(queue => queue.map(q => 
            q.id === item.id ? { ...q, retry_count: q.retry_count + 1 } : q
          ));
        }
      }
    }
  }, [offlineQueue, setOfflineQueue]);
  
  // Process queue when coming back online
  useEffect(() => {
    const handleOnline = () => processQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [processQueue]);
};
```

## Benefits of Supabase Migration

### Performance Improvements
- **Server-side Filtering**: Team-based game/stats queries run on database
- **Indexed Queries**: Optimized database indexes for team operations  
- **Pagination Support**: Large team lists with cursor-based pagination
- **Caching Strategy**: Multi-layer caching (React Query + Supabase + CDN)

### User Experience Enhancements  
- **Multi-device Sync**: Teams available across all user devices
- **Real-time Updates**: Live sync when teams change on other devices
- **Offline Support**: Teams cached locally with sync queue
- **Conflict Resolution**: Automatic handling of concurrent team edits

### Data Integrity & Security
- **User Isolation**: RLS ensures users only access their own teams
- **Referential Integrity**: Foreign key constraints prevent orphaned data
- **Audit Trail**: Built-in created_at/updated_at timestamps
- **Backup & Recovery**: Automated Supabase backups with point-in-time recovery

## Developer Checklist

### Data Layer
- [ ] Teams and team_rosters tables created with proper RLS policies
- [ ] Foreign key constraints between teams, players, and games
- [ ] Database indexes for optimal query performance
- [ ] Migration script for localStorage → Supabase transition

### API Integration
- [ ] SupabaseProvider enhanced with team CRUD operations
- [ ] React Query hooks for teams and team rosters
- [ ] Real-time subscriptions for live team updates  
- [ ] Offline sync queue for team operations

### UI Components  
- [ ] Team selection dropdown with cloud data loading
- [ ] Team manager with optimistic updates and error handling
- [ ] Load/Stats modals with server-side team filtering
- [ ] Proper loading states and error boundaries

### UX Features
- [ ] Multi-device team synchronization working
- [ ] Offline team operations with sync queue
- [ ] Real-time updates across browser tabs
- [ ] Conflict resolution for concurrent edits

### Testing
- [ ] Unit tests for team hooks and data transforms
- [ ] Integration tests for team CRUD operations
- [ ] E2E tests for multi-device team sync scenarios  
- [ ] Offline/online transition testing