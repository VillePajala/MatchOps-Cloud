# Robust Alert System

## Overview
The Robust Alert System provides consistent, internationalized user guidance across all roster-related operations. It prevents duplicate alerts, provides clear next-step guidance, and uses native browser confirmations for reliable cross-platform behavior.

## Architecture

### Core Principles
1. **Single Translation Key**: Consistent messaging across multiple entry points
2. **Early Validation**: Checks happen before opening dead-end modals
3. **Dependency Optimization**: useEffect dependencies prevent repeated prompts
4. **Progressive Disclosure**: Guide users to the next logical action

### Alert Types

#### 1. Roster Empty Alerts
**Purpose**: Prevent users from attempting game creation with no players
**Implementation**: Guard conditions in game creation flows

#### 2. Confirmation Alerts
**Purpose**: Destructive action prevention (delete player, delete game, etc.)
**Implementation**: Native `window.confirm()` with i18n strings

#### 3. Impact Warning Alerts
**Purpose**: Inform users of consequences (team deletion affecting games)
**Implementation**: Custom modal dialogs with detailed impact information

## Implementation Details

### Primary Alert Pattern: Empty Roster Detection

#### Location 1: HomePage Initial Action Handler
**File**: `src/components/HomePage.tsx`
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

#### Location 2: HomePage Start New Game Handler
**File**: `src/components/HomePage.tsx`
```typescript
const handleStartNewGame = useCallback(() => {
  // Check if roster is empty first
  if (availablePlayers.length === 0) {
    const shouldOpenRoster = window.confirm(
      t('controlBar.noPlayersForNewGame', 
        'No players in roster. Would you like to add players now?')
    );
    
    if (shouldOpenRoster) {
      setIsRosterModalOpen(true);
    }
    return; // Exit early regardless of user choice
  }
  // ... continue with game creation
}, [availablePlayers.length, t, setIsRosterModalOpen]);
```

#### Location 3: NewGameSetupModal Team Roster Check
**File**: `src/components/NewGameSetupModal.tsx`
```typescript
// When a team is selected but that team has no players,
// prompt the user to manage the team roster.
const shouldManageRoster = window.confirm(
  t('newGameSetupModal.emptyTeamRosterPrompt', 
    'The selected team has no players. Would you like to manage the team roster now?')
);

if (shouldManageRoster && onManageTeamRoster) {
  onManageTeamRoster(teamId);
  return;
}
```
Note: The empty master roster guard happens earlier in `HomePage` when initiating New Game.

### Translation Key Strategy

#### Primary Key: `controlBar.noPlayersForNewGame`
**English** (`public/locales/en/common.json`):
```json
"noPlayersForNewGame": "You need at least one player in your roster to create a game. Would you like to add players now?"
```

**Finnish** (`public/locales/fi/common.json`):
```json
"noPlayersForNewGame": "Tarvitset vähintään yhden pelaajan kokoonpanoon luodaksesi pelin. Haluatko lisätä pelaajia nyt?"
```

#### Variation Keys for Context
- `newGameSetupModal.emptyTeamRosterPrompt`: Shown when a selected team has no players
- `startScreen.needPlayersFirst`: Start screen specific messaging (if defined)
- `gameSettings.noAvailablePlayers`: In-game roster empty scenario (if defined)

### Dependency Management Pattern

#### useEffect Dependency Optimization
```typescript
// GOOD: Minimal dependencies to prevent spam alerts
useEffect(() => {
  // Only trigger when needed
  if (shouldShowAlert && availablePlayers.length === 0) {
    handleEmptyRosterAlert();
  }
}, [availablePlayers.length]); // NOT including all state

// AVOID: Including unnecessary dependencies
useEffect(() => {
  // This would fire too often
}, [availablePlayers, players, gameState, modalOpen]);
```

