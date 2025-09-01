# Seasons & Tournaments – Roster-Decoupled (Supabase Version)

## Overview
Seasons and tournaments are global organizational entities stored in Supabase with user isolation and cloud synchronization. They remain decoupled from roster/team-specific data, maintaining clean separation of concerns in the multi-team architecture while providing real-time sync across devices.

## Architecture Changes

### Decoupled Design (Enhanced for Cloud)
- **Before**: localStorage seasons/tournaments with local-only storage
- **After**: Supabase-backed global entities with user isolation via RLS
- **Benefits**: Multi-device sync, data backup, user isolation, real-time updates

## Supabase Data Schema

### Seasons Table
```sql
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  period_count INTEGER,
  period_duration INTEGER, -- minutes
  start_date DATE,
  end_date DATE,
  game_dates JSONB, -- array of date strings
  archived BOOLEAN DEFAULT FALSE,
  notes TEXT,
  color TEXT,
  badge TEXT,
  age_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique season names per user
  UNIQUE(user_id, name)
);

-- RLS Policy for user isolation
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own seasons" ON seasons
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_seasons_user_id ON seasons(user_id);
CREATE INDEX idx_seasons_archived ON seasons(user_id, archived) WHERE NOT archived;
```

### Tournaments Table
```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL, -- Optional season association
  location TEXT,
  period_count INTEGER,
  period_duration INTEGER, -- minutes
  start_date DATE,
  end_date DATE,
  game_dates JSONB, -- array of date strings
  archived BOOLEAN DEFAULT FALSE,
  notes TEXT,
  color TEXT,
  badge TEXT,
  level TEXT, -- Competition level (Regional, National, etc.)
  age_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique tournament names per user
  UNIQUE(user_id, name)
);

-- RLS Policy for user isolation
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tournaments" ON tournaments
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_tournaments_user_id ON tournaments(user_id);
CREATE INDEX idx_tournaments_season_id ON tournaments(season_id);
CREATE INDEX idx_tournaments_archived ON tournaments(user_id, archived) WHERE NOT archived;
```

### Enhanced Game References
```sql
-- Games table already supports season_id and tournament_id
-- Enhanced with proper foreign key constraints
ALTER TABLE games 
ADD CONSTRAINT fk_games_season_id 
FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL;

ALTER TABLE games 
ADD CONSTRAINT fk_games_tournament_id 
FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL;
```

## Data Types & Transformations

### TypeScript Interfaces (Enhanced)
**File**: `src/types/index.ts`
```typescript
export interface Season {
  id: string;                    // UUID from Supabase
  userId: string;                // Owner identification
  name: string;                  // Display name (unique per user)
  location?: string;             // Venue information
  periodCount?: number;          // Default periods for season games
  periodDuration?: number;       // Default period length (minutes)
  startDate?: string;           // ISO date string
  endDate?: string;             // ISO date string  
  gameDates?: string[];         // Scheduled game dates
  archived?: boolean;           // Hide from active lists
  notes?: string;               // Admin notes
  color?: string;               // Theme color
  badge?: string;               // Visual badge/icon
  ageGroup?: string;            // Age category (U10, U12, etc.)
  createdAt?: string;           // Creation timestamp
  updatedAt?: string;           // Last modification
  // Note: remains decoupled from teams and rosters
}

export interface Tournament {
  id: string;                    // UUID from Supabase
  userId: string;                // Owner identification
  name: string;                  // Display name (unique per user)
  seasonId?: string;             // Optional season association
  location?: string;             // Venue information
  periodCount?: number;          // Default periods for tournament games
  periodDuration?: number;       // Default period length (minutes)
  startDate?: string;           // ISO date string
  endDate?: string;             // ISO date string
  gameDates?: string[];         // Tournament schedule
  archived?: boolean;           // Hide from active lists
  notes?: string;               // Admin notes
  color?: string;               // Theme color
  badge?: string;               // Visual badge/icon
  level?: string;               // Competition level (Regional, National, etc.)
  ageGroup?: string;            // Age category (U10, U12, etc.)
  createdAt?: string;           // Creation timestamp
  updatedAt?: string;           // Last modification
  // Note: remains decoupled from teams and rosters
}
```

