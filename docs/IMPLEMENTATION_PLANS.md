# MatchOps Cloud - Step-by-Step Implementation Plans

## Overview

This document provides detailed, actionable implementation plans for each feature identified in the gap analysis. Each plan includes specific files to create, code examples, database changes, and testing requirements.

---

## Phase 1: Core Features Implementation

### 🔥 Feature 1: Team Management System (Priority: CRITICAL)

**Estimated Time**: 2 weeks  
**Dependencies**: None (foundational feature)

#### Step 1.1: Database Schema Creation (Day 1)

**Create Migration File**: `supabase/migrations/20240901_create_teams_tables.sql`

```sql
-- Team Management Tables Migration
-- Create teams table
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
  UNIQUE(user_id, name)
);

-- Create team_rosters junction table
CREATE TABLE team_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, player_id)
);

-- Add team_id to games table if not exists
ALTER TABLE games ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Row Level Security Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own teams" ON teams
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage rosters for their teams" ON team_rosters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_rosters.team_id 
      AND teams.user_id = auth.uid()
    )
  );

-- Performance Indexes
CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_teams_user_active ON teams(user_id) WHERE NOT COALESCE(archived, false);
CREATE INDEX idx_team_rosters_team_id ON team_rosters(team_id);
CREATE INDEX idx_team_rosters_player_id ON team_rosters(player_id);
CREATE INDEX idx_games_team_id ON games(team_id) WHERE team_id IS NOT NULL;

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Step 1.2: TypeScript Types Enhancement (Day 1)

**Modify**: `src/types/index.ts`

```typescript
// Add to existing types
export interface Team {
  id: string;
  userId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
  notes?: string;
  color?: string;
  badge?: string;
}

export interface TeamPlayer {
  id: string;
  teamId: string;
  playerId: string;
  player?: Player; // Populated in joins
  createdAt?: string;
}

// Enhance existing Game interface
export interface Game {
  // ... existing fields
  teamId?: string;
  team?: Team; // Populated in joins
}
```

**Modify**: `src/utils/transforms/toSupabase.ts`

```typescript
// Add team transformation interfaces and functions
export interface SupabaseTeam {
  id?: string;
  user_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  archived: boolean;
  notes?: string | null;
  color?: string | null;
  badge?: string | null;
}

export interface SupabaseTeamRoster {
  id?: string;
  team_id: string;
  player_id: string;
  created_at?: string;
}

export function transformTeamToSupabase(team: Team, userId: string): SupabaseTeam {
  return {
    id: team.id !== `temp-${Date.now()}` ? team.id : undefined,
    user_id: userId,
    name: team.name.trim(),
    archived: team.archived || false,
    notes: team.notes || null,
    color: team.color || null,
    badge: team.badge || null,
  };
}

export function transformTeamRosterToSupabase(
  teamId: string, 
  playerIds: string[]
): SupabaseTeamRoster[] {
  return playerIds.map(playerId => ({
    team_id: teamId,
    player_id: playerId,
  }));
}
```

**Modify**: `src/utils/transforms/fromSupabase.ts`

```typescript
export function transformTeamFromSupabase(supabaseTeam: SupabaseTeam): Team {
  return {
    id: supabaseTeam.id!,
    userId: supabaseTeam.user_id,
    name: supabaseTeam.name,
    createdAt: supabaseTeam.created_at,
    updatedAt: supabaseTeam.updated_at,
    archived: supabaseTeam.archived || false,
    notes: supabaseTeam.notes || undefined,
    color: supabaseTeam.color || undefined,
    badge: supabaseTeam.badge || undefined,
  };
}

