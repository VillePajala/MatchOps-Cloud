# Master Roster Management - Supabase Version

## Overview
The Cloud-Enhanced Master Roster Management system provides comprehensive CRUD operations for the global player pool with full Supabase integration, real-time synchronization, and multi-device collaboration. Enhanced with advanced search capabilities, player analytics, bulk operations, and team collaboration features while maintaining clean separation from team-specific functionality.

## Enhanced Data Model (Supabase Tables)

### Core Players Management
```sql
-- Enhanced players table with cloud features
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  email TEXT,
  phone TEXT,
  jersey_number TEXT,
  position_primary TEXT,
  position_secondary TEXT,
  date_of_birth DATE,
  height_cm INTEGER,
  weight_kg INTEGER,
  dominant_foot TEXT CHECK (dominant_foot IN ('left', 'right', 'both')),
  notes TEXT,
  is_goalie BOOLEAN DEFAULT FALSE,
  received_fair_play_card BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  player_image_url TEXT, -- Cloud storage for player photos
  emergency_contact JSONB DEFAULT '{}',
  medical_info JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_jersey UNIQUE(user_id, jersey_number) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Player statistics cache for performance
CREATE TABLE player_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  total_games INTEGER DEFAULT 0,
  total_goals INTEGER DEFAULT 0,
  total_assists INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_minutes_played INTEGER DEFAULT 0,
  performance_rating DECIMAL(3,2),
  last_game_date TIMESTAMP WITH TIME ZONE,
  current_season_stats JSONB DEFAULT '{}',
  career_stats JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, player_id)
);

-- Player activity tracking
CREATE TABLE player_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'created', 'updated', 'game_played', 'stat_added'
  activity_data JSONB DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk operations tracking
CREATE TABLE bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'import', 'export', 'bulk_update', 'bulk_delete'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  operation_data JSONB DEFAULT '{}',
  error_log JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own players" ON players
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own player stats" ON player_stats_cache
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own player activity" ON player_activity
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bulk operations" ON bulk_operations
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_user_active ON players(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_players_name_search ON players USING GIN(to_tsvector('english', name || ' ' || COALESCE(nickname, '')));
CREATE INDEX idx_players_jersey_number ON players(user_id, jersey_number) WHERE jersey_number IS NOT NULL;
CREATE INDEX idx_player_stats_cache_player ON player_stats_cache(player_id);
CREATE INDEX idx_player_activity_player_time ON player_activity(player_id, timestamp DESC);
```

### Enhanced Player Interface
**File**: `src/types/index.ts`
```typescript
export interface CloudPlayer {
  id: string;
  userId: string;
  name: string;
  nickname?: string;
  email?: string;
  phone?: string;
  jerseyNumber?: string;
  positionPrimary?: PlayerPosition;
  positionSecondary?: PlayerPosition;
  dateOfBirth?: string;
  heightCm?: number;
  weightKg?: number;
  dominantFoot?: 'left' | 'right' | 'both';
  notes?: string;
  isGoalie?: boolean;
  receivedFairPlayCard?: boolean;
  isActive?: boolean;
  playerImageUrl?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  medicalInfo?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    bloodType?: string;
  };
  preferences?: {
    preferredPosition?: PlayerPosition;
    availableDays?: string[];
    skillLevel?: number;
  };
  // Cached stats
  stats?: {
    totalGames: number;
    totalGoals: number;
    totalAssists: number;
    totalSaves: number;
    performanceRating?: number;
    lastGameDate?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type PlayerPosition = 
  | 'goalkeeper' 
  | 'defender' 
  | 'midfielder' 
  | 'forward'
  | 'center-back'
  | 'fullback'
  | 'wing-back'
  | 'defensive-midfielder'
  | 'attacking-midfielder'
  | 'winger'
  | 'striker';

export interface BulkOperation {
  id: string;
  userId: string;
  operationType: 'import' | 'export' | 'bulk_update' | 'bulk_delete';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  operationData: any;
  errorLog: string[];
  createdAt: string;
  completedAt?: string;
}
```

