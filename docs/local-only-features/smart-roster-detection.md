# Smart Roster Detection System

## Overview
The Smart Roster Detection System prevents users from entering dead-end UI states by detecting empty rosters and proactively guiding them to roster management. It provides intelligent state-based UI adaptations across the entire application.

## Core Detection Logic

### App State Detection
**File**: `src/app/page.tsx`

**Primary Detection Formula**:
```typescript
// User classification
const isFirstTimeUser = !hasPlayers || !hasSavedGames;

// State detection in useEffect
const checkAppState = async () => {
  // Check if user has any players in master roster
  const roster = await getMasterRoster();
  setHasPlayers(roster.length > 0);
  
  // Check if user has saved games
  const games = await getSavedGames();
  setHasSavedGames(Object.keys(games).length > 0);
  
  // Check seasons/tournaments
  const seasons = await getSeasons();
  const tournaments = await getTournaments();
  setHasSeasonsTournaments(seasons.length > 0 || tournaments.length > 0);
  
  // Check resume capability
  const lastId = await getCurrentGameIdSetting();
  if (lastId && games[lastId]) {
    setCanResume(true);
  }
};
```

### Boolean State Flags
The system maintains multiple detection states:

- **`hasPlayers`**: Master roster contains at least one player
- **`hasSavedGames`**: At least one saved game exists
- **`hasSeasonsTournaments`**: At least one season or tournament exists
- **`canResume`**: A valid current game exists to resume
- **`isFirstTimeUser`**: Lacks either players OR saved games

## Guard Implementation Patterns

### 1. HomePage Initial Action Guard
**File**: `src/components/HomePage.tsx`

**Context**: When navigating from StartScreen with 'newGame' action
```typescript
case 'newGame':
  // Check if roster is empty before opening new game modal
  if (availablePlayers.length === 0) {
    const shouldOpenRoster = window.confirm(
      t('controlBar.noPlayersForNewGame', 
        'You need at least one player in your roster to create a game. Would you like to add players now?')
    );
    
    if (shouldOpenRoster) {
      setIsRosterModalOpen(true);
    }
  } else {
    setIsNewGameSetupModalOpen(true);
  }
  break;
```

### 2. HomePage Start New Game Handler
**File**: `src/components/HomePage.tsx`

**Context**: Direct new game creation from within HomePage
```typescript
const handleStartNewGame = useCallback(() => {
  // Check if roster is empty first
  if (availablePlayers.length === 0) {
    const shouldOpenRoster = window.confirm(
      t('controlBar.noPlayersForNewGame', 'No players in roster. Would you like to add players now?')
    );
    
    if (shouldOpenRoster) {
      setIsRosterModalOpen(true);
    }
    return; // Exit early regardless of user choice
  }
  
  // Continue with game creation...
}, [availablePlayers.length, t, setIsRosterModalOpen]);
```

## UI Adaptive Behavior

### StartScreen Conditional Rendering
**File**: `src/components/StartScreen.tsx`

The StartScreen uses state flags to show different interfaces:

#### First-Time User Interface
```typescript
{isFirstTimeUser ? (
  /* FIRST-TIME USER: Simplified Interface */
  <div className="...">
    <button onClick={onGetStarted}>
      {t('startScreen.getStarted', 'Get Started')}
    </button>
    <button onClick={() => setIsInstructionsModalOpen(true)}>
      {t('startScreen.howItWorks', 'How It Works')}
    </button>
  </div>
```

#### Experienced User Interface
```typescript
) : (
  /* EXPERIENCED USER: Full-Featured Interface */
  <div className="...">
    {/* Show Setup Roster as primary action for users without players */}
    {!hasPlayers && (
      <button className={primaryButtonStyle} onClick={onSetupRoster}>
        {t('startScreen.setupRoster', 'Setup Team Roster')}
      </button>
    )}
    
    {/* Resume button - always shown, dimmed when unavailable */}
    <button 
      className={canResume ? primaryButtonStyle : disabledButtonStyle}
      onClick={canResume && onResumeGame ? onResumeGame : undefined}
      disabled={!canResume}
    >
      {t('startScreen.resumeGame', 'Resume Last Game')}
    </button>
    
    {/* Other buttons with conditional styling */}
    <button 
      className={hasSavedGames ? primaryButtonStyle : disabledButtonStyle} 
      onClick={hasSavedGames ? onLoadGame : undefined}
      disabled={!hasSavedGames}
    >
      {t('startScreen.loadGame', 'Load Game')}
    </button>
    
    {/* Team/Season management - disabled without players */}
    <button 
      className={hasPlayers ? primaryButtonStyle : disabledButtonStyle}
      onClick={hasPlayers ? onCreateSeason : undefined}
      disabled={!hasPlayers}
    >
      {hasSeasonsTournaments ? 
        t('startScreen.createSeasonTournament', 'Seasons & Tournaments') : 
        t('startScreen.createFirstSeasonTournament', 'First Season/Tournament')
      }
    </button>
  </div>
)}
```

### HomePage Conditional Elements
**File**: `src/components/HomePage.tsx`

Dynamic UI elements are shown based on roster state. For example, when the master roster is empty, the app prompts to manage the roster before allowing new game creation; otherwise full game controls are available. The logic uses `availablePlayers.length` checks and modal states (e.g., opening `RosterSettingsModal` or `NewGameSetupModal`).

## Translation System

### Primary Alert Keys
**File**: `public/locales/en/common.json`
```json
{
  "controlBar": {
    "noPlayersForNewGame": "You need at least one player in your roster to create a game. Would you like to add players now?"
  }
}
```