#### State-Based Alert Prevention
```typescript
const [hasShownEmptyRosterAlert, setHasShownEmptyRosterAlert] = useState(false);

const showEmptyRosterAlert = useCallback(() => {
  if (hasShownEmptyRosterAlert) return; // Prevent duplicates
  
  const shouldOpen = window.confirm(t('controlBar.noPlayersForNewGame'));
  if (shouldOpen) {
    setIsRosterModalOpen(true);
  }
  
  setHasShownEmptyRosterAlert(true);
}, [hasShownEmptyRosterAlert, t, setIsRosterModalOpen]);
```

## Alert Implementation Patterns

### 1. Guard Condition Pattern
**Usage**: Prevent invalid state transitions
```typescript
const handleAction = () => {
  // GUARD: Check preconditions first
  if (invalidCondition) {
    showAlert();
    return; // Early exit prevents invalid flow
  }
  
  // PROCEED: Continue with action
  performAction();
};
```

### 2. Confirmation Pattern
**Usage**: Destructive actions requiring user consent
```typescript
const handleDelete = (itemId: string, itemName: string) => {
  const confirmed = window.confirm(
    t('confirmDelete', 'Delete "{{name}}"? This cannot be undone.', { name: itemName })
  );
  
  if (!confirmed) return;
  
  performDelete(itemId);
};
```

**Examples in Codebase**:
- Player deletion (`src/components/RosterSettingsModal.tsx`)
- Game deletion (`src/components/LoadGameModal.tsx`)
- Team deletion (confirmation modal in `src/components/TeamManagerModal.tsx`)
- Event deletion (`src/components/GameStatsModal.tsx`)

### 3. Impact Warning Pattern
**Usage**: Complex operations with cascading effects
```typescript
const handleTeamDelete = async (teamId: string) => {
  // CALCULATE: Determine impact
  const gamesCount = await countGamesForTeam(teamId);
  
  // SHOW: Detailed impact modal
  setDeleteTeamGamesCount(gamesCount);
  setDeleteConfirmTeamId(teamId);
  
  // MODAL: Custom component with detailed warning
  // Rendered conditionally with impact details
};
```

**Implementation**: `src/components/TeamManagerModal.tsx`
- Shows games affected by team deletion
- Color-coded warning (amber for impact)
- Detailed explanation of consequences

## Advanced Alert Strategies

### 1. Context-Aware Messaging
Different contexts use slightly different phrasing while maintaining consistency:

**Start Screen Context**:
```typescript
// More welcoming, setup-focused
"Let's add some players to get started!"
```

**Mid-Game Context**:
```typescript
// More urgent, action-focused
"You need at least one player to continue. Add players now?"
```

**Setup Modal Context**:
```typescript
// Workflow-focused
"Roster management needed before game setup. Open roster?"
```

### 2. Progressive Alert Chains
Some workflows require multiple alerts in sequence:

```typescript
const handleComplexAction = async () => {
  // STEP 1: Basic validation
  if (basicValidationFails) {
    alert(t('basicError'));
    return;
  }
  
  // STEP 2: Advanced validation with user choice
  if (advancedValidationFails) {
    const shouldProceed = confirm(t('advancedWarning'));
    if (!shouldProceed) return;
  }
  
  // STEP 3: Final confirmation for destructive action
  const finalConfirm = confirm(t('finalConfirmation'));
  if (finalConfirm) {
    await performAction();
  }
};
```

### 3. Alert Timing Optimization

#### Immediate Alerts
- Form validation errors
- Basic precondition failures

#### Deferred Alerts
- Network operation results
- Background process completions

#### Batched Alerts
- Multiple validation failures combined into single message

## Error Handling Integration

### Alert + Logger Pattern
```typescript
const handleAction = async () => {
  try {
    await performAction();
  } catch (error) {
    // LOG: Technical details for debugging
    logger.error('[handleAction] Operation failed:', error);
    
    // ALERT: User-friendly message
    alert(t('actionFailed', 'Operation failed. Please try again.'));
  }
};
```