## Enhanced Data Operations

### Advanced Player Queries
**File**: `src/hooks/useCloudPlayerQueries.ts`
```typescript
export const useCloudMasterRoster = (options?: {
  includeInactive?: boolean;
  search?: string;
  position?: PlayerPosition;
  sortBy?: 'name' | 'jerseyNumber' | 'position' | 'lastPlayed';
  sortDirection?: 'asc' | 'desc';
}) => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.cloudMasterRoster(user?.id, options),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      let query = supabase
        .from('players')
        .select(`
          *,
          stats:player_stats_cache(*)
        `)
        .eq('user_id', user.id);
      
      // Apply filters
      if (!options?.includeInactive) {
        query = query.eq('is_active', true);
      }
      
      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,nickname.ilike.%${options.search}%,jersey_number.ilike.%${options.search}%`);
      }
      
      if (options?.position) {
        query = query.or(`position_primary.eq.${options.position},position_secondary.eq.${options.position}`);
      }
      
      // Apply sorting
      const sortBy = options?.sortBy || 'name';
      const direction = options?.sortDirection || 'asc';
      
      switch (sortBy) {
        case 'name':
          query = query.order('name', { ascending: direction === 'asc' });
          break;
        case 'jerseyNumber':
          query = query.order('jersey_number', { ascending: direction === 'asc', nullsLast: true });
          break;
        case 'position':
          query = query.order('position_primary', { ascending: direction === 'asc', nullsLast: true });
          break;
        case 'lastPlayed':
          query = query.order('updated_at', { ascending: direction === 'asc' });
          break;
      }
      
      const { data, error } = await query;
      
      if (error) throw new StorageError('supabase', 'getCloudMasterRoster', error);
      return data.map(transformCloudPlayerFromSupabase);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCloudPlayer = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (playerData: Omit<CloudPlayer, 'id' | 'userId'>) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      // Validate unique jersey number
      if (playerData.jerseyNumber) {
        const { data: existing } = await supabase
          .from('players')
          .select('id')
          .eq('user_id', user.id)
          .eq('jersey_number', playerData.jerseyNumber)
          .eq('is_active', true)
          .single();
        
        if (existing) {
          throw new ValidationError('Jersey number already exists');
        }
      }
      
      const supabasePlayer = transformCloudPlayerToSupabase(
        { ...playerData, userId: user.id }, 
        user.id
      );
      
      const { data, error } = await supabase
        .from('players')
        .insert([supabasePlayer])
        .select(`
          *,
          stats:player_stats_cache(*)
        `)
        .single();
      
      if (error) {
        if (error.code === '23505' && error.constraint === 'unique_user_jersey') {
          throw new ValidationError('Jersey number already exists');
        }
        throw new StorageError('supabase', 'createCloudPlayer', error);
      }
      
      // Initialize player stats cache
      await supabase
        .from('player_stats_cache')
        .insert([{
          user_id: user.id,
          player_id: data.id,
          total_games: 0,
          total_goals: 0,
          total_assists: 0,
          total_saves: 0,
          total_minutes_played: 0
        }]);
      
      // Track activity
      await supabase
        .from('player_activity')
        .insert([{
          user_id: user.id,
          player_id: data.id,
          activity_type: 'created',
          activity_data: { name: playerData.name },
          performed_by: user.id
        }]);
      
      return transformCloudPlayerFromSupabase(data);
    },
    onSuccess: (data) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries(queryKeys.cloudMasterRoster(user?.id));
      queryClient.invalidateQueries(queryKeys.playerSearch(user?.id));
      
      toast.success(`${data.name} added to cloud roster`);
    },
    // Optimistic update
    onMutate: async (newPlayer) => {
      if (!user) return;
      
      await queryClient.cancelQueries(queryKeys.cloudMasterRoster(user.id));
      const previousPlayers = queryClient.getQueryData(queryKeys.cloudMasterRoster(user.id));
      
      queryClient.setQueryData(queryKeys.cloudMasterRoster(user.id), (old: CloudPlayer[] = []) => [
        ...old,
        { ...newPlayer, id: `temp-${Date.now()}`, userId: user.id }
      ]);
      
      return { previousPlayers };
    },
    onError: (err, variables, context) => {
      if (context?.previousPlayers && user) {
        queryClient.setQueryData(queryKeys.cloudMasterRoster(user.id), context.previousPlayers);
      }
      
      if (err instanceof ValidationError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to add player. Please try again.');
      }
    },
  });
};

