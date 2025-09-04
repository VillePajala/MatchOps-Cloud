# Robust Alert System (Native Browser Dialogs)

## Overview
Consistent user guidance system using native browser alerts (`window.alert()`) and confirmations (`window.confirm()`) for validation, error handling, and destructive action confirmation across the application.

**⚠️ Implementation Note**: This document focuses on UI/UX behavior and business logic. The following technical aspects are NOT covered and must be investigated in the target app version before implementation:
- Data storage mechanisms (how validation state is tracked)
- State management approach (how alert responses affect app state)
- Authentication requirements (if user identity affects alert behavior)
- Performance considerations for alert timing and user experience

## Business Logic

### Alert System Architecture
The app uses native browser dialogs for maximum compatibility and consistency:

**Alert Types Used**:
1. **`window.alert()`**: For informational messages, validation errors, and operation results
2. **`window.confirm()`**: For yes/no confirmations, especially destructive actions

**Benefits of Native Dialogs**:
- Cross-platform consistency
- No additional library dependencies
- Reliable user interaction patterns
- Automatic focus management and accessibility

### Alert Usage Patterns

**Form Validation**:
```typescript
// Player name validation
if (!trimmedName) {
  alert(t('rosterSettingsModal.nameRequired', 'Player name cannot be empty.') || 'Player name cannot be empty.');
  return;
}
```

**Destructive Action Confirmation**:
```typescript
// Delete confirmation
if (window.confirm(t('gameStatsModal.confirmDeleteEvent', 'Are you sure you want to delete this event? This cannot be undone.'))) {
  // Proceed with deletion
}
```

**Operation Status Feedback**:
```typescript
// Success/failure notifications
alert(i18n.t("fullBackup.exportSuccess"));
alert(i18n.t("fullBackup.exportError"));
```

## UI/UX Implementation Details

### Form Validation Alerts

**Player Management Validation**:
- **Empty Name**: `rosterSettingsModal.nameRequired` - "Player name cannot be empty."
- **Team Name Required**: `playerStats.teamRequired` - "Team name is required."
- **Opponent Required**: `playerStats.opponentRequired` - "Opponent name is required."
- **Season Required**: `playerStats.seasonRequired` - "Please create a season first."
- **Invalid Stats**: `playerStats.negativeStatsError` - "Stats cannot be negative."
- **Empty Stats Error**: `playerStats.emptyStatsError` - "Please enter at least one statistic."

**Game Data Validation**:
- **Invalid Time Format**: `gameStatsModal.invalidTimeFormat` - "Invalid time format. MM:SS"
- **Scorer Required**: `gameStatsModal.scorerRequired` - "Scorer must be selected."

### Confirmation Dialog Patterns

**Delete Operations**:
```typescript
// Player deletion
if (window.confirm(t('rosterSettingsModal.confirmDeletePlayer', 'Are you sure you want to remove this player?'))) {
  onRemovePlayer(player.id);
}

// Game deletion
if (window.confirm(t('loadGameModal.deleteConfirm', 'Are you sure you want to delete the saved game "{gameName}"? This action cannot be undone.'))) {
  // Proceed with deletion
}

// Event deletion
if (window.confirm(t('gameStatsModal.confirmDeleteEvent', 'Are you sure you want to delete this event? This cannot be undone.'))) {
  // Delete event
}
```

**Data Management Operations**:
```typescript
// Hard reset confirmation
if (window.confirm(t('controlBar.hardResetConfirmation', 'Are you sure you want to completely reset the application? All saved data (players, stats, positions) will be permanently lost.'))) {
  // Reset application
}

// Backup restore confirmation
if (!window.confirm(i18n.t("fullBackup.confirmRestore"))) {
  return; // User cancelled
}
```

**Smart Roster Detection**:
```typescript
// No players warning with roster redirect
const shouldOpenRoster = window.confirm(
  t('controlBar.noPlayersForNewGame', 'You need at least one player in your roster to create a game. Would you like to add players now?')
);
if (shouldOpenRoster) {
  // Open roster management
}

// New game confirmation when unsaved changes exist
if (window.confirm(t('controlBar.startNewMatchConfirmation', 'Are you sure you want to start a new match? Any unsaved progress will be lost.'))) {
  // Start new match
}
```

### Success and Error Feedback

**Backup/Restore Operations**:
- **Export Success**: `fullBackup.exportSuccess`
- **Export Error**: `fullBackup.exportError` 
- **Restore Success**: `fullBackup.restoreSuccess`
- **Restore Error**: `fullBackup.restoreError`
- **Restore Key Error**: `fullBackup.restoreKeyError`

**File Operation Feedback**:
- Delayed success messages for file download operations
- Error messages with specific error details
- Context-aware messaging based on operation type

## Alert Content Structure

### Validation Error Messages
**Format**: Direct, actionable feedback
```
❌ "Player name cannot be empty."
❌ "Invalid time format. MM:SS"
❌ "Scorer must be selected."
```

### Confirmation Dialogs
**Format**: Clear question with consequence explanation
```
❓ "Are you sure you want to remove this player?"
❓ "Are you sure you want to delete this event? This cannot be undone."
❓ "Are you sure you want to completely reset the application? All saved data will be permanently lost."
```

### Smart Guidance Messages
**Format**: Problem explanation + suggested action
```
💡 "You need at least one player in your roster to create a game. Would you like to add players now?"
💡 "Are you sure you want to start a new match? Any unsaved progress will be lost."
```

