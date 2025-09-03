# Team Management - Implementation Plan

## Overview
Add multi-team support to the existing single-roster architecture. This feature extends the current player and game management system to support multiple teams with independent rosters, while maintaining backward compatibility with existing data.

## Prerequisites
- ✅ Existing Supabase players table and player management
- ✅ Current game creation and loading functionality
- ✅ Existing NewGameSetupModal and LoadGameModal components
- ✅ Player statistics system in place

## Database Changes

### 1. Add Teams Table
```sql
-- Add to Supabase SQL editor
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT, -- Hex color for UI identification
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT teams_name_unique_per_user UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Users can manage their own teams" ON teams
  FOR ALL USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_teams_user_active ON teams(user_id, archived) WHERE archived = FALSE;
```

### 2. Add Team Rosters Junction Table
```sql
CREATE TABLE team_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position_in_team TEXT, -- Optional position override for this team
  jersey_number_in_team TEXT, -- Optional jersey override for this team
  is_captain BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(team_id, player_id)
);

-- Enable RLS
ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;

-- Add RLS policy (check through team ownership)
CREATE POLICY "Users can manage rosters for their own teams" ON team_rosters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_rosters.team_id 
      AND teams.user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX idx_team_rosters_team ON team_rosters(team_id);
CREATE INDEX idx_team_rosters_player ON team_rosters(player_id);
```

### 3. Add Team Reference to Games Table
```sql
-- Add team_id column to existing games table
ALTER TABLE games 
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add index for team-based game filtering
CREATE INDEX idx_games_team_id ON games(team_id) WHERE team_id IS NOT NULL;
```

## Implementation Steps

### Step 1: Add Types and Interfaces

**File**: `src/types/index.ts`
```typescript
// Add to existing types
export interface Team {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string; // Hex color like '#3B82F6'
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamRoster {
  id: string;
  teamId: string;
  playerId: string;
  positionInTeam?: string;
  jerseyNumberInTeam?: string;
  isCaptain: boolean;
  joinedAt: string;
  // Include player details for convenience
  player?: Player;
}

export interface TeamWithRoster extends Team {
  roster: TeamRoster[];
  playerCount: number;
}

// Add teamId to existing Game interface (extend it)
export interface GameWithTeam extends Omit<Game, 'teamId'> {
  teamId?: string;
  team?: Team;
}
```

### Step 2: Create Team Data Operations

**New File**: `src/utils/teams.ts`
```typescript
import { supabase } from '../lib/supabase';
import type { Team, TeamRoster, TeamWithRoster } from '../types';
import { StorageError, NetworkError, AuthenticationError } from '../lib/storage/types';

export class TeamManager {
  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AuthenticationError('No authenticated user');
    }
    return user.id;
  }

  // Get all teams for current user
  async getTeams(): Promise<Team[]> {
    try {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new StorageError('supabase', 'getTeams', error as Error);
    }
  }

  // Create new team
  async createTeam(teamData: Omit<Team, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Team> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('teams')
        .insert({
          user_id: userId,
          name: teamData.name.trim(),
          description: teamData.description?.trim() || null,
          color: teamData.color || '#3B82F6',
          archived: teamData.archived || false
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new StorageError('supabase', 'createTeam', new Error('Team name already exists'));
        }
        throw error;
      }

      return this.transformTeamFromSupabase(data);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('supabase', 'createTeam', error as Error);
    }
  }

  // Update existing team
  async updateTeam(teamId: string, updates: Partial<Omit<Team, 'id' | 'userId' | 'createdAt'>>): Promise<Team> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('teams')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return this.transformTeamFromSupabase(data);
    } catch (error) {
      throw new StorageError('supabase', 'updateTeam', error as Error);
    }
  }

  // Get team with its roster
  async getTeamWithRoster(teamId: string): Promise<TeamWithRoster> {
    try {
      const userId = await this.getCurrentUserId();

      // Get team details
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .eq('user_id', userId)
        .single();

      if (teamError) throw teamError;

      // Get team roster with player details
      const { data: roster, error: rosterError } = await supabase
        .from('team_rosters')
        .select(`
          *,
          player:players(*)
        `)
        .eq('team_id', teamId);

      if (rosterError) throw rosterError;

      return {
        ...this.transformTeamFromSupabase(team),
        roster: roster?.map(this.transformTeamRosterFromSupabase) || [],
        playerCount: roster?.length || 0
      };
    } catch (error) {
      throw new StorageError('supabase', 'getTeamWithRoster', error as Error);
    }
  }

  // Add player to team
  async addPlayerToTeam(teamId: string, playerId: string, options?: {
    positionInTeam?: string;
    jerseyNumberInTeam?: string;
    isCaptain?: boolean;
  }): Promise<TeamRoster> {
    try {
      const { data, error } = await supabase
        .from('team_rosters')
        .insert({
          team_id: teamId,
          player_id: playerId,
          position_in_team: options?.positionInTeam || null,
          jersey_number_in_team: options?.jerseyNumberInTeam || null,
          is_captain: options?.isCaptain || false
        })
        .select(`
          *,
          player:players(*)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new StorageError('supabase', 'addPlayerToTeam', new Error('Player already in team'));
        }
        throw error;
      }

      return this.transformTeamRosterFromSupabase(data);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('supabase', 'addPlayerToTeam', error as Error);
    }
  }

  // Remove player from team
  async removePlayerFromTeam(teamId: string, playerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('team_rosters')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId);

      if (error) throw error;
    } catch (error) {
      throw new StorageError('supabase', 'removePlayerFromTeam', error as Error);
    }
  }

  // Archive team (soft delete)
  async archiveTeam(teamId: string): Promise<void> {
    try {
      const { error } = await this.updateTeam(teamId, { archived: true });
      if (error) throw error;
    } catch (error) {
      throw new StorageError('supabase', 'archiveTeam', error as Error);
    }
  }

  // Transform Supabase data to app types
  private transformTeamFromSupabase(data: any): Team {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      color: data.color,
      archived: data.archived,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private transformTeamRosterFromSupabase(data: any): TeamRoster {
    return {
      id: data.id,
      teamId: data.team_id,
      playerId: data.player_id,
      positionInTeam: data.position_in_team,
      jerseyNumberInTeam: data.jersey_number_in_team,
      isCaptain: data.is_captain,
      joinedAt: data.joined_at,
      player: data.player ? {
        id: data.player.id,
        name: data.player.name,
        nickname: data.player.nickname,
        jerseyNumber: data.player.jersey_number,
        notes: data.player.notes,
        isGoalie: data.player.is_goalie,
        receivedFairPlayCard: data.player.received_fair_play_card,
        createdAt: data.player.created_at,
        updatedAt: data.player.updated_at
      } : undefined
    };
  }
}