export const useUpdateCloudPlayer = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      playerId, 
      updates 
    }: { 
      playerId: string; 
      updates: Partial<CloudPlayer> 
    }) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      // Validate jersey number uniqueness if updating
      if (updates.jerseyNumber) {
        const { data: existing } = await supabase
          .from('players')
          .select('id')
          .eq('user_id', user.id)
          .eq('jersey_number', updates.jerseyNumber)
          .eq('is_active', true)
          .neq('id', playerId)
          .single();
        
        if (existing) {
          throw new ValidationError('Jersey number already exists');
        }
      }
      
      const supabaseUpdates = transformCloudPlayerToSupabase(
        { ...updates, updatedAt: new Date().toISOString() }, 
        user.id
      );
      
      const { data, error } = await supabase
        .from('players')
        .update(supabaseUpdates)
        .eq('id', playerId)
        .eq('user_id', user.id)
        .select(`
          *,
          stats:player_stats_cache(*)
        `)
        .single();
      
      if (error) {
        if (error.code === '23505' && error.constraint === 'unique_user_jersey') {
          throw new ValidationError('Jersey number already exists');
        }
        throw new StorageError('supabase', 'updateCloudPlayer', error);
      }
      
      // Track activity
      await supabase
        .from('player_activity')
        .insert([{
          user_id: user.id,
          player_id: playerId,
          activity_type: 'updated',
          activity_data: updates,
          performed_by: user.id
        }]);
      
      return transformCloudPlayerFromSupabase(data);
    },
    onSuccess: (data) => {
      // Invalidate specific caches
      queryClient.invalidateQueries(queryKeys.cloudMasterRoster(user?.id));
      queryClient.invalidateQueries(queryKeys.cloudPlayer(data.id));
      
      toast.success(`${data.name} updated and synced`);
    },
    onError: (err) => {
      if (err instanceof ValidationError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to update player. Please try again.');
      }
    },
  });
};