### Supabase Transform Functions
**File**: `src/utils/transforms/toSupabase.ts`
```typescript
export interface SupabaseSeason {
  id?: string;
  user_id: string;
  name: string;
  location?: string | null;
  period_count?: number | null;
  period_duration?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  game_dates?: string[] | null;
  archived: boolean;
  notes?: string | null;
  color?: string | null;
  badge?: string | null;
  age_group?: string | null;
}

export function transformSeasonToSupabase(season: Season, userId: string): SupabaseSeason {
  return {
    id: season.id !== `temp-${Date.now()}` ? season.id : undefined,
    user_id: userId,
    name: season.name.trim(),
    location: season.location || null,
    period_count: season.periodCount || null,
    period_duration: season.periodDuration || null,
    start_date: season.startDate || null,
    end_date: season.endDate || null,
    game_dates: season.gameDates || null,
    archived: season.archived || false,
    notes: season.notes || null,
    color: season.color || null,
    badge: season.badge || null,
    age_group: season.ageGroup || null,
  };
}
```

**File**: `src/utils/transforms/fromSupabase.ts`
```typescript
export function transformSeasonFromSupabase(supabaseSeason: SupabaseSeason): Season {
  return {
    id: supabaseSeason.id!,
    userId: supabaseSeason.user_id,
    name: supabaseSeason.name,
    location: supabaseSeason.location || undefined,
    periodCount: supabaseSeason.period_count || undefined,
    periodDuration: supabaseSeason.period_duration || undefined,
    startDate: supabaseSeason.start_date || undefined,
    endDate: supabaseSeason.end_date || undefined,
    gameDates: supabaseSeason.game_dates || undefined,
    archived: supabaseSeason.archived || false,
    notes: supabaseSeason.notes || undefined,
    color: supabaseSeason.color || undefined,
    badge: supabaseSeason.badge || undefined,
    ageGroup: supabaseSeason.age_group || undefined,
    createdAt: supabaseSeason.created_at,
    updatedAt: supabaseSeason.updated_at,
  };
}
```

## Enhanced Supabase Operations

### Seasons Management with Cloud Sync
**File**: `src/hooks/useSeasonQueries.ts`
```typescript
export const useSeasons = () => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.seasons(user?.id),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw new StorageError('supabase', 'getSeasons', error);
      return data.map(transformSeasonFromSupabase);
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes for global entities
  });
};

export const useCreateSeason = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (seasonData: Omit<Season, 'id' | 'userId'>) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const supabaseSeason = transformSeasonToSupabase(
        { ...seasonData, id: crypto.randomUUID(), userId: user.id }, 
        user.id
      );
      
      const { data, error } = await supabase
        .from('seasons')
        .insert([supabaseSeason])
        .select()
        .single();
      
      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new StorageError('supabase', 'createSeason', 
            new Error('A season with this name already exists'));
        }
        throw new StorageError('supabase', 'createSeason', error);
      }
      
      return transformSeasonFromSupabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.seasons(user?.id));
    },
    // Optimistic update for immediate feedback
    onMutate: async (newSeason) => {
      if (!user) return;
      
      await queryClient.cancelQueries(queryKeys.seasons(user.id));
      const previousSeasons = queryClient.getQueryData(queryKeys.seasons(user.id));
      
      queryClient.setQueryData(queryKeys.seasons(user.id), (old: Season[] = []) => [
        ...old,
        { ...newSeason, id: `temp-${Date.now()}`, userId: user.id }
      ]);
      
      return { previousSeasons };
    },
    onError: (err, variables, context) => {
      if (context?.previousSeasons && user) {
        queryClient.setQueryData(queryKeys.seasons(user.id), context.previousSeasons);
      }
    },
  });
};
```

### Tournaments with Season Association
**File**: `src/hooks/useTournamentQueries.ts`
```typescript
export const useTournaments = () => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.tournaments(user?.id),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          season:seasons(id, name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw new StorageError('supabase', 'getTournaments', error);
      return data.map(transformTournamentFromSupabase);
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTournamentsBySeason = (seasonId: string | null) => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.tournamentsBySeason(user?.id, seasonId),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      let query = supabase
        .from('tournaments')
        .select('*')
        .eq('user_id', user.id);
      
      if (seasonId) {
        query = query.eq('season_id', seasonId);
      } else {
        query = query.is('season_id', null);
      }
      
      const { data, error } = await query.order('created_at', { ascending: true });
      
      if (error) throw new StorageError('supabase', 'getTournamentsBySeason', error);
      return data.map(transformTournamentFromSupabase);
    },
    enabled: !!user,
  });
};
```

## Real-time Synchronization