**File**: `public/locales/fi/common.json`
```json
{
  "controlBar": {
    "noPlayersForNewGame": "Tarvitset vähintään yhden pelaajan kokoonpanoon luodaksesi pelin. Haluatko lisätä pelaajia nyt?"
  }
}
```

### StartScreen State-Based Keys
```json
{
  "startScreen": {
    "getStarted": "Get Started",
    "howItWorks": "How It Works",
    "setupRoster": "Setup Team Roster",
    "resumeGame": "Resume Last Game",
    "loadGame": "Load Game",
    "createSeasonTournament": "Seasons & Tournaments",
    "createFirstSeasonTournament": "First Season/Tournament",
    "manageTeams": "Manage Teams",
    "viewStats": "View Stats"
  }
}
```

## Detection Flow Architecture

### State Flow Diagram
```
App Load
├── runMigration() (data integrity)
├── getMasterRoster() → hasPlayers
├── getSavedGames() → hasSavedGames + canResume  
├── getSeasons/Tournaments() → hasSeasonsTournaments
└── isFirstTimeUser = !hasPlayers || !hasSavedGames

User Action Attempt
├── Check Required State
├── Show Guard Alert (if needed)
├── Route to Appropriate Action
└── Update UI State
```

### Navigation Guard Hierarchy
1. **Primary Guard**: Empty roster detection
2. **Secondary Guard**: Missing game state
3. **Tertiary Guard**: Missing organizational data
4. **UI Adaptation**: Button states and visibility

## Error Handling and Fallbacks

### State Detection Failures
**File**: `src/app/page.tsx`
```typescript
} catch {
  // Graceful degradation on state detection failure
  setCanResume(false);
  setHasSavedGames(false);
  setHasPlayers(false);
  setHasSeasonsTournaments(false);
}
```

### UI Fallbacks
- **Missing Translation**: English fallback text provided in all `t()` calls
- **State Uncertainty**: Conservative assumptions (treat as first-time user)
- **localStorage Corruption**: Empty state initialization

## Implementation Benefits

### 1. Prevents Dead Ends
- **Before**: Users could enter game creation with empty roster
- **After**: Proactive guidance to roster setup
- **Result**: Improved user experience, fewer support questions

### 2. Progressive Disclosure
- **First-time users**: Simple 2-button interface
- **Experienced users**: Full feature set with intelligent disabled states
- **Result**: Reduced cognitive load, faster task completion

### 3. Context-Aware Messaging
- **StartScreen**: Welcoming, setup-focused messaging
- **HomePage**: Urgent, action-focused messaging  
- **Result**: Appropriate tone for user context

## Performance Considerations

### State Detection Optimization
- **Single useEffect**: All state detection in one async operation
- **Minimal Dependencies**: Only re-run when necessary
- **Cached Results**: React state prevents repeated localStorage reads

### UI Rendering Efficiency
- **Conditional Rendering**: Components only mount when needed
- **Button State Caching**: Disabled/enabled states calculated once
- **Translation Memoization**: i18n keys resolved efficiently

## Testing Strategies

### Unit Tests
```typescript
describe('Smart Roster Detection', () => {
  test('detects empty roster state', async () => {
    mockGetMasterRoster.mockResolvedValue([]);
    const { result } = renderHook(() => useAppState());
    await waitFor(() => {
      expect(result.current.hasPlayers).toBe(false);
      expect(result.current.isFirstTimeUser).toBe(true);
    });
  });

  test('shows appropriate UI for first-time users', () => {
    render(<StartScreen isFirstTimeUser={true} hasPlayers={false} />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.queryByText('Resume Last Game')).not.toBeInTheDocument();
  });

  test('guards against empty roster in new game creation', () => {
    render(<HomePage availablePlayers={[]} />);
    fireEvent.click(screen.getByText('New Game'));
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('need at least one player')
    );
  });
});
```

### Integration Tests
- **Full User Journeys**: First-time setup through game creation
- **State Transitions**: Empty → populated roster workflows
- **Cross-Component**: StartScreen → HomePage state consistency

## Migration and Backward Compatibility

### Existing Users
- **Smooth Transition**: Existing rosters automatically detected
- **No Breaking Changes**: All existing games continue to work
- **Progressive Enhancement**: New users get guided experience

### Data Migration
- **Migration Runner**: `runMigration()` ensures data integrity
- **State Validation**: Corrupted data gracefully handled
- **Feature Flags**: Smart detection can be disabled if needed

## Implementation Gotchas

### 1. State Timing Dependencies
**Issue**: App state must be loaded before StartScreen renders
**Solution**: Loading state in parent component, conditional rendering

### 2. localStorage Async Nature
**Issue**: State detection requires async operations  
**Solution**: useEffect with proper error handling and loading states

### 3. First-Time User Definition
**Issue**: What constitutes "first-time" can be ambiguous
**Solution**: Clear boolean logic: `!hasPlayers || !hasSavedGames`

### 4. Translation Key Consistency
**Issue**: Multiple contexts need similar but not identical messaging
**Solution**: Shared base keys with context-specific variations

## Related Features

### Integration Points
- **Master Roster Management**: Source of truth for player detection
- **Saved Games**: Source of truth for game history detection  
- **First Game Onboarding**: Triggered after roster detection
- **Adaptive Start Screen**: Primary UI consuming detection state

### Dependencies
- **localStorage Utils**: Async data access patterns
- **React Query**: State management and caching
- **i18next**: Internationalized messaging system
- **Migration System**: Data integrity and transformation