export const useCloudGoalkeeperManagement = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async ({ playerId, isGoalie }: { playerId: string; isGoalie: boolean }) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      // If setting as goalie, unset all other goalies first
      if (isGoalie) {
        await supabase
          .from('players')
          .update({ is_goalie: false })
          .eq('user_id', user.id)
          .eq('is_goalie', true)
          .neq('id', playerId);
      }
      
      // Set the target player's goalkeeper status
      const { data, error } = await supabase
        .from('players')
        .update({ 
          is_goalie: isGoalie,
          position_primary: isGoalie ? 'goalkeeper' : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw new StorageError('supabase', 'updateGoalkeeperStatus', error);
      
      // Track activity
      await supabase
        .from('player_activity')
        .insert([{
          user_id: user.id,
          player_id: playerId,
          activity_type: 'updated',
          activity_data: { goalieStatusChanged: isGoalie },
          performed_by: user.id
        }]);
      
      return transformCloudPlayerFromSupabase(data);
    },
    onSuccess: () => {
      // Invalidate all player caches to update goalie status
      queryClient.invalidateQueries(queryKeys.cloudMasterRoster(user?.id));
      toast.success('Goalkeeper status updated and synced');
    },
    onError: () => {
      toast.error('Failed to update goalkeeper status');
    },
  });
};
```

### Bulk Operations Support
**File**: `src/hooks/useBulkPlayerOperations.ts`
```typescript
export const useBulkImportPlayers = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (importData: {
      players: Partial<CloudPlayer>[];
      options: {
        skipDuplicates: boolean;
        updateExisting: boolean;
      };
    }) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      // Create bulk operation record
      const { data: bulkOp, error: bulkError } = await supabase
        .from('bulk_operations')
        .insert([{
          user_id: user.id,
          operation_type: 'import',
          status: 'processing',
          total_items: importData.players.length,
          operation_data: importData.options
        }])
        .select()
        .single();
      
      if (bulkError) throw new StorageError('supabase', 'createBulkOperation', bulkError);
      
      const results = {
        successful: [] as CloudPlayer[],
        failed: [] as { player: Partial<CloudPlayer>; error: string }[],
        updated: [] as CloudPlayer[]
      };
      
      // Process players in batches
      const batchSize = 50;
      for (let i = 0; i < importData.players.length; i += batchSize) {
        const batch = importData.players.slice(i, i + batchSize);
        
        for (const playerData of batch) {
          try {
            // Check for existing player by name or jersey number
            let existingPlayer = null;
            if (playerData.jerseyNumber) {
              const { data } = await supabase
                .from('players')
                .select('*')
                .eq('user_id', user.id)
                .eq('jersey_number', playerData.jerseyNumber)
                .eq('is_active', true)
                .single();
              existingPlayer = data;
            }
            
            if (!existingPlayer && playerData.name) {
              const { data } = await supabase
                .from('players')
                .select('*')
                .eq('user_id', user.id)
                .ilike('name', playerData.name)
                .eq('is_active', true)
                .single();
              existingPlayer = data;
            }
            
            if (existingPlayer) {
              if (importData.options.skipDuplicates) {
                continue;
              } else if (importData.options.updateExisting) {
                // Update existing player
                const supabaseUpdates = transformCloudPlayerToSupabase(
                  { ...playerData, updatedAt: new Date().toISOString() },
                  user.id
                );
                
                const { data, error } = await supabase
                  .from('players')
                  .update(supabaseUpdates)
                  .eq('id', existingPlayer.id)
                  .select()
                  .single();
                
                if (error) throw error;
                results.updated.push(transformCloudPlayerFromSupabase(data));
              } else {
                results.failed.push({
                  player: playerData,
                  error: 'Player already exists'
                });
              }
            } else {
              // Create new player
              const supabasePlayer = transformCloudPlayerToSupabase(
                { ...playerData, userId: user.id },
                user.id
              );
              
              const { data, error } = await supabase
                .from('players')
                .insert([supabasePlayer])
                .select()
                .single();
              
              if (error) throw error;
              
              // Initialize stats cache
              await supabase
                .from('player_stats_cache')
                .insert([{
                  user_id: user.id,
                  player_id: data.id,
                  total_games: 0,
                  total_goals: 0,
                  total_assists: 0
                }]);
              
              results.successful.push(transformCloudPlayerFromSupabase(data));
            }
            
            // Update progress
            await supabase
              .from('bulk_operations')
              .update({ 
                processed_items: results.successful.length + results.updated.length + results.failed.length 
              })
              .eq('id', bulkOp.id);
            
          } catch (error) {
            results.failed.push({
              player: playerData,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
      
      // Complete bulk operation
      await supabase
        .from('bulk_operations')
        .update({
          status: results.failed.length === 0 ? 'completed' : 'completed',
          processed_items: results.successful.length + results.updated.length,
          failed_items: results.failed.length,
          error_log: results.failed.map(f => f.error),
          completed_at: new Date().toISOString()
        })
        .eq('id', bulkOp.id);
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(queryKeys.cloudMasterRoster(user?.id));
      
      toast.success(
        `Import completed: ${results.successful.length} added, ${results.updated.length} updated, ${results.failed.length} failed`
      );
    },
    onError: (error) => {
      toast.error('Bulk import failed. Please try again.');
    },
  });
};

export const useExportPlayers = () => {
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (options: {
      format: 'csv' | 'json' | 'excel';
      includeStats: boolean;
      includeInactive: boolean;
    }) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      // Get players with optional stats
      let query = supabase
        .from('players')
        .select(options.includeStats 
          ? `*, stats:player_stats_cache(*)`
          : '*'
        )
        .eq('user_id', user.id);
      
      if (!options.includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw new StorageError('supabase', 'exportPlayers', error);
      
      const players = data.map(transformCloudPlayerFromSupabase);
      
      // Format data based on requested format
      switch (options.format) {
        case 'csv':
          return generateCSV(players, options.includeStats);
        case 'json':
          return JSON.stringify(players, null, 2);
        case 'excel':
          return generateExcel(players, options.includeStats);
        default:
          throw new Error('Unsupported export format');
      }
    },
    onSuccess: (exportData, variables) => {
      // Create download
      const blob = new Blob([exportData], {
        type: variables.format === 'csv' ? 'text/csv' : 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `players_export_${new Date().toISOString().split('T')[0]}.${variables.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Player data exported successfully');
    },
    onError: () => {
      toast.error('Failed to export player data');
    },
  });
};
```

## Real-time Synchronization

### Advanced Player Sync
**File**: `src/hooks/useCloudPlayerRealtimeSync.ts`
```typescript
export const useCloudPlayerRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('cloud_players_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate player caches
          queryClient.invalidateQueries(queryKeys.cloudMasterRoster(user.id));
          
          if (payload.eventType === 'INSERT' && payload.new) {
            // Show real-time notification for new player
            const player = transformCloudPlayerFromSupabase(payload.new);
            toast.success(`${player.name} added to roster and synced`, {
              id: `player-added-${player.id}`,
              duration: 3000
            });
          } else if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            // Handle specific update notifications
            const newPlayer = transformCloudPlayerFromSupabase(payload.new);
            const oldPlayer = transformCloudPlayerFromSupabase(payload.old);
            
            if (newPlayer.isGoalie !== oldPlayer.isGoalie) {
              toast.info(
                `${newPlayer.name} ${newPlayer.isGoalie ? 'set as' : 'removed from'} goalkeeper`,
                { id: `goalie-change-${newPlayer.id}` }
              );
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Handle player deletion
            const deletedPlayer = transformCloudPlayerFromSupabase(payload.old);
            toast.info(`${deletedPlayer.name} removed from roster`, {
              id: `player-deleted-${deletedPlayer.id}`,
              duration: 3000
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_stats_cache',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate player stats when cache updates
          if (payload.new?.player_id) {
            queryClient.invalidateQueries(queryKeys.cloudPlayer(payload.new.player_id));
            queryClient.invalidateQueries(queryKeys.playerStats(payload.new.player_id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bulk_operations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update bulk operation status in real-time
          if (payload.eventType === 'UPDATE' && payload.new) {
            queryClient.invalidateQueries(queryKeys.bulkOperations(user.id));
            
            const operation = payload.new;
            if (operation.status === 'completed') {
              toast.success(`Bulk ${operation.operation_type} completed`, {
                id: `bulk-op-${operation.id}`
              });
            } else if (operation.status === 'failed') {
              toast.error(`Bulk ${operation.operation_type} failed`, {
                id: `bulk-op-${operation.id}`
              });
            }
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

## Enhanced UI Implementation

### Cloud-Enhanced Roster Settings Modal
**File**: `src/components/CloudRosterSettingsModal.tsx`
```typescript
export const CloudRosterSettingsModal: React.FC<CloudRosterSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: players = [], isLoading } = useCloudMasterRoster();
  const createPlayer = useCreateCloudPlayer();
  const updatePlayer = useUpdateCloudPlayer();
  const deletePlayer = useDeleteCloudPlayer();
  const setGoalkeeper = useCloudGoalkeeperManagement();
  const importPlayers = useBulkImportPlayers();
  const exportPlayers = useExportPlayers();
  
  // Real-time sync
  useCloudPlayerRealtimeSync();
  
  // Enhanced state management
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<PlayerPosition | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'jerseyNumber' | 'position'>('name');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'cards'>('list');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPlayerDetails, setShowPlayerDetails] = useState<string | null>(null);
  
  // Advanced filtering
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesSearch = !searchQuery || 
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.jerseyNumber?.includes(searchQuery);
      
      const matchesPosition = positionFilter === 'all' || 
        player.positionPrimary === positionFilter ||
        player.positionSecondary === positionFilter;
      
      const matchesActive = showInactive || player.isActive;
      
      return matchesSearch && matchesPosition && matchesActive;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'jerseyNumber':
          const aNum = parseInt(a.jerseyNumber || '999');
          const bNum = parseInt(b.jerseyNumber || '999');
          return aNum - bNum;
        case 'position':
          const aPos = a.positionPrimary || 'zzz';
          const bPos = b.positionPrimary || 'zzz';
          return aPos.localeCompare(bPos);
        default:
          return 0;
      }
    });
  }, [players, searchQuery, positionFilter, sortBy, showInactive]);
  
  const handleBulkExport = async (format: 'csv' | 'json' | 'excel') => {
    try {
      await exportPlayers.mutateAsync({
        format,
        includeStats: true,
        includeInactive: showInactive
      });
    } catch (error) {
      toast.error('Export failed. Please try again.');
    }
  };
  
  const handleBulkDelete = async () => {
    if (selectedPlayers.size === 0) return;
    
    const playerNames = filteredPlayers
      .filter(p => selectedPlayers.has(p.id))
      .map(p => p.name);
    
    const confirmed = window.confirm(
      `Delete ${selectedPlayers.size} players: ${playerNames.join(', ')}?\n\nThis will also remove them from all teams and games. This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      for (const playerId of selectedPlayers) {
        await deletePlayer.mutateAsync(playerId);
      }
      setSelectedPlayers(new Set());
      toast.success(`${selectedPlayers.size} players deleted`);
    } catch (error) {
      toast.error('Failed to delete some players');
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cloud Master Roster"
      size="large"
      className="h-full max-h-[95vh]"
    >
      <div className="flex flex-col h-full">
        {/* Enhanced Header with Cloud Features */}
        <div className="flex-shrink-0 border-b border-slate-700/50 pb-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">Master Roster</h2>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <HiOutlineCloud className="w-4 h-4 text-emerald-400" />
                <span>Cloud Synced</span>
                <span className="text-slate-600">•</span>
                <span>{filteredPlayers.length} players</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Bulk actions */}
              {selectedPlayers.size > 0 && (
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-sm text-slate-300">{selectedPlayers.size} selected</span>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                  >
                    Delete Selected
                  </button>
                </div>
              )}
              
              {/* View mode toggle */}
              <div className="flex bg-slate-800 rounded-lg p-1">
                {(['list', 'grid', 'cards'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      viewMode === mode
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {mode === 'list' && <HiOutlineListBullet className="w-4 h-4" />}
                    {mode === 'grid' && <HiOutlineSquares2X2 className="w-4 h-4" />}
                    {mode === 'cards' && <HiOutlineRectangleGroup className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              
              {/* Import/Export */}
              <div className="flex gap-1">
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
                >
                  <HiOutlineArrowUpTray className="w-4 h-4" />
                </button>
                
                <Dropdown
                  trigger={
                    <button className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors">
                      <HiOutlineArrowDownTray className="w-4 h-4" />
                    </button>
                  }
                  items={[
                    { label: 'Export as CSV', onClick: () => handleBulkExport('csv') },
                    { label: 'Export as JSON', onClick: () => handleBulkExport('json') },
                    { label: 'Export as Excel', onClick: () => handleBulkExport('excel') },
                  ]}
                />
              </div>
            </div>
          </div>
          
          {/* Enhanced Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search players, jerseys, positions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    <HiOutlineXMark className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Position Filter */}
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value as PlayerPosition | 'all')}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Positions</option>
              <option value="goalkeeper">Goalkeeper</option>
              <option value="defender">Defender</option>
              <option value="midfielder">Midfielder</option>
              <option value="forward">Forward</option>
            </select>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'jerseyNumber' | 'position')}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="name">Sort by Name</option>
              <option value="jerseyNumber">Sort by Jersey #</option>
              <option value="position">Sort by Position</option>
            </select>
            
            {/* Show inactive toggle */}
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-700 border border-slate-600 rounded focus:ring-indigo-500"
              />
              Show inactive
            </label>
          </div>
        </div>
        
        {/* Players List/Grid */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Loading cloud roster...
              </div>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <HiOutlineUsers className="w-16 h-16 mb-4 text-slate-600" />
              <p className="text-lg font-medium mb-2">No players found</p>
              <p className="text-sm">
                {searchQuery || positionFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Add players to get started'
                }
              </p>
            </div>
          ) : (
            <CloudPlayerList
              players={filteredPlayers}
              viewMode={viewMode}
              selectedPlayers={selectedPlayers}
              onSelectPlayer={(playerId, selected) => {
                setSelectedPlayers(prev => {
                  const newSet = new Set(prev);
                  if (selected) {
                    newSet.add(playerId);
                  } else {
                    newSet.delete(playerId);
                  }
                  return newSet;
                });
              }}
              onEditPlayer={setEditingPlayer}
              onDeletePlayer={(playerId) => {
                const player = filteredPlayers.find(p => p.id === playerId);
                if (player && window.confirm(`Delete ${player.name}? This cannot be undone.`)) {
                  deletePlayer.mutate(playerId);
                }
              }}
              onSetGoalkeeper={(playerId, isGoalie) => {
                setGoalkeeper.mutate({ playerId, isGoalie });
              }}
              onViewDetails={setShowPlayerDetails}
              editingPlayerId={editingPlayer}
              onCancelEdit={() => setEditingPlayer(null)}
              onSaveEdit={(playerId, updates) => {
                updatePlayer.mutate({ playerId, updates });
                setEditingPlayer(null);
              }}
            />
          )}
        </div>
        
        {/* Add Player Section */}
        <div className="flex-shrink-0 border-t border-slate-700/50 pt-4 mt-4">
          <CloudAddPlayerForm
            onAddPlayer={(playerData) => {
              createPlayer.mutate(playerData);
            }}
            isLoading={createPlayer.isPending}
          />
        </div>
      </div>
      
      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImport={(data, options) => {
            importPlayers.mutate({ players: data, options });
          }}
          isImporting={importPlayers.isPending}
        />
      )}
      
      {/* Player Details Modal */}
      {showPlayerDetails && (
        <PlayerDetailsModal
          isOpen={!!showPlayerDetails}
          onClose={() => setShowPlayerDetails(null)}
          playerId={showPlayerDetails}
        />
      )}
    </Modal>
  );
};
```

## Migration from localStorage Version

### Enhanced Data Migration
**File**: `src/utils/migration/migrateRosterToSupabase.ts`
```typescript
export const migrateCloudRosterToSupabase = async (userId: string) => {
  // 1. Extract localStorage master roster
  const rosterJson = localStorage.getItem('soccerMasterRoster');
  if (!rosterJson) return;
  
  try {
    const localPlayers = JSON.parse(rosterJson) as Player[];
    
    if (localPlayers.length === 0) return;
    
    // 2. Transform to enhanced cloud format
    const cloudPlayers = localPlayers.map(player => ({
      user_id: userId,
      name: player.name.trim(),
      nickname: player.nickname?.trim() || null,
      jersey_number: player.jerseyNumber?.trim() || null,
      position_primary: mapLegacyPosition(player.position) || null,
      notes: player.notes?.trim() || null,
      is_goalie: player.isGoalie || false,
      received_fair_play_card: player.receivedFairPlayCard || false,
      is_active: true,
      // Default values for new cloud fields
      email: null,
      phone: null,
      position_secondary: null,
      date_of_birth: null,
      height_cm: null,
      weight_kg: null,
      dominant_foot: null,
      player_image_url: null,
      emergency_contact: {},
      medical_info: {},
      preferences: {}
    }));
    
    // 3. Batch insert to Supabase
    const { data: insertedPlayers, error } = await supabase
      .from('players')
      .insert(cloudPlayers)
      .select();
    
    if (error) throw new StorageError('supabase', 'migrateCloudRoster', error);
    
    // 4. Initialize player stats cache
    const statsCache = insertedPlayers.map(player => ({
      user_id: userId,
      player_id: player.id,
      total_games: 0,
      total_goals: 0,
      total_assists: 0,
      total_saves: 0,
      total_minutes_played: 0,
      current_season_stats: {},
      career_stats: {}
    }));
    
    await supabase
      .from('player_stats_cache')
      .insert(statsCache);
    
    // 5. Track migration activity
    const activities = insertedPlayers.map(player => ({
      user_id: userId,
      player_id: player.id,
      activity_type: 'created',
      activity_data: { migrated: true, originalName: player.name },
      performed_by: userId
    }));
    
    await supabase
      .from('player_activity')
      .insert(activities);
    
    // 6. Clean up localStorage
    localStorage.removeItem('soccerMasterRoster');
    
    logger.info(`Migrated ${insertedPlayers.length} players to cloud roster`);
    return insertedPlayers.length;
    
  } catch (error) {
    logger.error('Failed to migrate cloud roster:', error);
    throw error;
  }
};

const mapLegacyPosition = (position?: string): PlayerPosition | null => {
  if (!position) return null;
  
  const positionMap: Record<string, PlayerPosition> = {
    'GK': 'goalkeeper',
    'DEF': 'defender',
    'MID': 'midfielder',
    'FWD': 'forward',
    'goalkeeper': 'goalkeeper',
    'defender': 'defender',
    'midfielder': 'midfielder',
    'forward': 'forward'
  };
  
  return positionMap[position] || null;
};
```

## Benefits of Supabase Migration

### Enhanced Player Management
- **Rich Player Profiles**: Extended player information with photos, medical info, and emergency contacts
- **Advanced Search & Filtering**: Full-text search with position and status filtering
- **Bulk Operations**: Import/export with CSV, JSON, and Excel support
- **Player Analytics**: Cached statistics and performance tracking
- **Activity Tracking**: Complete audit trail of player changes

### Cloud Collaboration Features
- **Multi-user Access**: Team managers can collaborate on roster management
- **Real-time Sync**: Instant updates across all team devices
- **Conflict Resolution**: Smart handling of concurrent player modifications
- **Permission Management**: Role-based access control for different team members

### Data Intelligence & Analytics
- **Performance Insights**: Player statistics and performance trends
- **Usage Analytics**: Track roster management patterns
- **Predictive Features**: AI-powered player recommendations and insights
- **Export Capabilities**: Advanced reporting and data analysis

### Developer Experience
- **Type Safety**: Comprehensive TypeScript support for all player operations
- **Real-time Subscriptions**: Built-in live updates via WebSockets
- **Optimistic Updates**: Immediate UI feedback with server reconciliation
- **Error Handling**: Robust error handling with user-friendly messages

## Developer Checklist

### Database Setup
- [ ] Enhanced players table with rich profiles and cloud features
- [ ] Player stats cache for performance optimization
- [ ] Player activity tracking for audit trails
- [ ] Bulk operations support with progress tracking
- [ ] Database indexes and constraints for data integrity

### API Integration
- [ ] SupabaseProvider enhanced with advanced player operations
- [ ] React Query hooks for complex player queries and mutations
- [ ] Real-time subscriptions for live roster updates
- [ ] Bulk import/export functionality with progress tracking

### UI Components
- [ ] Cloud-enhanced roster settings modal with advanced features
- [ ] Player search and filtering with real-time results
- [ ] Bulk operations interface with progress indicators
- [ ] Player details modal with rich profile information

### UX Features
- [ ] Multi-device roster synchronization working
- [ ] Real-time collaboration for team roster management
- [ ] Advanced search and filtering capabilities
- [ ] Bulk operations with progress tracking and error handling

### Testing
- [ ] Unit tests for enhanced player hooks and operations
- [ ] Integration tests for real-time sync and collaboration
- [ ] E2E tests for bulk operations and player management workflows
- [ ] Migration testing with comprehensive data validation