### Seasons/Tournaments Live Updates
**File**: `src/hooks/useSeasonTournamentRealtimeSync.ts`
```typescript
export const useSeasonTournamentRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('seasons_tournaments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seasons',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate seasons cache
          queryClient.invalidateQueries(queryKeys.seasons(user.id));
          
          if (payload.eventType === 'DELETE') {
            // Update tournaments that referenced this season
            queryClient.invalidateQueries(queryKeys.tournaments(user.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate tournaments cache
          queryClient.invalidateQueries(queryKeys.tournaments(user.id));
          
          // Invalidate season-specific tournament queries
          if (payload.new?.season_id) {
            queryClient.invalidateQueries(
              queryKeys.tournamentsBySeason(user.id, payload.new.season_id)
            );
          }
          if (payload.old?.season_id) {
            queryClient.invalidateQueries(
              queryKeys.tournamentsBySeason(user.id, payload.old.season_id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);
};
```

## Enhanced Query Keys
**File**: `src/config/queryKeys.ts`
```typescript
export const queryKeys = {
  // User-scoped seasons and tournaments
  seasons: (userId: string | undefined) => ['seasons', userId] as const,
  tournaments: (userId: string | undefined) => ['tournaments', userId] as const,
  tournamentsBySeason: (userId: string | undefined, seasonId: string | null) => 
    ['tournaments', 'by-season', userId, seasonId] as const,
  
  // Game-related queries with season/tournament filtering
  gamesBySeason: (userId: string | undefined, seasonId: string) => 
    ['games', 'by-season', userId, seasonId] as const,
  gamesByTournament: (userId: string | undefined, tournamentId: string) => 
    ['games', 'by-tournament', userId, tournamentId] as const,
};
```

## Migration from localStorage

### Data Migration Strategy
**File**: `src/utils/migration/migrateSeasonsTournamentsToSupabase.ts`
```typescript
export const migrateSeasonsTournamentsToSupabase = async (userId: string) => {
  // 1. Extract localStorage seasons
  const seasonsJson = localStorage.getItem(SEASONS_LIST_KEY);
  if (seasonsJson) {
    try {
      const seasons: Season[] = JSON.parse(seasonsJson);
      
      // Transform and insert seasons
      const supabaseSeasons = seasons.map(season => 
        transformSeasonToSupabase({ ...season, userId }, userId)
      );
      
      const { data: insertedSeasons, error: seasonsError } = await supabase
        .from('seasons')
        .insert(supabaseSeasons)
        .select();
      
      if (seasonsError) throw new StorageError('supabase', 'migrateSeasons', seasonsError);
      
      // Create ID mapping for tournaments
      const seasonIdMap = new Map();
      seasons.forEach((original, index) => {
        if (insertedSeasons[index]) {
          seasonIdMap.set(original.id, insertedSeasons[index].id);
        }
      });
      
      // 2. Extract localStorage tournaments
      const tournamentsJson = localStorage.getItem(TOURNAMENTS_LIST_KEY);
      if (tournamentsJson) {
        const tournaments: Tournament[] = JSON.parse(tournamentsJson);
        
        // Transform tournaments with updated season references
        const supabaseTournaments = tournaments.map(tournament => {
          const supabaseTournament = transformTournamentToSupabase(
            { ...tournament, userId }, userId
          );
          
          // Update season_id if tournament was associated with a season
          if (tournament.seasonId && seasonIdMap.has(tournament.seasonId)) {
            supabaseTournament.season_id = seasonIdMap.get(tournament.seasonId);
          }
          
          return supabaseTournament;
        });
        
        const { error: tournamentsError } = await supabase
          .from('tournaments')
          .insert(supabaseTournaments);
        
        if (tournamentsError) throw new StorageError('supabase', 'migrateTournaments', tournamentsError);
      }
      
      // 3. Update games with new season/tournament IDs
      await updateGameReferencesAfterMigration(seasonIdMap, tournamentIdMap);
      
    } catch (error) {
      logger.error('Failed to migrate seasons/tournaments:', error);
      throw error;
    }
  }
};

const updateGameReferencesAfterMigration = async (
  seasonIdMap: Map<string, string>,
  tournamentIdMap: Map<string, string>
) => {
  // Update existing games in Supabase with new season/tournament UUIDs
  const { data: games } = await supabase
    .from('games')
    .select('id, season_id, tournament_id')
    .eq('user_id', userId);
  
  if (games) {
    for (const game of games) {
      const updates: any = {};
      
      if (game.season_id && seasonIdMap.has(game.season_id)) {
        updates.season_id = seasonIdMap.get(game.season_id);
      }
      
      if (game.tournament_id && tournamentIdMap.has(game.tournament_id)) {
        updates.tournament_id = tournamentIdMap.get(game.tournament_id);
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('games')
          .update(updates)
          .eq('id', game.id);
      }
    }
  }
};
```