### Graceful Degradation
```typescript
const showAlert = (messageKey: string, fallback: string) => {
  try {
    const message = t(messageKey, fallback);
    window.confirm(message);
  } catch (translationError) {
    // FALLBACK: English message if i18n fails
    logger.warn('Translation failed, using fallback');
    window.confirm(fallback);
  }
};
```

## Testing Strategies

### Unit Test Mocking
```typescript
// Test setup
beforeEach(() => {
  window.confirm = jest.fn();
});

// Test confirmation path
test('shows confirmation and opens roster on accept', () => {
  (window.confirm as jest.Mock).mockReturnValue(true);
  
  fireEvent.click(newGameButton);
  
  expect(window.confirm).toHaveBeenCalledWith(
    expect.stringContaining('need at least one player')
  );
  expect(mockOpenRoster).toHaveBeenCalled();
});

// Test cancellation path
test('respects user cancellation', () => {
  (window.confirm as jest.Mock).mockReturnValue(false);
  
  fireEvent.click(newGameButton);
  
  expect(window.confirm).toHaveBeenCalled();
  expect(mockOpenRoster).not.toHaveBeenCalled();
});
```

### Integration Test Patterns
```typescript
test('empty roster flow guides user through setup', async () => {
  // GIVEN: Empty roster state
  render(<App />);
  
  // WHEN: User attempts to create game
  fireEvent.click(screen.getByText('New Game'));
  
  // THEN: Guided to roster setup
  expect(screen.getByText(/need at least one player/)).toBeInTheDocument();
  
  // WHEN: User confirms roster setup
  fireEvent.click(screen.getByText('OK'));
  
  // THEN: Roster modal opens
  expect(screen.getByText('Master Roster')).toBeInTheDocument();
});
```

## Browser Compatibility

### Native Alert Advantages
1. **Consistent Behavior**: Works identically across all browsers
2. **Accessibility**: Screen reader compatible
3. **Modal Blocking**: Prevents user interaction during decision
4. **No CSS Dependencies**: Immune to styling conflicts

### Custom Modal Alternative
For branded experiences, custom modals can be substituted:

```typescript
const useAlert = () => {
  const [alert, setAlert] = useState<AlertProps | null>(null);
  
  const confirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlert({
        message,
        onConfirm: () => { setAlert(null); resolve(true); },
        onCancel: () => { setAlert(null); resolve(false); }
      });
    });
  };
  
  return { confirm, AlertComponent: alert ? <AlertModal {...alert} /> : null };
};
```

## Performance Considerations

### Alert Debouncing
For rapid user interactions:
```typescript
const debouncedAlert = useMemo(
  () => debounce((message: string) => {
    window.confirm(message);
  }, 500), // 500ms debounce
  []
);
```

### Memory Cleanup
```typescript
useEffect(() => {
  // Cleanup pending alerts on component unmount
  return () => {
    // Cancel any pending alert timers
    clearTimeout(alertTimer);
  };
}, []);
```

### Alert Queue Management
For complex workflows requiring multiple alerts:
```typescript
const useAlertQueue = () => {
  const [queue, setQueue] = useState<Alert[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processQueue = useCallback(async () => {
    if (isProcessing || queue.length === 0) return;
    
    setIsProcessing(true);
    const current = queue[0];
    
    const result = await showAlert(current);
    
    setQueue(prev => prev.slice(1));
    setIsProcessing(false);
    
    return result;
  }, [queue, isProcessing]);
  
  return { addAlert, processQueue };
};
```

## Future Enhancements

### Planned Features
1. **Toast Notifications**: Non-blocking success messages
2. **Rich Alerts**: Custom modals with icons and actions  
3. **Alert History**: Track user decisions for analytics
4. **Smart Suggestions**: Context-aware next actions
5. **Voice Alerts**: Accessibility enhancement for screen readers

### Integration Roadmap
1. **Push Notifications**: For PWA-installed users (when implemented)
2. **Analytics Tracking**: User decision patterns
3. **A/B Testing**: Message effectiveness optimization
