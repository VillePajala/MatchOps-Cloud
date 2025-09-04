# Feature 6: Team Management Implementation Plan

**Status**: Ready for Implementation  
**Priority**: Medium  
**Estimated Effort**: 5 days  
**Dependencies**: Database migration capabilities

## Overview
Complete multi-team support with team creation, editing, roster assignment, and integration with game creation workflows.

## Current State Analysis
- ✅ Game creation supports team names as simple strings (`teamName`, `opponentName`)
- ✅ `TeamOpponentInputs.tsx` exists for basic team/opponent input
- ✅ Storage system architecture supports new entity types
- ✅ Modal system patterns established and working
- ❌ No teams table in database
- ❌ No Team interface in types
- ❌ No team management modal or components
- ❌ No team-based roster associations
- ❌ No team selection in game creation

## Implementation Checklist

### Phase 1: Database Schema Creation (Day 0.5)

#### 1.1 Create Teams Migration
- [ ] **File**: `supabase/migrations/[timestamp]_add_teams_support.sql`
- [ ] **Teams Table**:
```sql
-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366F1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- RLS Policy for teams  
CREATE POLICY "Users can only access their own teams" ON teams
  FOR ALL USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX teams_user_id_idx ON teams(user_id);
CREATE INDEX teams_name_idx ON teams(name);
```

#### 1.2 Create Team Players Junction Table
- [ ] **Team Roster Associations**:
```sql
-- Team-Player associations
CREATE TABLE team_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, player_id)
);

-- Enable RLS
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;

-- RLS Policy - users can manage associations for their own teams/players
CREATE POLICY "Users can manage their own team player associations" ON team_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_players.team_id AND t.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM players p WHERE p.id = team_players.player_id AND p.user_id = auth.uid()  
    )
  );

-- Indexes for performance
CREATE INDEX team_players_team_id_idx ON team_players(team_id);
CREATE INDEX team_players_player_id_idx ON team_players(player_id);
```

#### 1.3 Update Games Table (Optional Enhancement)
- [ ] **Add Team References to Games**:
```sql
-- Add team_id column to games table (optional)
ALTER TABLE games ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
CREATE INDEX games_team_id_idx ON games(team_id);
```

### Phase 2: Type Definitions and Storage (Day 1)

#### 2.1 Add Type Definitions
- [ ] **File**: `src/types/index.ts`
- [ ] **Add Team Interfaces**:
```typescript
export interface Team {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamPlayer {
  id: string;
  teamId: string;
  playerId: string;
  assignedAt: string;
}

export interface TeamWithRoster extends Team {
  players: Player[];
  playerCount: number;
  gameCount: number;
}
```

#### 2.2 Extend Storage Manager
- [ ] **File**: `src/lib/storage/types.ts`
- [ ] **Add Storage Interface Methods**:
```typescript
export interface IStorageProvider {
  // ... existing methods
  
  // Team management
  getTeams(): Promise<Team[]>;
  saveTeam(team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team>;
  updateTeam(teamId: string, updates: Partial<Omit<Team, 'id'>>): Promise<Team | null>;
  deleteTeam(teamId: string): Promise<boolean>;
  
  // Team roster management
  getTeamRoster(teamId: string): Promise<Player[]>;
  assignPlayerToTeam(teamId: string, playerId: string): Promise<boolean>;
  removePlayerFromTeam(teamId: string, playerId: string): Promise<boolean>;
  getPlayerTeams(playerId: string): Promise<Team[]>;
}
```

#### 2.3 Implement Storage Providers
- [ ] **File**: `src/lib/storage/supabaseProvider.ts`
- [ ] **Add Supabase Implementation**:
```typescript
// Teams CRUD
async getTeams(): Promise<Team[]> {
  const { data, error } = await this.supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw new StorageError(`Failed to fetch teams: ${error.message}`);
  return data?.map(team => this.fromSupabaseTeam(team)) || [];
}

async saveTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
  const { data, error } = await this.supabase
    .from('teams')
    .insert([{
      name: teamData.name,
      color: teamData.color || '#6366F1',
      user_id: (await this.supabase.auth.getUser()).data.user?.id
    }])
    .select()
    .single();
    
  if (error) throw new StorageError(`Failed to save team: ${error.message}`);
  return this.fromSupabaseTeam(data);
}
```

- [ ] **File**: `src/lib/storage/localStorageProvider.ts`  
- [ ] **Add LocalStorage Implementation**: Mirror Supabase functionality for offline use

