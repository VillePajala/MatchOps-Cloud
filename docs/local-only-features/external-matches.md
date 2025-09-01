# External Matches (Player Stat Adjustments)

## Overview
Allows coaches to add statistics from games played outside the MatchOps app (e.g., games played with external teams, tournaments not tracked in the app). These adjustments are included in player totals and can optionally contribute to season/tournament statistics.

## Data Model

### PlayerStatAdjustment Interface
**File**: `src/types/index.ts`

```typescript
export interface PlayerStatAdjustment {
  id: string;                           // adj_timestamp_random
  playerId: string;                     // Reference to player in master roster
  seasonId?: string;                    // Optional season association
  teamId?: string;                      // Optional team context (can be "External")
  tournamentId?: string;                // Optional tournament context
  externalTeamName?: string;            // Name of team player represented
  opponentName?: string;                // Opponent name
  scoreFor?: number;                    // Team score for player's team
  scoreAgainst?: number;                // Opponent score
  gameDate?: string;                    // Date in YYYY-MM-DD format
  homeOrAway?: 'home' | 'away' | 'neutral'; // Game location context
  includeInSeasonTournament?: boolean;  // Whether to include in season/tournament stats
  gamesPlayedDelta: number;             // Games to add (typically 1)
  goalsDelta: number;                   // Goals scored to add
  assistsDelta: number;                 // Assists to add
  note?: string;                        // Optional description/context
  createdBy?: string;                   // User identifier (optional)
  appliedAt: string;                    // ISO timestamp when adjustment was created
}
```

## Storage Implementation

### localStorage Key
**Storage Key**: `'soccerPlayerAdjustments'` (defined by `PLAYER_ADJUSTMENTS_KEY` in `src/config/storageKeys.ts`)

### Storage Format
```typescript
// PlayerAdjustmentsIndex format in localStorage
{
  [playerId: string]: PlayerStatAdjustment[]
}
```

## CRUD Operations

### Core Functions
**File**: `src/utils/playerAdjustments.ts`

#### getAllPlayerAdjustments() - Lines 9-17
```typescript
export const getAllPlayerAdjustments = async (): Promise<PlayerAdjustmentsIndex> => {
  const json = getLocalStorageItem(PLAYER_ADJUSTMENTS_KEY);
  if (!json) return {};
  try {
    return JSON.parse(json) as PlayerAdjustmentsIndex;
  } catch {
    return {};
  }
};
```

