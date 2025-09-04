# Master Roster Management

## Overview
The Master Roster Management system provides comprehensive CRUD operations for the global player pool through the RosterSettingsModal component. Post-multi-team refactor, it exclusively manages the master roster with team functionality cleanly separated to avoid UX confusion.

## Architecture

### Core Components
1. **RosterSettingsModal** (`src/components/RosterSettingsModal.tsx`) - Primary UI component
2. **MasterRosterManager** (`src/utils/masterRosterManager.ts`) - High-level API wrapper
3. **MasterRoster Utilities** (`src/utils/masterRoster.ts`) - Core CRUD operations
4. **React Query Integration** - Cache management and state synchronization

### Data Flow
```
RosterSettingsModal → masterRosterManager → masterRoster utils → localStorage
                   ↓
              React Query Cache → UI Updates
```

## Implementation Details

### Storage Architecture
- **LocalStorage Key**: `soccerMasterRoster` (`MASTER_ROSTER_KEY`)
- **Data Format**: `Player[]` - Array of player objects
- **Query Key**: `['masterRoster']` (`queryKeys.masterRoster`)

### Player Interface
```typescript
// From src/types/index.ts
export interface Player {
  id: string;                    // player_timestamp_randomhex
  name: string;                  // Full name (required)
  nickname?: string;             // Optional display name for disc
  relX?: number;                // Field position X (0.0-1.0)
  relY?: number;                // Field position Y (0.0-1.0)
  color?: string;               // Optional disc color override
  isGoalie?: boolean;           // Goalkeeper designation
  jerseyNumber?: string;        // Jersey number (optional)
  notes?: string;               // Coach notes
  receivedFairPlayCard?: boolean; // Fair play award status
}
```

### Core CRUD Operations

#### Get Master Roster
**File**: `src/utils/masterRoster.ts`
```typescript
export const getMasterRoster = async (): Promise<Player[]> => {
  try {
    const rosterJson = getLocalStorageItem(MASTER_ROSTER_KEY);
    if (!rosterJson) return Promise.resolve([]);
    return Promise.resolve(JSON.parse(rosterJson) as Player[]);
  } catch (error) {
    logger.error('[getMasterRoster] Error:', error);
    return Promise.resolve([]); // Fail gracefully
  }
};
```

#### Add Player
**File**: `src/utils/masterRoster.ts`
- **Validation**: Name cannot be empty (trimmed)
- **ID Generation**: `player_${Date.now()}_${randomHex}`
- **Defaults**: `isGoalie: false`, `receivedFairPlayCard: false`
- **Return**: Player object with ID or null on failure

```typescript
// Manager wrapper (src/utils/masterRosterManager.ts)
export const addPlayer = async (
  playerData: Omit<Player, 'id' | 'isGoalie' | 'receivedFairPlayCard'>
): Promise<Player | null> => {
  try {
    const newPlayer = await utilAddPlayerToRoster(playerData);
    return newPlayer;
  } catch (error) {
    logger.error("Error in addPlayer:", error);
    return null;
  }
};
```

#### Update Player
**File**: `src/utils/masterRoster.ts`
- **Validation**: Player ID required, name cannot be empty if updating
- **Partial Updates**: Only specified fields are changed
- **Name Trimming**: Automatic whitespace cleanup
- **Return**: Updated Player object or null if not found

#### Remove Player
**File**: `src/utils/masterRoster.ts`
- **Safety**: Validates player ID exists before removal
- **Return**: Boolean indicating success/failure

#### Goalkeeper Management
**File**: `src/utils/masterRoster.ts`
- **Exclusive Logic**: Only one goalkeeper allowed at a time
- **Auto-unset**: When setting new goalkeeper, removes flag from all others
- **Two-pass Algorithm**: Ensures target player definitely gets goalkeeper status

```typescript
// Key logic
const updatedRoster = currentRoster.map(player => {
  if (player.id === playerId) {
    targetPlayer = { ...player, isGoalie };
    return targetPlayer;
  }
  // Unset other goalies when setting new one
  if (isGoalie && player.isGoalie) {
    return { ...player, isGoalie: false };
  }
  return player;
});
```

## React Query Integration

### Query Key Structure
**File**: `src/config/queryKeys.ts`
```typescript
masterRoster: ['masterRoster'] as const,
```

### Cache Invalidation Patterns
- **After Add**: Invalidates master roster cache
- **After Update**: Invalidates master roster cache
- **After Delete**: Invalidates master roster cache
- **Team Operations**: Does NOT invalidate master roster (separation of concerns)