// Export singleton instance
export const teamManager = new TeamManager();
```

### Step 3: Create Team Management Hooks

**New File**: `src/hooks/useTeamData.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamManager } from '../utils/teams';
import type { Team, TeamWithRoster } from '../types';
import { useAuth } from '../context/AuthContext';

export const useTeams = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teams', user?.id],
    queryFn: () => teamManager.getTeams(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTeamWithRoster = (teamId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team', teamId, 'roster'],
    queryFn: () => teamManager.getTeamWithRoster(teamId),
    enabled: !!user && !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: teamManager.createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', user?.id] });
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ teamId, updates }: { teamId: string; updates: Partial<Team> }) =>
      teamManager.updateTeam(teamId, updates),
    onSuccess: (updatedTeam) => {
      queryClient.invalidateQueries({ queryKey: ['teams', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['team', updatedTeam.id, 'roster'] });
    },
  });
};

export const useAddPlayerToTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, playerId, options }: {
      teamId: string;
      playerId: string;
      options?: { positionInTeam?: string; jerseyNumberInTeam?: string; isCaptain?: boolean };
    }) => teamManager.addPlayerToTeam(teamId, playerId, options),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'roster'] });
    },
  });
};

export const useRemovePlayerFromTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, playerId }: { teamId: string; playerId: string }) =>
      teamManager.removePlayerFromTeam(teamId, playerId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'roster'] });
    },
  });
};
```

### Step 4: Create Team Management UI Components

**New File**: `src/components/TeamManagerModal.tsx`
```typescript
import React, { useState } from 'react';
import { useTeams, useCreateTeam, useUpdateTeam } from '../hooks/useTeamData';
import type { Team } from '../types';
import { HiPlus, HiPencil, HiTrash, HiUsers } from 'react-icons/hi2';

interface TeamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditTeam: (team: Team) => void;
}

export const TeamManagerModal: React.FC<TeamManagerModalProps> = ({
  isOpen,
  onClose,
  onEditTeam,
}) => {
  const { data: teams = [], isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();

  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      await createTeam.mutateAsync({
        name: newTeamName.trim(),
        archived: false
      });
      setNewTeamName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create team:', error);
      alert('Failed to create team. Please try again.');
    }
  };

  const handleArchiveTeam = async (team: Team) => {
    if (!window.confirm(`Archive team "${team.name}"? This will hide it from your teams list but preserve all data.`)) {
      return;
    }

    try {
      await updateTeam.mutateAsync({
        teamId: team.id,
        updates: { archived: true }
      });
    } catch (error) {
      console.error('Failed to archive team:', error);
      alert('Failed to archive team. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Team Manager</h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage your teams and assign players to each team
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="text-center text-slate-400 py-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading teams...
            </div>
          ) : (
            <>
              {/* Teams List */}
              <div className="space-y-3">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: team.color || '#3B82F6' }}
                      />
                      <div>
                        <h3 className="font-medium text-white">{team.name}</h3>
                        {team.description && (
                          <p className="text-sm text-slate-400">{team.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditTeam(team)}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-600 rounded-lg transition-colors"
                        title="Edit team roster"
                      >
                        <HiUsers className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Implement team editing
                          alert('Team editing coming soon!');
                        }}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-600 rounded-lg transition-colors"
                        title="Edit team details"
                      >
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchiveTeam(team)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded-lg transition-colors"
                        title="Archive team"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {teams.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    <HiUsers className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p>No teams yet</p>
                    <p className="text-sm">Create your first team to get started</p>
                  </div>
                )}
              </div>

              {/* Add New Team */}
              {isCreating ? (
                <form onSubmit={handleCreateTeam} className="mt-4 p-4 bg-slate-700/30 rounded-lg">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Team name"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setNewTeamName('');
                      }}
                      className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newTeamName.trim() || createTeam.isPending}
                      className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createTeam.isPending ? 'Creating...' : 'Create Team'}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="mt-4 w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-600 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors"
                >
                  <HiPlus className="w-5 h-5" />
                  Add New Team
                </button>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Step 5: Enhance New Game Setup with Team Selection