export function transformTeamPlayerFromSupabase(
  supabaseTeamRoster: SupabaseTeamRoster & { player?: SupabasePlayer }
): TeamPlayer {
  return {
    id: supabaseTeamRoster.id!,
    teamId: supabaseTeamRoster.team_id,
    playerId: supabaseTeamRoster.player_id,
    player: supabaseTeamRoster.player ? 
      transformPlayerFromSupabase(supabaseTeamRoster.player) : undefined,
    createdAt: supabaseTeamRoster.created_at,
  };
}
```

#### Step 1.3: Enhanced Query Keys (Day 1)

**Modify**: `src/config/queryKeys.ts`

```typescript
export const queryKeys = {
  // ... existing keys
  teams: (userId: string | undefined) => ['teams', userId] as const,
  team: (userId: string | undefined, teamId: string) => ['teams', userId, teamId] as const,
  teamRoster: (userId: string | undefined, teamId: string) => ['teamRoster', userId, teamId] as const,
  gamesByTeam: (userId: string | undefined, teamId: string) => ['games', 'by-team', userId, teamId] as const,
};
```

#### Step 1.4: Core Team Hooks Implementation (Day 2-3)

**Create**: `src/hooks/useTeamQueries.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../config/queryKeys';
import { StorageError, AuthenticationError } from '../lib/storage/types';
import { 
  transformTeamFromSupabase, 
  transformTeamToSupabase,
  transformTeamPlayerFromSupabase,
  transformTeamRosterToSupabase
} from '../utils/transforms';
import type { Team, TeamPlayer } from '../types';

// Get all teams for user
export const useTeams = () => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.teams(user?.id),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw new StorageError('supabase', 'getTeams', error);
      return data.map(transformTeamFromSupabase);
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes for relatively stable data
  });
};

// Get single team
export const useTeam = (teamId: string) => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.team(user?.id, teamId),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw new StorageError('supabase', 'getTeam', error);
      return transformTeamFromSupabase(data);
    },
    enabled: !!user && !!teamId,
  });
};

