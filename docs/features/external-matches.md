# Player Stat Adjustments (External Game Stats)

## Overview
Individual player stat adjustment system that allows manual addition of statistics from games played outside the app. Integrates seamlessly into player profiles and statistical calculations.

**⚠️ Implementation Note**: This document focuses on UI/UX behavior and business logic. The following technical aspects are NOT covered and must be investigated in the target app version before implementation:
- Data storage mechanisms (how adjustments are persisted and retrieved)
- State management approach (how adjustment state is handled across components)
- Authentication requirements (if user identity affects adjustment permissions)
- Performance considerations for stat calculations (how adjustments integrate with game stats)

## Business Logic

### Core Data Structure
```typescript
interface PlayerStatAdjustment {
  id: string;                    // Unique identifier
  playerId: string;              // Player being adjusted
  seasonId?: string;             // Optional season association
  teamId?: string;               // Optional team context
  tournamentId?: string;         // Optional tournament context
  externalTeamName?: string;     // Team player represented
  opponentName?: string;         // Opposition team name
  scoreFor?: number;             // Player's team score
  scoreAgainst?: number;         // Opposition score
  gameDate?: string;             // Game date (ISO string)
  homeOrAway?: 'home' | 'away' | 'neutral';
  includeInSeasonTournament?: boolean; // Include in season/tournament stats
  gamesPlayedDelta: number;      // Games to add (can be 0)
  goalsDelta: number;            // Goals to add (can be 0)
  assistsDelta: number;          // Assists to add (can be 0)
  note?: string;                 // Optional description
  createdBy?: string;            // Optional user identifier
  appliedAt: string;             // ISO timestamp of creation
}
```

### Adjustment Integration Logic
- **Always Included**: Adjustments always count toward individual player career statistics
- **Optional Season/Tournament Inclusion**: `includeInSeasonTournament` flag controls context-specific stats
- **Delta-Based**: Uses positive delta values (negative stats not allowed in UI)
- **Cumulative**: Multiple adjustments for same player are additive

### Validation Rules
1. **Required Fields**: `externalTeamName` and `opponentName` must be non-empty strings
2. **Non-Negative Stats**: `gamesPlayedDelta`, `goalsDelta`, `assistsDelta` must be >= 0
3. **Minimum Data**: At least one of games, goals, or assists must be > 0
4. **Realistic Limits**: Goals and assists cannot exceed 20 per game (20 * gamesPlayedDelta)
5. **Season Dependency**: If no seasons exist, user must create season first

## UI/UX Implementation Details

### Access Point
**Location**: Within Player Stats View component
**Trigger**: "Add external stats" button below player statistics summary
**Button Styling**:
```css
text-sm px-3 py-1.5 bg-slate-700 rounded 
border border-slate-600 hover:bg-slate-600
```

### Form Interface

**Form Container**:
```css
mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 
bg-slate-800/60 p-4 rounded-lg border border-slate-600
```

**Form Fields Layout** (responsive grid):

**Season Selection**:
- **Type**: Dropdown select
- **Options**: "No season" + all available seasons
- **Styling**: `bg-slate-700 border border-slate-600 rounded-md text-white px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500`
- **Behavior**: Optional field, can be left unselected

**Tournament Selection**:
- **Type**: Dropdown select  
- **Options**: "No tournament" + filtered tournaments for selected season
- **Dependency**: Tournament list updates when season changes
- **Styling**: Same as season select

**External Team Name**:
- **Type**: Text input
- **Required**: Yes
- **Validation**: Must be non-empty after trim()
- **Placeholder**: Player's team name for the external game

**Opponent Name**:
- **Type**: Text input
- **Required**: Yes
- **Validation**: Must be non-empty after trim()
- **Placeholder**: Opposition team name

**Score Fields**:
- **Team Score**: Number input for player's team score
- **Opponent Score**: Number input for opposition score
- **Optional**: Both can be left empty
- **Type**: `number` inputs allowing empty string

**Game Date**:
- **Type**: Date input
- **Optional**: Can be left empty
- **Default**: Current date when form opens
- **Format**: Standard HTML date input (YYYY-MM-DD)

**Home/Away/Neutral**:
- **Type**: Dropdown select
- **Options**: "Home", "Away", "Neutral"
- **Default**: "Neutral"
- **Context**: Relative to the external team the player represented

**Statistics Inputs**:
- **Games Played**: Number input, default 1, min 0
- **Goals**: Number input, default 0, min 0  
- **Assists**: Number input, default 0, min 0
- **Styling**: Same as other form inputs

**Include in Season/Tournament Stats**:
- **Type**: Checkbox
- **Default**: false (unchecked)
- **Behavior**: When checked, stats count toward season/tournament totals

**Notes**:
- **Type**: Textarea
- **Optional**: Free-form text field
- **Usage**: Coach observations, context, special circumstances