#### addPlayerAdjustment() - Lines 24-49
```typescript
export const addPlayerAdjustment = async (
  adj: Omit<PlayerStatAdjustment, 'id' | 'appliedAt'> & { id?: string; appliedAt?: string }
): Promise<PlayerStatAdjustment> => {
  const all = await getAllPlayerAdjustments();
  const newAdj: PlayerStatAdjustment = {
    id: adj.id || `adj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    appliedAt: adj.appliedAt || new Date().toISOString(),
    // ... other properties
  };
  const list = all[newAdj.playerId] || [];
  all[newAdj.playerId] = [...list, newAdj];
  setLocalStorageItem(PLAYER_ADJUSTMENTS_KEY, JSON.stringify(all));
  return newAdj;
};
```

## Statistics Calculation Integration

### Player Stats Calculation
**File**: `src/utils/playerStats.ts`

The `calculatePlayerStats` function applies adjustments after processing saved games:

```typescript
export const calculatePlayerStats = (
  player: Player,
  savedGames: { [key: string]: AppState },
  seasons: Season[],
  tournaments: Tournament[],
  adjustments?: PlayerStatAdjustment[], // External adjustments
  teamId?: string  // Optional team filtering
): PlayerStats => {
  // Process regular games first...
  
  // Then apply adjustments
  if (adjustments) {
    adjustments.forEach(adj => {
      totalGames += adj.gamesPlayedDelta;
      totalGoals += adj.goalsDelta;
      totalAssists += adj.assistsDelta;
      
      // Apply to season/tournament stats if includeInSeasonTournament is true
      if (adj.includeInSeasonTournament) {
        if (adj.seasonId && performanceBySeason[adj.seasonId]) {
          // Add to season stats
        }
        if (adj.tournamentId && performanceByTournament[adj.tournamentId]) {
          // Add to tournament stats
        }
      }
    });
  }
};
```

### Key Behavior
- **Always Applied to Totals**: All adjustments count toward overall player statistics
- **Conditional Season/Tournament**: Only applied to season/tournament stats if `includeInSeasonTournament` is true
- **Team Filtering**: Respects team filtering when calculating team-specific stats

## User Interface Implementation

### Primary Component
**File**: `src/components/PlayerStatsView.tsx`

#### State Management (Lines 35-64)
```typescript
const [adjustments, setAdjustments] = useState<PlayerStatAdjustment[]>([]);
const [showAdjForm, setShowAdjForm] = useState(false);
const [adjSeasonId, setAdjSeasonId] = useState('');
const [adjTournamentId, setAdjTournamentId] = useState('');
const [adjExternalTeam, setAdjExternalTeam] = useState('');
const [adjOpponentName, setAdjOpponentName] = useState('');
const [adjScoreFor, setAdjScoreFor] = useState<number | ''>('');
const [adjScoreAgainst, setAdjScoreAgainst] = useState<number | ''>('');
const [adjGameDate, setAdjGameDate] = useState('');
const [adjHomeAway, setAdjHomeAway] = useState<'home' | 'away' | 'neutral'>('neutral');
const [adjGames, setAdjGames] = useState(1);
const [adjGoals, setAdjGoals] = useState(0);
const [adjAssists, setAdjAssists] = useState(0);
const [adjNote, setAdjNote] = useState('');
const [adjIncludeInSeasonTournament, setAdjIncludeInSeasonTournament] = useState(false);
```

#### Load Player Adjustments (Lines 88-91)
```typescript
useEffect(() => {
  if (!player) return;
  getAdjustmentsForPlayer(player.id).then(setAdjustments).catch(() => setAdjustments([]));
}, [player]);
```

### UI Features
- **Add External Stats Button**: Toggles form visibility
- **Expandable Form**: Comprehensive input form for all adjustment fields
- **Validation**: Form validation for required fields and data types
- **Adjustment List**: Display of existing adjustments with edit/delete actions
- **Delete Confirmation**: Modal confirmation for deletion operations
- **Date Formatting**: Locale-aware date display (Finnish/English)

### Form Fields
1. **Season/Tournament Selection**: Dropdowns for associating with existing seasons/tournaments
2. **Team Context**: External team name input
3. **Game Details**: Opponent, scores, date, home/away status
4. **Statistics**: Games played, goals, assists (numerical inputs)
5. **Options**: Checkbox for including in season/tournament statistics
6. **Notes**: Free-text description field

## React Query Integration

### Query Key
**File**: `src/config/queryKeys.ts`

The system uses React Query for caching, but adjustments are currently handled via direct localStorage access. Future enhancement could add:

```typescript
// Potential query key for adjustments
playerAdjustments: (playerId: string) => ['playerAdjustments', playerId] as const,
```

## Translation Keys

### i18n Implementation
**Files**: `public/locales/*/common.json`

#### Key Structure
```json
{
  "playerStats": {
    "addExternalStats": "Add External Stats",
    "externalStatsForm": "External Statistics Form",
    "externalTeamName": "External Team Name",
    "opponentName": "Opponent Name",
    "gameDate": "Game Date", 
    "homeOrAway": "Home/Away",
    "scoreFor": "Score For",
    "scoreAgainst": "Score Against",
    "gamesPlayed": "Games Played",
    "goals": "Goals",
    "assists": "Assists",
    "includeInSeasonTournament": "Include in Season/Tournament Stats",
    "note": "Note",
    "saveAdjustment": "Save Adjustment",
    "cancel": "Cancel",
    "editAdjustment": "Edit Adjustment",
    "deleteAdjustment": "Delete Adjustment",
    "confirmDelete": "Are you sure you want to delete this external stats entry?",
    "adjustmentSaved": "External stats saved successfully",
    "adjustmentDeleted": "External stats deleted successfully"
  }
}
```

## Implementation Gotchas

### 1. ID Generation
Adjustment IDs use timestamp + random string: `adj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

### 2. Date Handling
- Store dates in YYYY-MM-DD format
- Display dates using locale-aware formatting
- Default to current date when creating new adjustments

### 3. Statistics Integration
- Adjustments are always included in total statistics
- Season/tournament inclusion is conditional based on `includeInSeasonTournament` flag
- Team filtering applies to both regular games and adjustments

### 4. Data Validation
- Games played delta can be 0 (for stat corrections without adding games)
- Goals and assists deltas can be negative (for corrections)
- External team name is optional but recommended for context

### 5. Performance Considerations
- Adjustments are loaded per player, not globally
- Consider implementing React Query for better caching in future iterations
- Storage is per-player for efficient querying

## Usage Workflow

1. **Access**: From PlayerStatsView, click "Add External Stats" button
2. **Form Fill**: Complete form with game details and statistics
3. **Association**: Optionally link to existing season/tournament
4. **Save**: Statistics are immediately applied to player totals
5. **Review**: View adjustments in dedicated section of player stats
6. **Management**: Edit or delete adjustments as needed

## Future Enhancements

### Potential Improvements
- Bulk import from CSV/Excel files
- Integration with external tournament APIs
- Photo/receipt attachment for verification
- Approval workflow for team managers
- Automatic opponent team recognition
- Statistical trend analysis including external games