## UI Integration Enhancements

### Season/Tournament Management Modal (Cloud-aware)
**File**: `src/components/SeasonTournamentManagementModal.tsx`
```typescript
export const SeasonTournamentManagementModal = ({ isOpen, onClose }) => {
  const { data: seasons, isLoading: seasonsLoading } = useSeasons();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();
  const createSeason = useCreateSeason();
  const createTournament = useCreateTournament();
  
  // Real-time sync hook
  useSeasonTournamentRealtimeSync();
  
  const handleCreateSeason = async (seasonData: Omit<Season, 'id' | 'userId'>) => {
    try {
      await createSeason.mutateAsync(seasonData);
      toast.success('Season created and synced to cloud');
    } catch (error) {
      if (error.message.includes('already exists')) {
        toast.error('A season with this name already exists');
      } else {
        toast.error('Failed to create season. Check your connection.');
      }
    }
  };
  
  // ... rest of component with cloud-aware error handling
};
```

### Game Settings Integration (Cloud-enhanced)
**File**: `src/components/GameSettingsModal.tsx`
```typescript
export const GameSettingsModal = ({ gameId, isOpen, onClose }) => {
  const { data: seasons = [] } = useSeasons();
  const { data: tournaments = [] } = useTournaments();
  const { data: game } = useGame(gameId);
  
  // Filter tournaments by selected season if desired
  const { data: filteredTournaments = [] } = useTournamentsBySeason(
    game?.seasonId || null
  );
  
  // ... component logic with real-time data
};
```

## Performance Optimizations