## UI Component Architecture

### RosterSettingsModal Props
**File**: `src/components/RosterSettingsModal.tsx`
```typescript
interface RosterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: Player[];           // Current roster data
  onRenamePlayer: (playerId: string, playerData: { name: string; nickname: string }) => void;
  onSetJerseyNumber: (playerId: string, number: string) => void;
  onSetPlayerNotes: (playerId: string, notes: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddPlayer: (playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => void;
  isRosterUpdating?: boolean;           // Loading state
  rosterError?: string | null;          // Error display
  onOpenPlayerStats: (playerId: string) => void;
}
```

### Key UI Features

#### Player Search/Filter
**File**: `src/components/RosterSettingsModal.tsx`
- **Real-time filtering**: Name and nickname search
- **Case-insensitive**: Uses `toLowerCase()` matching
- **Focus prevention**: Prevents stealing focus during add operations

#### Inline Editing
**File**: `src/components/RosterSettingsModal.tsx`
- **Single-player mode**: Only one player editable at a time
- **Form validation**: Name required, trimmed before save
- **Auto-scroll**: Edited player scrolls into view
- **Escape/Enter**: Keyboard shortcuts for cancel/save

#### Add Player Form
**File**: `src/components/RosterSettingsModal.tsx`
- **Grid layout**: Name/nickname on same row for mobile
- **Jersey number**: Max 3 characters, centered input
- **Notes**: Textarea with fixed height (h-20)
- **Focus management**: Proper tabbing and mobile focus handling

### Removed Functionality (Post Multi-Team)

#### Team Name Management
**Previously**: Lines 265-293 in original component
- Team name input field removed
- Team name validation logic removed
- Team name state management removed

#### Player Selection Checkboxes
**File**: Component refactor (December 2024)
- Selection checkboxes completely removed
- "Selected" counter removed from header
- Grid layout simplified (no checkbox column)
- Separation of concerns: game selection vs roster management

**Rationale**: 
```
OLD BEHAVIOR: RosterSettings controlled game player selection
NEW BEHAVIOR: GameSettings controls game player selection
             RosterSettings only manages master roster
```

## Translation Keys

### English Translations
**File**: `public/locales/en/common.json`
```json
{
  "rosterSettingsModal": {
    "title": "Master Roster",
    "addPlayerButton": "Add Player",
    "nameRequired": "Player name cannot be empty.",
    "confirmDeletePlayer": "Are you sure you want to remove this player?"
  }
}
```

### Finnish Translations
**File**: `public/locales/fi/common.json`
```json
{
  "rosterSettingsModal": {
    "title": "Pääkokoonpano",
    "addPlayerButton": "Lisää Pelaaja",
    "nameRequired": "Pelaajan nimi ei voi olla tyhjä.",
    "confirmDeletePlayer": "Haluatko varmasti poistaa tämän pelaajan?"
  }
}
```

## Error Handling

### Validation Errors
1. **Empty Name**: Shows alert with translated message
2. **Player Not Found**: Logs error, returns null gracefully
3. **localStorage Failure**: Logs error, returns empty array/false

### Loading States
- **isRosterUpdating**: Disables all form interactions
- **Mutation pending**: Shows "Adding...", "Saving..." text
- **Error display**: Red text below forms when rosterError present

## Integration Points

### HomePage Integration
**File**: `src/components/HomePage.tsx`
- **Props removed**: No longer passes team name or selection props
- **Focus**: Pure master roster management only
- **Callback**: Player stats modal opening handled

### Team System Integration
- **Master as Source**: Team rosters built by selecting from master
- **Name Matching**: Team player selection uses normalized name comparison
- **Independence**: Changes to master don't affect existing team rosters automatically
- **Pre-selection**: New game setup pre-selects team players from master pool

## Multi-Team Architecture Impact

### Clear Separation of Concerns
Post-multi-team implementation, the master roster serves as the authoritative player pool:

```
MASTER ROSTER (Global)
├── Team A Roster (Subset)
├── Team B Roster (Subset)
└── Available for Games (Full set)
```

### Team Player Selection Flow
1. **New Game Setup**: Select team → Pre-populate from team roster → Can add/remove from master pool
2. **Game Settings**: Modify current game selection without affecting team membership
3. **Team Roster**: Select from master → Create team-specific subset with new IDs

