# Seasons & Tournaments – Roster-Decoupled

## Overview
Seasons and tournaments are global organizational entities used to group games. They no longer manage or carry any roster/team-specific data, maintaining clean separation of concerns in the multi-team architecture.

## Architecture Changes

### Decoupled Design
- **Before**: Seasons/tournaments had team references and roster management
- **After**: Pure organizational entities with no roster ties
- **Benefit**: Prevents data duplication, enables multi-team support

## Data Structures

### Season Interface
**File**: `src/types/index.ts`
```typescript
export interface Season {
  id: string;                    // season_timestamp_randomhex
  name: string;                  // Display name
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
  // Note: teamId removed - seasons are global entities
  // Note: roster management removed - teams handle rosters
}
```

### Tournament Interface
**File**: `src/types/index.ts`
```typescript
export interface Tournament {
  id: string;                    // tournament_timestamp_randomhex
  name: string;                  // Display name
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
  // Note: teamId removed - tournaments are global entities
  // Note: roster management removed - teams handle rosters
}
```

## Storage Implementation

### localStorage Keys
**File**: `src/config/storageKeys.ts`
- `SEASONS_LIST_KEY`: Storage key for seasons array
- `TOURNAMENTS_LIST_KEY`: Storage key for tournaments array

### CRUD Operations

#### Seasons Management
**File**: `src/utils/seasons.ts`

**Get All Seasons**:
```typescript
export const getSeasons = async (): Promise<Season[]> => {
  try {
    const seasonsJson = getLocalStorageItem(SEASONS_LIST_KEY);
    if (!seasonsJson) return Promise.resolve([]);
    const seasons = JSON.parse(seasonsJson) as Season[];
    return Promise.resolve(seasons.map(s => ({ ...s, ageGroup: s.ageGroup ?? undefined })));
  } catch (error) {
    logger.error('[getSeasons] Error reading seasons from localStorage:', error);
    return Promise.resolve([]);
  }
};
```

**Add Season**:
- **Validation**: Name trimming, duplicate prevention
- **ID Generation**: `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
- **Extra Fields**: Merges optional properties via spread operator

**Update Season**:
- **Validation**: ID existence, name uniqueness (excluding self)
- **Atomic Update**: Full array replacement for consistency

**Delete Season**:
- **Safety**: Validates ID exists before deletion
- **Array Filter**: Removes by ID, maintains order

#### Tournaments Management
**File**: `src/utils/tournaments.ts`

**Get All Tournaments**:
```typescript
export const getTournaments = async (): Promise<Tournament[]> => {
  try {
    const tournamentsJson = getLocalStorageItem(TOURNAMENTS_LIST_KEY);
    if (!tournamentsJson) return Promise.resolve([]);
    const tournaments = JSON.parse(tournamentsJson) as Tournament[];
    return Promise.resolve(
      tournaments.map(t => ({
        ...t,
        level: t.level ?? undefined,
        ageGroup: t.ageGroup ?? undefined,
      }))
    );
  } catch (error) {
    logger.error('[getTournaments] Error getting tournaments from localStorage:', error);
    return Promise.resolve([]);
  }
};
```

**Tournament-Specific Features**:
- **Level Validation**: Tournament level (Regional, National) handling
- **Age Group Normalization**: Consistent undefined handling
- **Extra Properties**: Level and age group special handling in `addTournament`

## React Query Integration

### Query Keys
**File**: `src/config/queryKeys.ts`
```typescript
seasons: ['seasons'] as const,
tournaments: ['tournaments'] as const,
```

### Data Fetching
**File**: `src/hooks/useGameDataQueries.ts`
- Seasons and tournaments fetched independently
- No team dependencies in query logic
- Global availability across all components

## UI Integration

### Season/Tournament Management Modal
**File**: `src/components/SeasonTournamentManagementModal.tsx`
- **Pure CRUD Interface**: No roster management UI
- **Global Entity Lists**: Shows all seasons/tournaments regardless of team context
- **Consistent Forms**: Add/edit forms use same validation as utils

### Game Settings Integration
**File**: `src/components/GameSettingsModal.tsx`
- **Selection Lists**: Populates dropdowns from global seasons/tournaments
- **No Filtering**: All seasons/tournaments available regardless of team selection
- **ID References**: Games store season/tournament IDs, not full objects

## Migration and Backward Compatibility

### Data Cleanup
**Implementation Note**: Comments in type definitions indicate removal of:
- `teamId` references from Season/Tournament interfaces
- Roster management properties
- Team-specific data

### Game References
- **Existing Games**: Continue using season/tournament IDs in saved game data
- **Display**: Season/tournament names resolved by ID lookup
- **Stats Filtering**: Season/tournament filtering works independent of team selection

## Implementation Benefits

### 1. Clean Separation of Concerns
```
SEASONS/TOURNAMENTS (Global)
├── Organizational metadata only
├── No roster dependencies
└── Available to all teams

TEAMS (Team-specific)
├── Team rosters and players
├── Team-specific settings
└── Can participate in any season/tournament
```

### 2. Multi-Team Support
- Multiple teams can participate in same season/tournament
- No conflicts between team rosters and season data
- Simplified game creation across teams

### 3. Simplified Data Model
- **Before**: Complex nested roster data in seasons
- **After**: Flat, focused entity structures
- **Result**: Easier maintenance and fewer bugs

## Validation and Error Handling

### Name Validation
- **Trimming**: Automatic whitespace cleanup
- **Uniqueness**: Case-insensitive duplicate prevention
- **Required**: Empty name validation with user-friendly errors

### Data Integrity
- **JSON Parsing**: Graceful fallback to empty arrays on corruption
- **Property Normalization**: Consistent undefined handling for optional fields
- **Atomic Operations**: Full data replacement prevents partial corruption

## Testing Strategy

### Unit Tests
- **CRUD Operations**: Add, update, delete functionality
- **Validation**: Edge cases and error conditions
- **Data Integrity**: localStorage corruption scenarios

### Integration Tests
- **UI Components**: Season/tournament selection workflows
- **Game Creation**: Season/tournament assignment in games
- **Multi-Team**: Same season/tournament used by different teams

## Usage Examples

### Creating a Season
```typescript
const newSeason = await addSeason("Spring 2024", {
  ageGroup: "U12",
  startDate: "2024-03-01",
  endDate: "2024-06-01",
  periodCount: 4,
  periodDuration: 12
});
```

### Game Assignment
```typescript
// Games reference seasons/tournaments by ID only
const gameData = {
  seasonId: "season_1699123456_abc123",
  tournamentId: null, // Optional
  // ... other game data
};
```

### Multi-Team Scenario
```typescript
// Team A and Team B can both play in same season
const teamAGame = { teamId: "team_a", seasonId: "season_spring_2024" };
const teamBGame = { teamId: "team_b", seasonId: "season_spring_2024" };
```

## Performance Considerations

### Data Loading
- **Lazy Loading**: Seasons/tournaments loaded only when needed
- **Caching**: React Query provides automatic caching
- **Minimal Payloads**: No unnecessary roster data in season/tournament objects

### Storage Efficiency
- **Flat Structure**: No nested team/roster objects
- **ID References**: Games store IDs, not full season/tournament data
- **Selective Loading**: Only load seasons/tournaments when required

## Related Documentation
- **Team Management**: `team-management.md` - How teams work with seasons/tournaments
- **Multi-Team Architecture**: `../../MULTI-TEAM-SUPPORT.md` - Overall design philosophy
- **Master Roster**: `master-roster-management.md` - Player pool management