### Database Query Optimization
```sql
-- Materialized view for frequently accessed season/tournament stats
CREATE MATERIALIZED VIEW season_tournament_stats AS
SELECT 
  s.id as season_id,
  s.name as season_name,
  s.user_id,
  COUNT(g.id) as games_count,
  COUNT(DISTINCT g.team_id) as teams_count,
  MIN(g.created_at) as first_game,
  MAX(g.created_at) as last_game
FROM seasons s
LEFT JOIN games g ON s.id = g.season_id
GROUP BY s.id, s.name, s.user_id
UNION ALL
SELECT 
  t.id as season_id, -- Use tournament_id in actual implementation
  t.name as season_name, -- Tournament name
  t.user_id,
  COUNT(g.id) as games_count,
  COUNT(DISTINCT g.team_id) as teams_count,
  MIN(g.created_at) as first_game,
  MAX(g.created_at) as last_game
FROM tournaments t
LEFT JOIN games g ON t.id = g.tournament_id
GROUP BY t.id, t.name, t.user_id;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_season_tournament_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY season_tournament_stats;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh trigger (optional, for high-frequency updates)
CREATE OR REPLACE FUNCTION trigger_refresh_stats()
RETURNS trigger AS $$
BEGIN
  -- Schedule background refresh (implement with pg_cron or similar)
  PERFORM refresh_season_tournament_stats();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

### Client-side Caching Strategy
```typescript
// Enhanced caching with longer stale times for global entities
export const useSeasons = () => {
  return useQuery({
    queryKey: queryKeys.seasons(user?.id),
    queryFn: getSeasonsFromSupabase,
    staleTime: 15 * 60 * 1000, // 15 minutes (longer for stable data)
    cacheTime: 30 * 60 * 1000, // 30 minutes in cache
    refetchOnMount: false,      // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

// Prefetch strategy for game creation workflow
export const usePrefetchSeasonsAndTournaments = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  useEffect(() => {
    if (user) {
      // Prefetch both seasons and tournaments when user loads
      queryClient.prefetchQuery(queryKeys.seasons(user.id));
      queryClient.prefetchQuery(queryKeys.tournaments(user.id));
    }
  }, [queryClient, user]);
};
```

## Offline Support

### Seasons/Tournaments Offline Cache
**File**: `src/utils/offline/seasonTournamentCache.ts`
```typescript
export const useOfflineSeasonTournamentSync = () => {
  const [offlineOperations, setOfflineOperations] = useLocalStorage(
    'seasonTournamentOfflineQueue', 
    []
  );
  
  const addToOfflineQueue = useCallback((operation) => {
    setOfflineOperations(queue => [...queue, {
      id: crypto.randomUUID(),
      type: operation.type,
      data: operation.data,
      timestamp: Date.now(),
      retries: 0
    }]);
  }, [setOfflineOperations]);
  
  const processOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || offlineOperations.length === 0) return;
    
    for (const operation of offlineOperations) {
      try {
        switch (operation.type) {
          case 'CREATE_SEASON':
            await supabase.from('seasons').insert([operation.data]);
            break;
          case 'UPDATE_SEASON':
            await supabase
              .from('seasons')
              .update(operation.data.updates)
              .eq('id', operation.data.id);
            break;
          case 'CREATE_TOURNAMENT':
            await supabase.from('tournaments').insert([operation.data]);
            break;
          // ... other operations
        }
        
        // Remove successful operation
        setOfflineOperations(queue => queue.filter(op => op.id !== operation.id));
        
      } catch (error) {
        // Handle retry logic
        if (operation.retries < 3) {
          setOfflineOperations(queue => queue.map(op => 
            op.id === operation.id 
              ? { ...op, retries: op.retries + 1 }
              : op
          ));
        } else {
          // Max retries exceeded - remove from queue
          setOfflineOperations(queue => queue.filter(op => op.id !== operation.id));
        }
      }
    }
  }, [offlineOperations, setOfflineOperations]);
  
  // Process queue when coming online
  useEffect(() => {
    const handleOnline = () => processOfflineQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [processOfflineQueue]);
  
  return { addToOfflineQueue, processOfflineQueue };
};
```

## Benefits of Supabase Migration

### Enhanced Capabilities
- **Multi-device Sync**: Seasons/tournaments available across all devices
- **Real-time Updates**: Live synchronization when seasons/tournaments change
- **Data Backup**: Automatic cloud backup with point-in-time recovery
- **User Isolation**: Complete privacy with RLS policies
- **Referential Integrity**: Foreign key constraints prevent orphaned games
- **Advanced Queries**: Complex filtering and aggregation via SQL

### Improved Performance
- **Server-side Filtering**: Database-level filtering for game lists by season/tournament
- **Indexed Queries**: Optimized database queries with proper indexing
- **Materialized Views**: Pre-computed statistics for dashboard views
- **Efficient Caching**: Multi-layer caching strategy (DB + React Query + local)

### Developer Experience
- **Type Safety**: Full TypeScript support with Supabase generated types
- **Real-time Subscriptions**: Built-in live updates via WebSockets
- **Optimistic Updates**: Immediate UI feedback with server reconciliation
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Testing Strategy

### Unit Tests
- **CRUD Operations**: Create, read, update, delete functionality
- **Data Transforms**: localStorage ↔ Supabase transformation functions
- **Validation**: Name uniqueness, required fields, data integrity
- **Error Handling**: Network errors, constraint violations, auth failures

### Integration Tests  
- **Real-time Sync**: Multi-tab synchronization scenarios
- **Offline Support**: Queue operations and sync on reconnection
- **Migration**: localStorage → Supabase data migration accuracy
- **Game Integration**: Season/tournament selection in game creation

### E2E Tests
- **Multi-device**: Season creation on one device, visibility on another
- **Concurrent Edits**: Multiple users editing seasons simultaneously
- **Network Resilience**: App behavior during connectivity issues
- **Data Consistency**: Verify data integrity across offline/online transitions

## Developer Checklist

### Database Setup
- [ ] Seasons and tournaments tables created with proper schemas
- [ ] RLS policies configured for user isolation
- [ ] Foreign key constraints added to games table
- [ ] Database indexes created for optimal query performance
- [ ] Materialized views for stats (optional, for high-traffic scenarios)

### API Integration
- [ ] SupabaseProvider enhanced with season/tournament operations
- [ ] React Query hooks for CRUD operations with optimistic updates
- [ ] Real-time subscriptions for live data synchronization
- [ ] Transform functions for localStorage ↔ Supabase data conversion

### UI Components
- [ ] Season/Tournament management modals with cloud error handling
- [ ] Game creation/editing with real-time season/tournament lists
- [ ] Loading states and error boundaries for network operations
- [ ] Offline indicators and sync status display

### Data Migration  
- [ ] Migration script from localStorage to Supabase
- [ ] Game reference updates for new season/tournament UUIDs
- [ ] Backup/restore functionality for migration safety
- [ ] Rollback procedures for failed migrations

### Testing & QA
- [ ] Unit tests for all CRUD operations and transforms
- [ ] Integration tests for real-time sync and offline support
- [ ] E2E tests for multi-device synchronization scenarios
- [ ] Performance tests for large season/tournament datasets

### Documentation & Deployment
- [ ] API documentation for new Supabase operations
- [ ] User guide for new cloud features and sync behavior
- [ ] Deployment scripts with database migration steps
- [ ] Monitoring and alerting for cloud operations