### Guest Player Handling
**Scenario**: Coach adds temporary player during game
- **Method**: Via GameSettingsModal, not RosterSettingsModal
- **Effect**: Guest stats count toward team statistics
- **Persistence**: Guest exists only for that game session
- **Master Roster**: Remains unchanged unless explicitly added

## Implementation Gotchas

### 1. Goalkeeper Logic Complexity
**Issue**: Setting new goalkeeper must unset all others
**Solution**: Two-pass algorithm ensures consistency
```typescript
// First pass: Handle target player and unset others
// Second pass: Guarantee target player is set if isGoalie=true
if (isGoalie) {
  finalRoster = updatedRoster.map(p => {
    if (p.id === playerId) return { ...p, isGoalie: true };
    if (p.id !== playerId && p.isGoalie) return { ...p, isGoalie: false };
    return p;
  });
}
```

### 2. Form State Management
**Challenge**: Multiple editing modes (add/edit) with proper focus
**Solution**: Careful state isolation and focus management
- `editingPlayerId` vs `isAddingPlayer` - mutually exclusive
- Auto-focus on mode entry with setTimeout for DOM update
- Proper cleanup on modal close

### 3. Search with Add Form
**Issue**: Search input stealing focus during add operations
**Solution**: Focus prevention during add mode
```typescript
onFocus={(e) => {
  if (isAddingPlayer) {
    e.target.blur(); // Prevent focus stealing
  }
}}
```

### 4. Mobile Layout Responsiveness
**Consideration**: Grid layouts adapt for small screens
- Name/nickname: Same row on larger screens, stacked on mobile
- Jersey number: Fixed width (w-24) stays centered
- Action buttons: Horizontal layout maintained

## Performance Considerations

### Optimization Strategies
1. **React.memo**: Player rows memoized for large rosters
2. **Virtualization**: Planned for rosters >100 players
3. **Debounced search**: Real-time filtering without excessive re-renders
4. **Minimal re-queries**: Focused cache invalidation

### Memory Management
- **Player references**: Uses refs array for scroll-to-edit functionality
- **Focus management**: Automatic cleanup on modal close
- **Effect cleanup**: Event listeners properly removed

## Testing Strategy

### Unit Tests
**File**: `src/components/RosterSettingsModal.test.tsx`
- **CRUD Operations**: Add, edit, delete player flows
- **Validation**: Empty name handling, error states
- **UI State**: Modal open/close, editing modes
- **Props Integration**: Callback invocation with correct parameters

### Integration Points
- **React Query**: Cache invalidation after mutations
- **localStorage**: Data persistence across sessions
- **Translation**: i18n key resolution and fallbacks
- **Team Integration**: Master roster changes don't break team associations

## Migration Notes

### Data Integrity
- **Existing Games**: Continue using saved `availablePlayers` array
- **Team References**: Teams reference master players by name matching
- **Backward Compatibility**: No breaking changes to saved game format

### UI Evolution
```
v1.0: Roster + Team Name + Selection
v1.5: Roster + Selection (Team removed)
v2.0: Pure Roster Management (Selection removed)
```

Each evolution removed confusion while maintaining core functionality.

## Development Workflow

### Adding New Master Roster Features
1. **Update Player Interface**: Modify `src/types/index.ts`
2. **Extend CRUD Operations**: Add to `src/utils/masterRoster.ts`
3. **Update Manager Wrapper**: Add to `src/utils/masterRosterManager.ts`
4. **Modify UI Component**: Update `RosterSettingsModal.tsx`
5. **Add Translations**: Update both language files
6. **Write Tests**: Cover new functionality
7. **Update Documentation**: Reflect changes here

### Debugging Common Issues
1. **Player Not Saving**: Check localStorage quota, network inspector
2. **UI Not Updating**: Verify React Query cache invalidation
3. **Translation Missing**: Check both en/fi locale files
4. **Focus Issues**: Review tab order and mobile focus handling

## Future Enhancements

### Planned Features
1. **Bulk Operations**: Import/export players via CSV
2. **Player Photos**: Avatar images with localStorage caching
3. **Position Preferences**: Track preferred field positions
4. **Performance Metrics**: Historical player performance tracking
5. **Advanced Search**: Filter by jersey number, position, notes

### Performance Optimization Roadmap
1. **Virtual Scrolling**: For rosters >100 players
2. **Lazy Loading**: Progressive player data loading
3. **Worker Threads**: Background data processing for large operations
4. **Compressed Storage**: JSON compression for localStorage efficiency