### Form Behavior

**Submission Process**:
1. Client-side validation runs on form submit
2. Validation errors show as browser alerts with translated messages
3. Success creates new adjustment and updates player stats immediately
4. Form resets to default values after successful submission
5. Form collapses after successful submission

**Validation Error Messages**:
- Season required (when no seasons exist)
- Team name required
- Opponent name required  
- Negative stats error
- Empty stats error (all zeros)
- Unrealistic goals/assists per game

**Form Reset Values**:
- Games: 1
- Goals: 0
- Assists: 0
- Notes: empty
- Tournament: empty
- External team: empty
- Opponent: empty
- Scores: empty
- Date: current date
- Home/Away: "Neutral"
- Include in season: false

### Adjustment Display

**Integration Location**: Within player statistics, adjustments are seamlessly integrated into totals
**Visual Indication**: No special visual distinction - adjustments appear as part of normal stats
**Calculation**: Player stats include both game-based stats and all adjustments combined

### Management Capabilities

**CRUD Operations Available**:
- **Create**: Via the form interface described above
- **Read**: Adjustments are visible in calculated player statistics
- **Update**: Edit existing adjustments (editing functionality exists)
- **Delete**: Remove adjustments (deletion functionality exists)

**Edit/Delete Interface**:
- Adjustments can be edited after creation
- Editing populates the same form with existing values
- Deletion removes adjustment and recalculates player stats
- Edit state managed via `editingAdjId` state variable

## Responsive Design

**Breakpoint Behavior**:
- **Mobile (< sm)**: Single column form layout
- **Tablet (sm)**: Two-column form layout
- **Desktop (lg)**: Three-column form layout

**Form Field Widths**: All inputs use `w-full` for consistent column filling

## Internationalization

**Translation Keys Used**:
- `playerStats.addExternalStats` (default: "Add external stats")
- `playerStats.season` (default: "Season")
- `playerStats.noSeason` (default: "No season")
- `playerStats.homeAway` (default: "Home/Away")
- `playerStats.home` (default: "Home")
- `playerStats.away` (default: "Away")
- `playerStats.neutral` (default: "Neutral")
- `playerStats.seasonRequired` (default: "Please create a season first.")
- `playerStats.teamRequired` (default: "Team name is required.")
- `playerStats.opponentRequired` (default: "Opponent name is required.")
- `playerStats.negativeStatsError` (default: "Stats cannot be negative.")
- `playerStats.emptyStatsError` (default: "Please enter at least one statistic (games, goals, or assists).")
- `playerStats.unrealisticGoalsError` (default: "Goals per game seems unrealistic. Please check your input.")
- `playerStats.unrealisticAssistsError` (default: "Assists per game seems unrealistic. Please check your input.")

## Integration Points

### Player Statistics Calculation
- Adjustments are passed to `calculatePlayerStats` function via `adjustments` parameter
- Statistics totals include both app-recorded games and manual adjustments
- No visual distinction between sources in final display

### Season/Tournament Context
- Adjustments can be associated with specific seasons/tournaments
- `includeInSeasonTournament` flag controls whether adjustment appears in context-specific reports
- Tournament dropdown filters based on selected season

### Data Persistence
- Adjustments stored by player ID in indexed structure
- Each player can have multiple adjustments
- Adjustments persist independently of games and roster changes

## Form Interaction Patterns

### Real-Time Validation
- **On Blur**: Validate individual fields when user leaves them
- **On Submit**: Comprehensive validation before submission
- **Visual Feedback**: Invalid fields should show error styling immediately

### Dependent Field Logic
```typescript
// Tournament dropdown updates when season changes
useEffect(() => {
  if (selectedSeasonId) {
    const seasonTournaments = tournaments.filter(t => t.seasonId === selectedSeasonId);
    setAvailableTournaments(seasonTournaments);
  }
}, [selectedSeasonId, tournaments]);
```

### Form State Management
- **Optimistic Updates**: Show changes immediately, revert on error
- **Loading States**: Disable form during submission
- **Reset Behavior**: Clear form after successful submission

### Field Interdependencies  
- Tournament options depend on selected season
- "Include in Season/Tournament" only available if season/tournament selected
- Realistic stats validation based on games played value

## Key Behaviors Summary

1. **Individual Player Focus**: Adjustments are player-specific, not game-specific
2. **Statistical Integration**: Seamlessly adds to player career totals
3. **Context Flexibility**: Optional season/tournament association
4. **Simple UI**: Single form interface for all adjustment creation
5. **Validation Heavy**: Extensive client-side validation prevents invalid data
6. **Immediate Updates**: Stats update instantly after adjustment creation
7. **Delta-Based**: Uses positive increments rather than absolute values
8. **Interactive Forms**: Real-time validation and dependent field updates