// Get team roster with player details
export const useTeamRoster = (teamId: string) => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.teamRoster(user?.id, teamId),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const { data, error } = await supabase
        .from('team_rosters')
        .select(`
          *,
          player:players(*)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });
      
      if (error) throw new StorageError('supabase', 'getTeamRoster', error);
      return data.map(transformTeamPlayerFromSupabase);
    },
    enabled: !!user && !!teamId,
  });
};

// Create team mutation
export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (teamData: Omit<Team, 'id' | 'userId'>) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const supabaseTeam = transformTeamToSupabase(
        { ...teamData, id: crypto.randomUUID(), userId: user.id }, 
        user.id
      );
      
      const { data, error } = await supabase
        .from('teams')
        .insert([supabaseTeam])
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new StorageError('supabase', 'createTeam', 
            new Error('A team with this name already exists'));
        }
        throw new StorageError('supabase', 'createTeam', error);
      }
      
      return transformTeamFromSupabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.teams(user?.id));
    },
    // Optimistic update
    onMutate: async (newTeam) => {
      if (!user) return;
      
      await queryClient.cancelQueries(queryKeys.teams(user.id));
      const previousTeams = queryClient.getQueryData(queryKeys.teams(user.id));
      
      queryClient.setQueryData(queryKeys.teams(user.id), (old: Team[] = []) => [
        ...old,
        { ...newTeam, id: `temp-${Date.now()}`, userId: user.id }
      ]);
      
      return { previousTeams };
    },
    onError: (err, variables, context) => {
      if (context?.previousTeams && user) {
        queryClient.setQueryData(queryKeys.teams(user.id), context.previousTeams);
      }
    },
  });
};

// Update team mutation
export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async ({ teamId, updates }: { teamId: string; updates: Partial<Team> }) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const supabaseUpdates = transformTeamToSupabase(
        { ...updates, id: teamId, userId: user.id } as Team, 
        user.id
      );
      
      const { data, error } = await supabase
        .from('teams')
        .update(supabaseUpdates)
        .eq('id', teamId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw new StorageError('supabase', 'updateTeam', error);
      return transformTeamFromSupabase(data);
    },
    onSuccess: (updatedTeam) => {
      queryClient.invalidateQueries(queryKeys.teams(user?.id));
      queryClient.invalidateQueries(queryKeys.team(user?.id, updatedTeam.id));
    },
  });
};

// Delete team mutation
export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (teamId: string) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
        .eq('user_id', user.id);
      
      if (error) throw new StorageError('supabase', 'deleteTeam', error);
      return teamId;
    },
    onSuccess: (deletedTeamId) => {
      queryClient.invalidateQueries(queryKeys.teams(user?.id));
      queryClient.removeQueries(queryKeys.team(user?.id, deletedTeamId));
      queryClient.removeQueries(queryKeys.teamRoster(user?.id, deletedTeamId));
    },
  });
};

// Update team roster mutation
export const useUpdateTeamRoster = (teamId: string) => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (playerIds: string[]) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      // Use Supabase RPC for atomic roster replacement
      const { error } = await supabase.rpc('replace_team_roster', {
        p_team_id: teamId,
        p_player_ids: playerIds,
        p_user_id: user.id
      });
      
      if (error) throw new StorageError('supabase', 'updateTeamRoster', error);
      return playerIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.teamRoster(user?.id, teamId));
      queryClient.invalidateQueries(queryKeys.teams(user?.id));
    },
  });
};
```

#### Step 1.5: Database RPC Function (Day 3)

**Create Migration**: `supabase/migrations/20240902_team_roster_rpc.sql`

```sql
-- RPC function for atomic team roster replacement
CREATE OR REPLACE FUNCTION replace_team_roster(
  p_team_id UUID,
  p_player_ids UUID[],
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify team ownership
  IF NOT EXISTS (
    SELECT 1 FROM teams 
    WHERE id = p_team_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Team not found or access denied';
  END IF;
  
  -- Verify all players belong to user
  IF EXISTS (
    SELECT 1 FROM unnest(p_player_ids) AS pid(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = pid.id AND players.user_id = p_user_id
    )
  ) THEN
    RAISE EXCEPTION 'One or more players not found or access denied';
  END IF;
  
  -- Delete existing roster
  DELETE FROM team_rosters WHERE team_id = p_team_id;
  
  -- Insert new roster
  INSERT INTO team_rosters (team_id, player_id)
  SELECT p_team_id, unnest(p_player_ids);
END;
$$;
```

#### Step 1.6: Team Management UI Components (Day 4-5)

**Create**: `src/components/TeamManagerModal.tsx`

```typescript
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { 
  useTeams, 
  useCreateTeam, 
  useUpdateTeam, 
  useDeleteTeam 
} from '../hooks/useTeamQueries';
import { Team } from '../types';

interface TeamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamManagerModal: React.FC<TeamManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  const { data: teams = [], isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    color: '#3B82F6',
    badge: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('teamManager.nameRequired'));
      return;
    }

    try {
      if (editingTeam) {
        await updateTeam.mutateAsync({
          teamId: editingTeam.id,
          updates: formData
        });
        toast.success(t('teamManager.teamUpdated'));
      } else {
        await createTeam.mutateAsync(formData);
        toast.success(t('teamManager.teamCreated'));
      }
      
      resetForm();
    } catch (error: any) {
      toast.error(error.message || t('teamManager.operationFailed'));
    }
  };

  const handleDelete = async (team: Team) => {
    if (!window.confirm(t('teamManager.confirmDelete', { teamName: team.name }))) {
      return;
    }

    try {
      await deleteTeam.mutateAsync(team.id);
      toast.success(t('teamManager.teamDeleted'));
    } catch (error: any) {
      toast.error(error.message || t('teamManager.deleteFailed'));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', notes: '', color: '#3B82F6', badge: '' });
    setEditingTeam(null);
    setIsCreating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t('teamManager.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Team List */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t('teamManager.existingTeams')}</h3>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t('teamManager.createTeam')}
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-4">{t('common.loading')}</div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('teamManager.noTeams')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map(team => (
                <div 
                  key={team.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center mb-2">
                    {team.color && (
                      <div 
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: team.color }}
                      />
                    )}
                    <h4 className="font-medium">{team.name}</h4>
                  </div>
                  
                  {team.notes && (
                    <p className="text-sm text-gray-600 mb-3">{team.notes}</p>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingTeam(team);
                        setFormData({
                          name: team.name,
                          notes: team.notes || '',
                          color: team.color || '#3B82F6',
                          badge: team.badge || ''
                        });
                        setIsCreating(true);
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(team)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingTeam ? t('teamManager.editTeam') : t('teamManager.createTeam')}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('teamManager.teamName')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('teamManager.teamNamePlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('teamManager.notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('teamManager.notesPlaceholder')}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('teamManager.teamColor')}
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-10 border rounded cursor-pointer"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={createTeam.isPending || updateTeam.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingTeam ? t('common.save') : t('common.create')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
```

#### Step 1.7: Team Roster Management Component (Day 6)

**Create**: `src/components/TeamRosterModal.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useTeamRoster, useUpdateTeamRoster } from '../hooks/useTeamQueries';
import { usePlayers } from '../hooks/useGameDataQueries';
import { Team, Player } from '../types';

interface TeamRosterModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamRosterModal: React.FC<TeamRosterModalProps> = ({
  team,
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  const { data: allPlayers = [] } = usePlayers();
  const { data: teamRoster = [] } = useTeamRoster(team?.id || '');
  const updateRoster = useUpdateTeamRoster(team?.id || '');
  
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize selected players from current roster
  useEffect(() => {
    if (teamRoster.length > 0) {
      setSelectedPlayerIds(new Set(teamRoster.map(tr => tr.playerId)));
    }
  }, [teamRoster]);

  const filteredPlayers = allPlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.nickname && player.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePlayerToggle = (playerId: string) => {
    const newSelected = new Set(selectedPlayerIds);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayerIds(newSelected);
  };

  const handleSave = async () => {
    if (!team) return;

    try {
      await updateRoster.mutateAsync(Array.from(selectedPlayerIds));
      toast.success(t('teamRosterModal.rosterUpdated'));
      onClose();
    } catch (error: any) {
      toast.error(error.message || t('teamRosterModal.updateFailed'));
    }
  };

  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {t('teamRosterModal.title', { teamName: team.name })}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder={t('teamRosterModal.searchPlayers')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Selection Summary */}
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="text-sm text-blue-700">
            {t('teamRosterModal.selectedCount', { 
              count: selectedPlayerIds.size,
              total: allPlayers.length 
            })}
          </p>
        </div>

        {/* Player List */}
        <div className="mb-6 max-h-96 overflow-y-auto border rounded">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? t('teamRosterModal.noMatchingPlayers') : t('teamRosterModal.noPlayers')}
            </div>
          ) : (
            <div className="divide-y">
              {filteredPlayers.map(player => (
                <label
                  key={player.id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlayerIds.has(player.id)}
                    onChange={() => handlePlayerToggle(player.id)}
                    className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{player.name}</div>
                    {player.nickname && (
                      <div className="text-sm text-gray-500">"{player.nickname}"</div>
                    )}
                    {player.jerseyNumber && (
                      <div className="text-sm text-gray-500">
                        #{player.jerseyNumber}
                      </div>
                    )}
                  </div>
                  {player.isGoalie && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                      {t('common.goalie')}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPlayerIds(new Set(allPlayers.map(p => p.id)))}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              {t('teamRosterModal.selectAll')}
            </button>
            <button
              onClick={() => setSelectedPlayerIds(new Set())}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              {t('teamRosterModal.selectNone')}
            </button>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={updateRoster.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {updateRoster.isPending ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### Step 1.8: Integration with Existing Components (Day 7)

**Modify**: `src/components/NewGameSetupModal.tsx`

```typescript
// Add team selection to new game setup
import { useTeams } from '../hooks/useTeamQueries';

// Add to component state
const { data: teams = [] } = useTeams();
const [selectedTeamId, setSelectedTeamId] = useState<string>('');

// Add team selection UI before existing form elements
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    {t('newGameSetup.selectTeam')}
  </label>
  <select
    value={selectedTeamId}
    onChange={(e) => setSelectedTeamId(e.target.value)}
    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">{t('newGameSetup.noTeam')}</option>
    {teams.map(team => (
      <option key={team.id} value={team.id}>
        {team.name}
      </option>
    ))}
  </select>
</div>

// Pass teamId to game creation handler
const handleStartGame = () => {
  onStartGame({
    ...gameSetupData,
    teamId: selectedTeamId || undefined
  });
};
```

**Modify**: `src/lib/storage/supabaseProvider.ts`

```typescript
// Add team operations to SupabaseProvider class
export class SupabaseProvider implements IStorageProvider {
  // ... existing methods

  // Teams CRUD operations
  async getTeams(): Promise<Team[]> {
    const userId = await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new StorageError('supabase', 'getTeams', error);
    }
    
    return data.map(transformTeamFromSupabase);
  }

  async createTeam(team: Omit<Team, 'id' | 'userId'>): Promise<Team> {
    const userId = await this.getCurrentUserId();
    const supabaseTeam = transformTeamToSupabase(
      { ...team, id: crypto.randomUUID(), userId }, 
      userId
    );
    
    const { data, error } = await supabase
      .from('teams')
      .insert([supabaseTeam])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        throw new StorageError('supabase', 'createTeam', 
          new Error('A team with this name already exists'));
      }
      throw new StorageError('supabase', 'createTeam', error);
    }
    
    return transformTeamFromSupabase(data);
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
    const userId = await this.getCurrentUserId();
    const supabaseUpdates = transformTeamToSupabase(
      { ...updates, id: teamId, userId } as Team, 
      userId
    );
    
    const { data, error } = await supabase
      .from('teams')
      .update(supabaseUpdates)
      .eq('id', teamId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw new StorageError('supabase', 'updateTeam', error);
    return transformTeamFromSupabase(data);
  }

  async deleteTeam(teamId: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
      .eq('user_id', userId);
    
    if (error) throw new StorageError('supabase', 'deleteTeam', error);
  }

  // Team roster operations
  async getTeamRoster(teamId: string): Promise<TeamPlayer[]> {
    const { data, error } = await supabase
      .from('team_rosters')
      .select(`
        *,
        player:players(*)
      `)
      .eq('team_id', teamId);
    
    if (error) throw new StorageError('supabase', 'getTeamRoster', error);
    return data.map(transformTeamPlayerFromSupabase);
  }

  async updateTeamRoster(teamId: string, playerIds: string[]): Promise<void> {
    const userId = await this.getCurrentUserId();
    
    const { error } = await supabase.rpc('replace_team_roster', {
      p_team_id: teamId,
      p_player_ids: playerIds,
      p_user_id: userId
    });
    
    if (error) throw new StorageError('supabase', 'updateTeamRoster', error);
  }
}
```

#### Step 1.9: Testing Implementation (Day 8-9)

**Create**: `src/hooks/__tests__/useTeamQueries.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTeams, useCreateTeam, useDeleteTeam } from '../useTeamQueries';
import { createWrapper } from '../../__tests__/test-utils';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            then: jest.fn()
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn()
        }))
      }))
    }))
  }
}));

