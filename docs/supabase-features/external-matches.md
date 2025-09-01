# External Matches (Player Stat Adjustments) - Supabase Version

## Overview
Allows coaches to add statistics from games played outside the MatchOps app (e.g., games played with external teams, tournaments not tracked in the app) with full cloud synchronization. These adjustments are included in player totals, sync across all devices, and can contribute to season/tournament statistics with real-time updates and multi-user collaboration support.

## Data Model (Supabase Tables)

### Core External Statistics Tables
```sql
-- Player stat adjustments with user isolation
CREATE TABLE player_stat_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
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
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure adjustments belong to user's players
  CONSTRAINT valid_user_player CHECK (
    EXISTS (
      SELECT 1 FROM players p 
      WHERE p.id = player_stat_adjustments.player_id 
      AND p.user_id = player_stat_adjustments.user_id
    )
  )
);

-- RLS policies for user isolation
ALTER TABLE player_stat_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own stat adjustments" ON player_stat_adjustments
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_player_stat_adjustments_user_id ON player_stat_adjustments(user_id);
CREATE INDEX idx_player_stat_adjustments_player_id ON player_stat_adjustments(player_id);
CREATE INDEX idx_player_stat_adjustments_season_id ON player_stat_adjustments(season_id) 
WHERE season_id IS NOT NULL;
CREATE INDEX idx_player_stat_adjustments_tournament_id ON player_stat_adjustments(tournament_id) 
WHERE tournament_id IS NOT NULL;
CREATE INDEX idx_player_stat_adjustments_date ON player_stat_adjustments(user_id, game_date DESC);

-- External team tracking for autocomplete
CREATE TABLE external_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  league TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

-- RLS for external teams
ALTER TABLE external_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own external teams" ON external_teams
  FOR ALL USING (auth.uid() = user_id);

-- Index for autocomplete performance
CREATE INDEX idx_external_teams_user_name ON external_teams(user_id, name);
```

### Enhanced Player Stat Adjustment Interface
**File**: `src/types/index.ts`
```typescript
export interface PlayerStatAdjustment {
  id: string;
  userId: string;                      // Owner of the adjustment
  playerId: string;                    // Reference to player in master roster
  seasonId?: string;                   // Optional season association
  teamId?: string;                     // Optional team context
  tournamentId?: string;               // Optional tournament context
  externalTeamName?: string;           // Name of team player represented
  opponentName?: string;               // Opponent name
  scoreFor?: number;                   // Team score for player's team
  scoreAgainst?: number;               // Opponent score
  gameDate?: string;                   // Date in YYYY-MM-DD format
  homeOrAway?: 'home' | 'away' | 'neutral'; // Game location context
  includeInSeasonTournament?: boolean; // Whether to include in season/tournament stats
  gamesPlayedDelta: number;            // Games to add (typically 1)
  goalsDelta: number;                  // Goals scored to add
  assistsDelta: number;                // Assists to add
  note?: string;                       // Optional description/context
  createdBy?: string;                  // User who created (for team management)
  createdAt?: string;                  // Creation timestamp
  updatedAt?: string;                  // Last update timestamp
}

export interface ExternalTeam {
  id: string;
  userId: string;
  name: string;
  league?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

## Enhanced CRUD Operations with Supabase

### React Query Hooks for External Stats
**File**: `src/hooks/useExternalStatsQueries.ts`
```typescript
export const usePlayerAdjustments = (playerId?: string) => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.playerAdjustments(user?.id, playerId),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      let query = supabase
        .from('player_stat_adjustments')
        .select(`
          *,
          player:players(id, name),
          season:seasons(id, name),
          team:teams(id, name),
          tournament:tournaments(id, name)
        `)
        .eq('user_id', user.id)
        .order('game_date', { ascending: false, nullsLast: true })
        .order('created_at', { ascending: false });
      
      if (playerId) {
        query = query.eq('player_id', playerId);
      }
      
      const { data, error } = await query;
      
      if (error) throw new StorageError('supabase', 'getPlayerAdjustments', error);
      return data.map(transformPlayerAdjustmentFromSupabase);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreatePlayerAdjustment = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (adjustmentData: Omit<PlayerStatAdjustment, 'id' | 'userId'>) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const supabaseAdjustment = transformPlayerAdjustmentToSupabase(
        { ...adjustmentData, userId: user.id }, 
        user.id
      );
      
      const { data, error } = await supabase
        .from('player_stat_adjustments')
        .insert([supabaseAdjustment])
        .select(`
          *,
          player:players(id, name),
          season:seasons(id, name),
          team:teams(id, name),
          tournament:tournaments(id, name)
        `)
        .single();
      
      if (error) throw new StorageError('supabase', 'createPlayerAdjustment', error);
      
      // Auto-create external team entry for autocomplete
      if (adjustmentData.externalTeamName) {
        await supabase
          .from('external_teams')
          .upsert([{
            user_id: user.id,
            name: adjustmentData.externalTeamName
          }], { onConflict: 'user_id,name' });
      }
      
      return transformPlayerAdjustmentFromSupabase(data);
    },
    onSuccess: (data) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries(queryKeys.playerAdjustments(user?.id));
      queryClient.invalidateQueries(queryKeys.playerAdjustments(user?.id, data.playerId));
      queryClient.invalidateQueries(queryKeys.playerStats(data.playerId));
      queryClient.invalidateQueries(queryKeys.externalTeams(user?.id));
    },
    // Optimistic update
    onMutate: async (newAdjustment) => {
      if (!user) return;
      
      await queryClient.cancelQueries(queryKeys.playerAdjustments(user.id, newAdjustment.playerId));
      const previousAdjustments = queryClient.getQueryData(
        queryKeys.playerAdjustments(user.id, newAdjustment.playerId)
      );
      
      queryClient.setQueryData(
        queryKeys.playerAdjustments(user.id, newAdjustment.playerId), 
        (old: PlayerStatAdjustment[] = []) => [
          { ...newAdjustment, id: `temp-${Date.now()}`, userId: user.id },
          ...old
        ]
      );
      
      return { previousAdjustments };
    },
    onError: (err, variables, context) => {
      if (context?.previousAdjustments && user) {
        queryClient.setQueryData(
          queryKeys.playerAdjustments(user.id, variables.playerId), 
          context.previousAdjustments
        );
      }
    },
  });
};