#### 2.4 Create Team Management Utilities
- [ ] **File**: `src/utils/teamManager.ts`
- [ ] **Team Management Functions**:
```typescript
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import type { Team, Player, TeamWithRoster } from '@/types';

export const getTeams = async (): Promise<Team[]> => {
  try {
    return await storageManager.getTeams();
  } catch (error) {
    logger.error('[teamManager] Error fetching teams:', error);
    return [];
  }
};

export const createTeam = async (teamData: { name: string; color?: string }): Promise<Team | null> => {
  try {
    return await storageManager.saveTeam(teamData);
  } catch (error) {
    logger.error('[teamManager] Error creating team:', error);
    return null;
  }
};

export const getTeamWithRoster = async (teamId: string): Promise<TeamWithRoster | null> => {
  try {
    const [team, roster] = await Promise.all([
      storageManager.getTeams().then(teams => teams.find(t => t.id === teamId)),
      storageManager.getTeamRoster(teamId)
    ]);
    
    if (!team) return null;
    
    return {
      ...team,
      players: roster,
      playerCount: roster.length,
      gameCount: 0 // TODO: Calculate from games
    };
  } catch (error) {
    logger.error('[teamManager] Error fetching team with roster:', error);
    return null;
  }
};
```

### Phase 3: Team Management Modal (Day 2)

#### 3.1 Create Team Management Modal
- [ ] **File**: `src/components/TeamManagementModal.tsx`
- [ ] **Component Structure**:
```typescript
interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTeamRoster: (teamId: string) => void;
}

const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen,
  onClose,
  onOpenTeamRoster
}) => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<TeamWithRoster[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  // ... component implementation
};
```

#### 3.2 Implement Team List Display
- [ ] **Team Card Layout** (following existing modal patterns):
```typescript
// Team card with statistics and actions
<div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
  <div className="flex justify-between items-start mb-2">
    <div className="flex items-center gap-3">
      <div 
        className="w-4 h-4 rounded-full border-2 border-white"
        style={{ backgroundColor: team.color }}
      />
      <h3 className="text-lg font-semibold text-slate-100">{team.name}</h3>
    </div>
    <ActionsMenu teamId={team.id} />
  </div>
  <div className="text-sm text-slate-400">
    {team.playerCount} Players | {team.gameCount} Games
  </div>
</div>
```

#### 3.3 Implement Team Creation Form
- [ ] **Create Team Form**:
  - [ ] Team name input (required, max 48 characters)
  - [ ] Color picker (8 predefined colors matching feature spec)
  - [ ] Form validation (unique names, required fields)
  - [ ] Save/Cancel actions

#### 3.4 Implement Team Actions Menu
- [ ] **Actions Menu Options**:
  - [ ] Edit Team (inline editing)
  - [ ] Manage Roster (opens TeamRosterModal)
  - [ ] Duplicate Team (creates copy with "(Copy)" suffix)
  - [ ] Delete Team (confirmation dialog)

### Phase 4: Team Roster Management (Day 1)

#### 4.1 Create Team Roster Modal
- [ ] **File**: `src/components/TeamRosterModal.tsx`
- [ ] **Component Purpose**: Assign/unassign players to specific team
- [ ] **Interface**:
```typescript
interface TeamRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
}
```

#### 4.2 Implement Roster Assignment Interface
- [ ] **Two-Column Layout**:
  - [ ] Left: Available players (not on this team)
  - [ ] Right: Team roster (current team players)
  - [ ] Drag-and-drop or click-based assignment
  - [ ] Search/filter functionality for large rosters

#### 4.3 Player Assignment Logic
- [ ] **Assignment Functions**:
  - [ ] Add player to team roster
  - [ ] Remove player from team roster
  - [ ] Handle multiple team assignments (players can be on multiple teams)
  - [ ] Real-time updates and state synchronization

### Phase 5: Game Creation Integration (Day 1)

#### 5.1 Update Game Creation Modal
- [ ] **File**: `src/components/NewGameSetupModal.tsx`
- [ ] **Add Team Selection**:
  - [ ] Replace team name text input with team dropdown
  - [ ] "Create New Team" option in dropdown
  - [ ] Team-based roster pre-population

#### 5.2 Team-Based Roster Selection
- [ ] **Roster Logic Updates**:
  - [ ] When team selected, pre-populate with team roster
  - [ ] Allow addition of non-team players
  - [ ] Maintain existing flexibility while adding team benefits

#### 5.3 Backward Compatibility
- [ ] **Maintain Existing Functionality**:
  - [ ] Games can still be created without team selection
  - [ ] Simple team name entry still available as fallback
  - [ ] Existing saved games continue to work