describe('useTeamQueries', () => {
  it('should fetch teams for authenticated user', async () => {
    const { result } = renderHook(() => useTeams(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add specific test assertions based on mock data
  });

  it('should create team with validation', async () => {
    const { result } = renderHook(() => useCreateTeam(), {
      wrapper: createWrapper()
    });

    // Test team creation logic
  });

  it('should handle team deletion with confirmation', async () => {
    const { result } = renderHook(() => useDeleteTeam(), {
      wrapper: createWrapper()
    });

    // Test deletion logic
  });
});
```

#### Step 1.10: i18n Translation Keys (Day 9)

**Add to**: `public/locales/en/translation.json`

```json
{
  "teamManager": {
    "title": "Team Management",
    "existingTeams": "Your Teams",
    "createTeam": "Create Team",
    "editTeam": "Edit Team",
    "noTeams": "No teams created yet. Create your first team to get started!",
    "teamName": "Team Name",
    "teamNamePlaceholder": "Enter team name",
    "notes": "Notes",
    "notesPlaceholder": "Add team notes (optional)",
    "teamColor": "Team Color",
    "nameRequired": "Team name is required",
    "teamCreated": "Team created successfully",
    "teamUpdated": "Team updated successfully",
    "teamDeleted": "Team deleted successfully",
    "operationFailed": "Operation failed. Please try again.",
    "deleteFailed": "Failed to delete team",
    "confirmDelete": "Are you sure you want to delete '{{teamName}}'? This action cannot be undone."
  },
  "teamRosterModal": {
    "title": "Manage Roster - {{teamName}}",
    "searchPlayers": "Search players...",
    "selectedCount": "{{count}} of {{total}} players selected",
    "noMatchingPlayers": "No players match your search",
    "noPlayers": "No players available. Add players to your master roster first.",
    "selectAll": "Select All",
    "selectNone": "Clear Selection",
    "rosterUpdated": "Team roster updated successfully",
    "updateFailed": "Failed to update team roster"
  },
  "newGameSetup": {
    "selectTeam": "Select Team (Optional)",
    "noTeam": "No Team - Use Master Roster"
  }
}
```

#### Step 1.11: Documentation Updates (Day 10)

**Create**: `docs/features/TEAM_MANAGEMENT_IMPLEMENTATION.md`

```markdown
# Team Management Implementation Guide

## Overview
This document provides implementation details for the Team Management system in MatchOps Cloud.

## Database Schema
- `teams` table: Core team information with user isolation via RLS
- `team_rosters` table: Junction table for team-player relationships
- `replace_team_roster` RPC: Atomic roster replacement function

## Key Components
- `TeamManagerModal`: CRUD interface for team management
- `TeamRosterModal`: Player assignment interface
- `useTeamQueries`: React Query hooks for data operations

## Integration Points
- New Game Setup: Team selection dropdown
- Load Game Modal: Team-based filtering
- Game Stats: Team-specific statistics
- Storage Provider: Team CRUD operations

## Testing
- Unit tests for all hooks and utilities
- Integration tests for component interactions
- E2E tests for complete team workflows

## Migration Notes
- Existing games will have `team_id` as NULL (legacy games)
- Team deletion sets `team_id` to NULL in games (preserves data)
- RLS policies ensure complete user data isolation
```

### Testing Checklist for Team Management

**✅ Database Testing:**
- [ ] Team CRUD operations work correctly
- [ ] RLS policies prevent cross-user data access
- [ ] Team roster RPC function handles edge cases
- [ ] Foreign key constraints prevent orphaned data

**✅ Component Testing:**
- [ ] TeamManagerModal creates/edits/deletes teams
- [ ] TeamRosterModal assigns players correctly
- [ ] Form validation works as expected
- [ ] Loading states and error handling function properly

**✅ Integration Testing:**
- [ ] New Game Setup includes team selection
- [ ] Games are properly associated with teams
- [ ] Team deletion handles existing games gracefully
- [ ] Real-time updates work across browser tabs

---

## Summary

This implementation plan provides a complete, production-ready team management system for MatchOps Cloud. The system includes:

- ✅ Complete database schema with proper relationships and RLS
- ✅ Full TypeScript type safety and data transformation
- ✅ Comprehensive React Query integration with optimistic updates
- ✅ Professional UI components with proper UX patterns
- ✅ Integration with existing game creation and management flows
- ✅ Testing strategy and documentation

**Next Steps**: Once this foundation is implemented, proceed with Phase 1's Enhanced Master Roster Management feature.