## Internationalization

### Translation Key Structure

**Validation Messages**:
- `rosterSettingsModal.nameRequired`
- `playerStats.teamRequired`
- `playerStats.opponentRequired`
- `playerStats.seasonRequired`
- `playerStats.negativeStatsError`
- `playerStats.emptyStatsError`
- `gameStatsModal.invalidTimeFormat`
- `gameStatsModal.scorerRequired`

**Confirmation Messages**:
- `rosterSettingsModal.confirmDeletePlayer`
- `loadGameModal.deleteConfirm`
- `gameStatsModal.confirmDeleteEvent`
- `controlBar.hardResetConfirmation`
- `controlBar.startNewMatchConfirmation`
- `seasonTournamentModal.confirmDelete`
- `orphanedGames.confirmDelete`

**Status Messages**:
- `fullBackup.exportSuccess`
- `fullBackup.exportError`
- `fullBackup.restoreSuccess`
- `fullBackup.restoreError`
- `fullBackup.restoreKeyError`
- `fullBackup.confirmRestore`

**Smart Detection Messages**:
- `controlBar.noPlayersForNewGame`

### Language Support
- **Complete English/Finnish Coverage**: All alert messages have translations
- **Fallback Handling**: Default English text provided when translations missing
- **Dynamic Content**: Messages include dynamic data (player names, counts, etc.)
- **Contextual Translation**: Messages preserve meaning across languages

### Translation Examples
```typescript
// English/Finnish examples
"Are you sure you want to remove this player?" / "Oletko varma, että haluat poistaa tämän pelaajan?"
"Player name cannot be empty." / "Pelaajan nimi ei voi olla tyhjä."
"Invalid time format. MM:SS" / "Virheellinen aikamuoto. MM:SS"
```

## Implementation Patterns

### Validation Flow
```typescript
const handleSave = () => {
  // 1. Validate input
  if (!isValid) {
    alert(t('validationMessage'));
    return; // Stop execution
  }
  
  // 2. Proceed with operation
  performSave();
};
```

### Confirmation Flow
```typescript
const handleDelete = () => {
  // 1. Ask for confirmation
  const confirmed = window.confirm(t('confirmationMessage'));
  
  // 2. Proceed only if confirmed
  if (confirmed) {
    performDelete();
  }
  // 3. Do nothing if cancelled
};
```

### Error Handling Flow
```typescript
const handleOperation = async () => {
  try {
    await performOperation();
    alert(t('successMessage'));
  } catch (error) {
    alert(t('errorMessage', { error: error.message }));
  }
};
```

## User Experience Considerations

### Timing and Context
- **Immediate Validation**: Alerts appear immediately on form submission
- **Pre-Action Confirmation**: Confirmations appear before destructive actions
- **Post-Action Feedback**: Success/error messages appear after operation completion
- **Smart Interruption**: Alerts only interrupt when necessary

### Message Clarity
- **Direct Language**: Clear, concise messaging without technical jargon
- **Action-Oriented**: Messages explain what will happen and why
- **Solution-Focused**: Error messages suggest next steps when possible
- **Consequence-Aware**: Destructive action warnings explain impact

### Cross-Platform Reliability
- **Native Styling**: Uses browser's default dialog appearance
- **Keyboard Accessible**: Standard keyboard navigation (Tab, Enter, Escape)
- **Screen Reader Compatible**: Native dialogs work with assistive technology
- **Mobile Optimized**: Native dialogs adapt to mobile interaction patterns

## Integration Points

### Form Validation Integration
- **Inline with Form Logic**: Validation alerts prevent form submission
- **Field-Specific**: Messages relate to specific form fields
- **Translation Aware**: All validation uses i18n translation keys

### Modal System Integration
- **Higher Z-Index**: Native dialogs appear above all modal content
- **Focus Management**: Native dialogs handle focus automatically
- **State Preservation**: App state maintained during dialog interactions

### Router/Navigation Integration
- **Route Protection**: Confirmations can prevent navigation
- **State Confirmation**: Warns before losing unsaved changes
- **Smart Redirection**: Confirmations can trigger navigation to relevant screens

## Error Handling Patterns

### Graceful Degradation
```typescript
// Always provide fallback text
const message = t('validationKey', 'Default English message') || 'Fallback message';
alert(message);
```

### Async Operation Handling
```typescript
try {
  await performOperation();
  alert(t('successMessage'));
} catch (error) {
  // Log error for debugging but show user-friendly message
  logger.error('Operation failed:', error);
  alert(t('operationFailedMessage', 'Operation failed. Please try again.'));
}
```

### Network/Connection Errors
- Always provide user-friendly error messages
- Avoid exposing technical error details
- Suggest concrete next steps when possible
- Log technical details separately for debugging

## Key Behaviors Summary

1. **Native Browser Dialogs**: Uses `window.alert()` and `window.confirm()` exclusively
2. **Comprehensive Validation**: Form inputs validated with immediate feedback
3. **Destructive Action Protection**: All delete operations require confirmation
4. **Smart User Guidance**: Contextual suggestions for resolving blocked operations
5. **Full Internationalization**: Complete English/Finnish support for all messages
6. **Cross-Platform Consistency**: Identical behavior across all devices and browsers
7. **Accessibility Compliant**: Native dialogs provide built-in accessibility features
8. **Error Recovery Oriented**: Error messages guide users toward solutions
9. **Graceful Error Handling**: Comprehensive error handling with user-friendly messages