### Phase 6: UI Integration and Polish (Day 0.5)

#### 6.1 Add Team Management to Control Bar
- [ ] **File**: `src/components/ControlBar.tsx`
- [ ] **Current State**: "Manage Teams" button exists in sidebar but not connected
- [ ] **Connect Button**: Add `onOpenTeamManagementModal` prop and handler

#### 6.2 Update Page-Level Modal Management
- [ ] **File**: `src/app/page.tsx` or relevant parent component
- [ ] **Add Team Modal State**:
  - [ ] Team management modal state
  - [ ] Team roster modal state  
  - [ ] Modal handlers and prop passing

#### 6.3 Add Translation Keys
- [ ] **File**: `public/locales/en/common.json`
- [ ] **Add Team Management Keys**:
```json
{
  "teamManager": {
    "title": "Teams",
    "newTeam": "New Team", 
    "createNewTeam": "Create new team",
    "teamName": "Team Name",
    "teamColor": "Team Color",
    "namePlaceholder": "Enter team name",
    "confirmDelete": "Are you sure you want to delete {{teamName}}?",
    "playerCount": "{{count}} Players",
    "gameCount": "{{count}} Games",
    "actions": {
      "edit": "Edit Team",
      "manageRoster": "Manage Roster", 
      "duplicate": "Duplicate Team",
      "delete": "Delete Team"
    }
  },
  "teamRosterModal": {
    "title": "Manage {{teamName}} Roster",
    "availablePlayers": "Available Players",
    "teamRoster": "Team Roster",
    "addToTeam": "Add to Team",
    "removeFromTeam": "Remove from Team"
  }
}
```

- [ ] **File**: `public/locales/fi/common.json`
- [ ] **Add Finnish Translations**

### Phase 7: Testing and Integration (Day 0.5)

#### 7.1 Database Testing
- [ ] **Migration Testing**:
  - [ ] Run migration on test database
  - [ ] Verify table creation and indexes
  - [ ] Test RLS policies with different users
  - [ ] Verify foreign key constraints work correctly

#### 7.2 CRUD Operations Testing
- [ ] **Team Management**:
  - [ ] Create teams with various names and colors
  - [ ] Edit team names and colors
  - [ ] Delete teams (verify cascade behavior)
  - [ ] Duplicate teams (verify uniqueness handling)

- [ ] **Roster Management**:
  - [ ] Assign players to teams
  - [ ] Remove players from teams
  - [ ] Handle multiple team assignments
  - [ ] Test with large rosters (100+ players)

#### 7.3 Integration Testing
- [ ] **Game Creation Integration**:
  - [ ] Create games with team selection
  - [ ] Verify roster pre-population works
  - [ ] Test fallback to manual team entry
  - [ ] Verify backward compatibility with existing games

#### 7.4 User Experience Testing
- [ ] **Complete User Workflows**:
  - [ ] New user creates first team and assigns players
  - [ ] Existing user converts from simple team names to managed teams
  - [ ] Multiple teams with overlapping rosters
  - [ ] Team management with many players and teams

## File Dependencies
- `supabase/migrations/[timestamp]_add_teams_support.sql` (new)
- `src/types/index.ts` (modify)
- `src/lib/storage/types.ts` (modify)
- `src/lib/storage/supabaseProvider.ts` (modify)
- `src/lib/storage/localStorageProvider.ts` (modify)
- `src/utils/teamManager.ts` (new)
- `src/components/TeamManagementModal.tsx` (new)
- `src/components/TeamRosterModal.tsx` (new)
- `src/components/NewGameSetupModal.tsx` (modify)
- `src/components/ControlBar.tsx` (modify)
- `src/app/page.tsx` (modify - modal management)
- `public/locales/en/common.json` (modify)
- `public/locales/fi/common.json` (modify)

## Success Criteria
- [ ] Users can create, edit, and delete teams with color customization
- [ ] Team roster assignment works smoothly with drag-and-drop or click interface
- [ ] Game creation integrates team selection with roster pre-population
- [ ] All team operations work both online (Supabase) and offline (localStorage)
- [ ] Team statistics display accurately (player count, game count)
- [ ] Backward compatibility maintained for existing games and workflows
- [ ] All team management features are fully translated
- [ ] Performance remains good with large numbers of teams and players
- [ ] Database migrations run successfully without data loss

## Post-Implementation Notes
- Document any performance considerations with large team datasets
- Note user feedback on team management workflow efficiency
- Record any database optimization needs discovered during testing
- Document integration challenges and solutions for future reference