**File**: `src/components/NewGameSetupModal.tsx` (modifications)
```typescript
// Add imports
import { useTeams } from '../hooks/useTeamData';

// In the component, add team selection:
export const NewGameSetupModal = ({ isOpen, onClose, onCreateGame }) => {
  const { data: teams = [] } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Add team selection to form
  return (
    <div className="...">
      {/* Existing form fields */}
      
      {/* Team Selection */}
      {teams.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Team (Optional)
          </label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No Team (Use Master Roster)</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Selecting a team will auto-load its roster for this game
          </p>
        </div>
      )}

      {/* Pass teamId to game creation */}
      <button
        onClick={() => {
          onCreateGame({
            ...gameSettings,
            teamId: selectedTeamId || undefined
          });
        }}
        className="..."
      >
        Create Game
      </button>
    </div>
  );
};
```

### Step 6: Enhance Load Game Modal with Team Filtering

**File**: `src/components/LoadGameModal.tsx` (modifications)
```typescript
// Add team filtering to load game modal
import { useTeams } from '../hooks/useTeamData';

export const LoadGameModal = ({ isOpen, onClose, onLoadGame }) => {
  const { data: teams = [] } = useTeams();
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Filter games by team
  const filteredGames = useMemo(() => {
    if (teamFilter === 'all') return savedGames;
    if (teamFilter === 'none') return savedGames.filter(game => !game.teamId);
    return savedGames.filter(game => game.teamId === teamFilter);
  }, [savedGames, teamFilter]);

  return (
    <div className="...">
      {/* Team filter dropdown */}
      {teams.length > 0 && (
        <div className="mb-4">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
          >
            <option value="all">All Games</option>
            <option value="none">No Team Games</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} Games
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Display filtered games */}
      {filteredGames.map((game) => (
        <div key={game.id} className="...">
          {/* Game info with team badge */}
          {game.teamId && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-indigo-600/20 text-indigo-300">
              {teams.find(t => t.id === game.teamId)?.name || 'Unknown Team'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
```

## Testing Strategy

### Unit Tests
1. Test team CRUD operations in `utils/teams.ts`
2. Test React Query hooks for data fetching and mutations
3. Test team roster management functions
4. Test team selection in game creation

### Integration Tests
1. Test team creation and player assignment workflow
2. Verify game creation with team selection
3. Test game loading with team filtering
4. Confirm team data persistence across sessions

### E2E Tests
1. Complete team management workflow
2. Create game with team roster
3. Load games filtered by team
4. Team roster modification and game impact

## Integration Points

### With Existing Features
- **Player Management**: Teams reference existing players table
- **Game Creation**: Games can now be associated with teams
- **Game Loading**: Games can be filtered by team
- **Statistics**: Can be filtered by team context

### With Future Features
- **Smart Roster Detection**: Can detect team-specific states
- **Advanced Statistics**: Team performance analytics
- **Tournament Management**: Teams can participate in tournaments

## Benefits

### For Users
- **Better Organization**: Separate rosters for different teams/leagues
- **Contextual Games**: Games are associated with specific teams
- **Flexible Roster Management**: Same player can be on multiple teams
- **No Data Loss**: Existing games and players remain functional

### For Developers
- **Backward Compatibility**: Existing data continues to work
- **Extensible Architecture**: Foundation for advanced team features
- **Clean Separation**: Team logic is isolated and modular
- **Type Safety**: Full TypeScript coverage for team operations

## Deployment Notes

1. **Database Migration**: Run SQL scripts to add team tables
2. **Data Migration**: Existing games remain unaffected (no team)
3. **UI Updates**: New team selection appears in relevant modals
4. **Feature Rollout**: Can be enabled gradually via feature flags
5. **Performance**: Monitor team roster query performance

This implementation adds comprehensive team management while preserving all existing functionality and data.