export const useUpdatePlayerAdjustment = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PlayerStatAdjustment> }) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const supabaseUpdates = transformPlayerAdjustmentToSupabase(
        { ...updates, updatedAt: new Date().toISOString() }, 
        user.id
      );
      
      const { data, error } = await supabase
        .from('player_stat_adjustments')
        .update(supabaseUpdates)
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user can only update their own
        .select(`
          *,
          player:players(id, name),
          season:seasons(id, name),
          team:teams(id, name),
          tournament:tournaments(id, name)
        `)
        .single();
      
      if (error) throw new StorageError('supabase', 'updatePlayerAdjustment', error);
      return transformPlayerAdjustmentFromSupabase(data);
    },
    onSuccess: (data) => {
      // Invalidate all related caches
      queryClient.invalidateQueries(queryKeys.playerAdjustments(user?.id));
      queryClient.invalidateQueries(queryKeys.playerAdjustments(user?.id, data.playerId));
      queryClient.invalidateQueries(queryKeys.playerStats(data.playerId));
    },
  });
};

export const useDeletePlayerAdjustment = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (adjustmentId: string) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const { error } = await supabase
        .from('player_stat_adjustments')
        .delete()
        .eq('id', adjustmentId)
        .eq('user_id', user.id); // Ensure user can only delete their own
      
      if (error) throw new StorageError('supabase', 'deletePlayerAdjustment', error);
      return adjustmentId;
    },
    onSuccess: () => {
      // Invalidate all player adjustment caches
      queryClient.invalidateQueries(queryKeys.playerAdjustments(user?.id));
      queryClient.invalidateQueries(['playerStats']); // Invalidate all player stats
    },
  });
};
```

### External Teams Autocomplete Support
**File**: `src/hooks/useExternalTeamsQueries.ts`
```typescript
export const useExternalTeams = () => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.externalTeams(user?.id),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const { data, error } = await supabase
        .from('external_teams')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      
      if (error) throw new StorageError('supabase', 'getExternalTeams', error);
      return data.map(transformExternalTeamFromSupabase);
    },
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 minutes (changes infrequently)
  });
};
```

## Real-time Synchronization

### Live Updates for External Stats
**File**: `src/hooks/useExternalStatsRealtimeSync.ts`
```typescript
export const useExternalStatsRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('external_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_stat_adjustments',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate player adjustments cache
          queryClient.invalidateQueries(queryKeys.playerAdjustments(user.id));
          
          // Invalidate specific player's adjustments if known
          if (payload.new?.player_id || payload.old?.player_id) {
            const playerId = payload.new?.player_id || payload.old?.player_id;
            queryClient.invalidateQueries(queryKeys.playerAdjustments(user.id, playerId));
            queryClient.invalidateQueries(queryKeys.playerStats(playerId));
          }
          
          // Show real-time notification
          if (payload.eventType === 'INSERT' && payload.new) {
            toast.success('External stats added and synced across devices');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('External stats updated and synced');
          } else if (payload.eventType === 'DELETE') {
            toast.info('External stats removed and synced');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'external_teams',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate external teams cache for autocomplete
          queryClient.invalidateQueries(queryKeys.externalTeams(user.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);
};
```

## Enhanced Statistics Calculation Integration

### Cloud-aware Player Stats Calculation
**File**: `src/utils/playerStats.ts` (Enhanced)
```typescript
export const calculatePlayerStats = async (
  player: Player,
  userId: string,
  seasons: Season[],
  tournaments: Tournament[],
  teamId?: string  // Optional team filtering
): Promise<PlayerStats> => {
  // Get saved games from Supabase
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('user_id', userId)
    .eq('player_id', player.id) // Games where player participated
    .order('created_at', { ascending: false });
  
  // Get external adjustments from Supabase
  const { data: adjustments } = await supabase
    .from('player_stat_adjustments')
    .select(`
      *,
      season:seasons(id, name),
      tournament:tournaments(id, name)
    `)
    .eq('user_id', userId)
    .eq('player_id', player.id);
  
  // Initialize stats
  let totalGames = 0;
  let totalGoals = 0;
  let totalAssists = 0;
  const performanceBySeason: Record<string, SeasonPerformance> = {};
  const performanceByTournament: Record<string, TournamentPerformance> = {};
  
  // Process regular games first
  if (games) {
    games.forEach(game => {
      // Apply team filter if specified
      if (teamId && game.team_id !== teamId) return;
      
      totalGames += 1;
      totalGoals += game.goals || 0;
      totalAssists += game.assists || 0;
      
      // Apply to season/tournament stats
      if (game.season_id && performanceBySeason[game.season_id]) {
        performanceBySeason[game.season_id].games += 1;
        performanceBySeason[game.season_id].goals += game.goals || 0;
        performanceBySeason[game.season_id].assists += game.assists || 0;
      }
      
      if (game.tournament_id && performanceByTournament[game.tournament_id]) {
        performanceByTournament[game.tournament_id].games += 1;
        performanceByTournament[game.tournament_id].goals += game.goals || 0;
        performanceByTournament[game.tournament_id].assists += game.assists || 0;
      }
    });
  }
  
  // Apply external adjustments with cloud enhancements
  if (adjustments) {
    adjustments.forEach(adj => {
      // Apply team filter to external adjustments
      if (teamId && adj.team_id && adj.team_id !== teamId) return;
      
      // Always apply to total statistics
      totalGames += adj.games_played_delta;
      totalGoals += adj.goals_delta;
      totalAssists += adj.assists_delta;
      
      // Conditionally apply to season/tournament stats
      if (adj.include_in_season_tournament) {
        if (adj.season_id && performanceBySeason[adj.season_id]) {
          performanceBySeason[adj.season_id].games += adj.games_played_delta;
          performanceBySeason[adj.season_id].goals += adj.goals_delta;
          performanceBySeason[adj.season_id].assists += adj.assists_delta;
        }
        
        if (adj.tournament_id && performanceByTournament[adj.tournament_id]) {
          performanceByTournament[adj.tournament_id].games += adj.games_played_delta;
          performanceByTournament[adj.tournament_id].goals += adj.goals_delta;
          performanceByTournament[adj.tournament_id].assists += adj.assists_delta;
        }
      }
    });
  }
  
  // Calculate derived stats
  const goalRatio = totalGames > 0 ? (totalGoals / totalGames) : 0;
  const assistRatio = totalGames > 0 ? (totalAssists / totalGames) : 0;
  
  return {
    player,
    totalGames,
    totalGoals,
    totalAssists,
    goalRatio,
    assistRatio,
    performanceBySeason,
    performanceByTournament,
    externalStatsCount: adjustments?.length || 0, // New cloud feature
    lastExternalUpdate: adjustments?.[0]?.updated_at, // Most recent external stat
  };
};
```

## Enhanced UI Implementation

### Cloud-enhanced External Stats Modal
**File**: `src/components/ExternalStatsModal.tsx`
```typescript
export const ExternalStatsModal = ({ isOpen, onClose, player }: ExternalStatsModalProps) => {
  const { data: adjustments = [], isLoading } = usePlayerAdjustments(player?.id);
  const { data: externalTeams = [] } = useExternalTeams();
  const { data: seasons = [] } = useSeasons();
  const { data: tournaments = [] } = useTournaments();
  const { data: teams = [] } = useTeams();
  
  const createAdjustment = useCreatePlayerAdjustment();
  const updateAdjustment = useUpdatePlayerAdjustment();
  const deleteAdjustment = useDeletePlayerAdjustment();
  
  // Real-time sync hook
  useExternalStatsRealtimeSync();
  
  // Enhanced form state with cloud features
  const [formData, setFormData] = useState<Partial<PlayerStatAdjustment>>({
    playerId: player?.id,
    gamesPlayedDelta: 1,
    goalsDelta: 0,
    assistsDelta: 0,
    gameDate: new Date().toISOString().split('T')[0],
    homeOrAway: 'neutral',
    includeInSeasonTournament: false
  });
  
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showCloudFeatures, setShowCloudFeatures] = useState(true);
  
  const handleSaveAdjustment = async () => {
    try {
      if (formData.id) {
        await updateAdjustment.mutateAsync({ id: formData.id, updates: formData });
        toast.success('External stats updated and synced to cloud');
      } else {
        await createAdjustment.mutateAsync(formData as Omit<PlayerStatAdjustment, 'id' | 'userId'>);
        toast.success('External stats added and synced to cloud');
      }
      
      setFormData({
        playerId: player?.id,
        gamesPlayedDelta: 1,
        goalsDelta: 0,
        assistsDelta: 0,
        gameDate: new Date().toISOString().split('T')[0],
        homeOrAway: 'neutral',
        includeInSeasonTournament: false
      });
    } catch (error) {
      toast.error('Failed to save external stats. Please try again.');
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="External Game Statistics">
      <div className="space-y-6">
        {/* Cloud features callout */}
        {showCloudFeatures && (
          <div className="bg-indigo-900/30 rounded-lg p-4 border border-indigo-500/30">
            <div className="flex items-start gap-3">
              <HiOutlineCloud className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-indigo-200 font-semibold mb-1">Cloud Enhanced Features</h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>✓ Sync external stats across all devices</li>
                  <li>✓ Real-time updates when team members add stats</li>
                  <li>✓ Smart autocomplete from previous external teams</li>
                  <li>✓ Automatic backup and recovery</li>
                </ul>
              </div>
              <button
                onClick={() => setShowCloudFeatures(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* Enhanced form with cloud features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic stats */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Games Played
            </label>
            <input
              type="number"
              min="0"
              value={formData.gamesPlayedDelta}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                gamesPlayedDelta: parseInt(e.target.value) || 0 
              }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Goals
            </label>
            <input
              type="number"
              min="0"
              value={formData.goalsDelta}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                goalsDelta: parseInt(e.target.value) || 0 
              }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Assists
            </label>
            <input
              type="number"
              min="0"
              value={formData.assistsDelta}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                assistsDelta: parseInt(e.target.value) || 0 
              }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Game Date
            </label>
            <input
              type="date"
              value={formData.gameDate}
              onChange={(e) => setFormData(prev => ({ ...prev, gameDate: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        {/* Cloud-enhanced external team input with autocomplete */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            External Team Name
            <span className="text-xs text-slate-400 ml-2">(auto-saved for future use)</span>
          </label>
          <AutocompleteInput
            value={formData.externalTeamName || ''}
            onChange={(value) => setFormData(prev => ({ ...prev, externalTeamName: value }))}
            suggestions={externalTeams.map(team => team.name)}
            placeholder="Enter team name..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        {/* Advanced options toggle */}
        <button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <HiOutlineChevronRight className={`w-4 h-4 transition-transform ${
            showAdvancedOptions ? 'rotate-90' : ''
          }`} />
          Advanced Options
        </button>
        
        {/* Advanced options panel */}
        {showAdvancedOptions && (
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
            {/* Season/Tournament association */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Season (Optional)
                </label>
                <select
                  value={formData.seasonId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, seasonId: e.target.value || undefined }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No season</option>
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>{season.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Tournament (Optional)
                </label>
                <select
                  value={formData.tournamentId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tournamentId: e.target.value || undefined }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No tournament</option>
                  {tournaments.map(tournament => (
                    <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Include in season/tournament stats */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeInSeasonTournament"
                checked={formData.includeInSeasonTournament}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  includeInSeasonTournament: e.target.checked 
                }))}
                className="w-4 h-4 text-indigo-600 bg-slate-700 border border-slate-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="includeInSeasonTournament" className="text-sm text-slate-200">
                Include in season/tournament statistics
              </label>
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-600">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAdjustment}
            disabled={createAdjustment.isPending || updateAdjustment.isPending}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {createAdjustment.isPending || updateAdjustment.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save External Stats'
            )}
          </button>
        </div>
        
        {/* Existing adjustments list with cloud sync status */}
        {adjustments.length > 0 && (
          <div className="border-t border-slate-600 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Previous External Stats</h3>
              <span className="text-xs text-slate-400">
                Synced across all devices
              </span>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {adjustments.map((adjustment) => (
                <ExternalStatItem
                  key={adjustment.id}
                  adjustment={adjustment}
                  onEdit={(adj) => setFormData(adj)}
                  onDelete={(id) => deleteAdjustment.mutate(id)}
                  isDeleting={deleteAdjustment.isPending}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
```

## Migration from localStorage Version

### Data Migration Strategy
**File**: `src/utils/migration/migrateExternalStatsToSupabase.ts`
```typescript
export const migrateExternalStatsToSupabase = async (userId: string) => {
  // 1. Extract localStorage player adjustments
  const adjustmentsJson = localStorage.getItem('soccerPlayerAdjustments');
  if (!adjustmentsJson) return;
  
  try {
    const playerAdjustmentsIndex = JSON.parse(adjustmentsJson);
    const allAdjustments: PlayerStatAdjustment[] = [];
    
    // Flatten player-indexed adjustments
    for (const [playerId, adjustments] of Object.entries(playerAdjustmentsIndex)) {
      if (Array.isArray(adjustments)) {
        allAdjustments.push(
          ...adjustments.map(adj => ({
            ...adj,
            userId,
            playerId,
            createdBy: userId
          }))
        );
      }
    }
    
    if (allAdjustments.length === 0) return;
    
    // 2. Transform to Supabase format
    const supabaseAdjustments = allAdjustments.map(adj => 
      transformPlayerAdjustmentToSupabase(adj, userId)
    );
    
    // 3. Batch insert to Supabase
    const { error } = await supabase
      .from('player_stat_adjustments')
      .insert(supabaseAdjustments);
    
    if (error) throw new StorageError('supabase', 'migrateExternalStats', error);
    
    // 4. Extract and migrate external teams for autocomplete
    const uniqueExternalTeams = new Set<string>();
    allAdjustments.forEach(adj => {
      if (adj.externalTeamName?.trim()) {
        uniqueExternalTeams.add(adj.externalTeamName.trim());
      }
    });
    
    if (uniqueExternalTeams.size > 0) {
      const externalTeamsData = Array.from(uniqueExternalTeams).map(teamName => ({
        user_id: userId,
        name: teamName
      }));
      
      await supabase
        .from('external_teams')
        .insert(externalTeamsData)
        .on('conflict', 'user_id,name')
        .ignore(); // Ignore conflicts for existing teams
    }
    
    // 5. Clean up localStorage
    localStorage.removeItem('soccerPlayerAdjustments');
    
    logger.info(`Migrated ${allAdjustments.length} external stats and ${uniqueExternalTeams.size} external teams to Supabase`);
    
  } catch (error) {
    logger.error('Failed to migrate external stats:', error);
    throw error;
  }
};
```

## Offline Support & Conflict Resolution

### Offline External Stats Management
**File**: `src/utils/offline/externalStatsCache.ts`
```typescript
export const useOfflineExternalStatsSync = () => {
  const [offlineOperations, setOfflineOperations] = useLocalStorage(
    'externalStatsOfflineQueue', 
    []
  );
  
  const addToOfflineQueue = useCallback((operation) => {
    setOfflineOperations(queue => [...queue, {
      id: crypto.randomUUID(),
      operation,
      timestamp: Date.now(),
      retries: 0
    }]);
  }, [setOfflineOperations]);
  
  const processOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || offlineOperations.length === 0) return;
    
    for (const item of offlineOperations) {
      try {
        switch (item.operation.type) {
          case 'CREATE_ADJUSTMENT':
            await supabase
              .from('player_stat_adjustments')
              .insert([item.operation.data]);
            break;
          case 'UPDATE_ADJUSTMENT':
            await supabase
              .from('player_stat_adjustments')
              .update(item.operation.data.updates)
              .eq('id', item.operation.data.id);
            break;
          case 'DELETE_ADJUSTMENT':
            await supabase
              .from('player_stat_adjustments')
              .delete()
              .eq('id', item.operation.data.id);
            break;
        }
        
        // Remove successful operation
        setOfflineOperations(queue => queue.filter(op => op.id !== item.id));
        
      } catch (error) {
        // Handle retry logic with exponential backoff
        if (item.retries < 3) {
          setOfflineOperations(queue => queue.map(op => 
            op.id === item.id 
              ? { ...op, retries: op.retries + 1 }
              : op
          ));
        } else {
          // Max retries exceeded - remove from queue with notification
          setOfflineOperations(queue => queue.filter(op => op.id !== item.id));
          toast.error('Failed to sync external stats after multiple attempts');
        }
      }
    }
  }, [offlineOperations, setOfflineOperations]);
  
  // Process queue when coming online
  useEffect(() => {
    const handleOnline = () => {
      processOfflineQueue();
      toast.success('Syncing external stats changes...');
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [processOfflineQueue]);
  
  return { addToOfflineQueue, processOfflineQueue, queueLength: offlineOperations.length };
};
```

## Benefits of Supabase Migration

### Enhanced Collaboration Features
- **Multi-user Support**: Team managers can add external stats for their players
- **Real-time Sync**: External stats appear instantly across all team devices
- **Audit Trail**: Track who added/modified external statistics
- **Conflict Resolution**: Automatic handling of concurrent external stat modifications

### Improved Data Management
- **User Isolation**: RLS ensures users only see their own external stats
- **Data Integrity**: Foreign key constraints prevent orphaned external stats
- **Advanced Queries**: Complex filtering and aggregation via SQL
- **Backup & Recovery**: Automatic cloud backup with point-in-time recovery

### Performance & User Experience
- **Smart Autocomplete**: External team names auto-suggest from previous entries
- **Optimistic Updates**: Immediate UI feedback with server reconciliation
- **Offline Support**: External stats can be added offline and sync when online
- **Pagination**: Efficient loading of large external stats history

### Analytics & Reporting
- **Cross-season Analysis**: Track external performance across multiple seasons
- **Team Comparison**: Compare performance between internal and external teams
- **Trend Analysis**: Historical external game performance trends
- **Export Capabilities**: Enhanced export with cloud data integration

## Developer Checklist

### Database Setup
- [ ] Player stat adjustments table with proper RLS policies
- [ ] External teams table for autocomplete functionality
- [ ] Foreign key constraints and proper indexing
- [ ] Database migration script from localStorage

### API Integration
- [ ] SupabaseProvider enhanced with external stats operations
- [ ] React Query hooks for CRUD operations with optimistic updates
- [ ] Real-time subscriptions for live external stats updates
- [ ] Offline sync queue for external stats operations

### UI Components
- [ ] Cloud-enhanced external stats modal with real-time sync
- [ ] Smart autocomplete for external team names
- [ ] Proper loading states and error boundaries
- [ ] Multi-device sync status indicators

### UX Features
- [ ] Cross-device external stats synchronization working
- [ ] Real-time collaboration for team external stats
- [ ] Offline external stats entry with sync queue
- [ ] Conflict resolution for concurrent modifications

### Testing
- [ ] Unit tests for external stats hooks and transforms
- [ ] Integration tests for real-time sync scenarios
- [ ] E2E tests for multi-user external stats collaboration
- [ ] Migration testing for localStorage → Supabase transition