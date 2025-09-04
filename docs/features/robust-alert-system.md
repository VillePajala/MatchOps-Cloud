# Robust Alert System

## Overview
Consistent user guidance system that provides reliable alerts across all roster and game operations, preventing invalid states and destructive actions.

## Current App vs New Behavior

### Current App
- Inconsistent alert patterns across different operations
- Users can perform invalid actions that create confusing states
- Limited guidance for complex operations

### With Robust Alert System
- **Consistent alert patterns** across all app operations
- **Preventive guards** that stop invalid actions before they occur
- **Progressive confirmation** for destructive operations
- **Cross-platform reliability** using native browser alerts

## User Experience

### Consistent Alert Patterns
**Native Browser Alerts**: Uses `window.confirm()` for maximum compatibility
- Works identically on all devices and browsers
- No dependency on external alert libraries
- Reliable user interaction patterns

**Standardized Messaging**: Consistent language across all contexts
- Clear action descriptions: "Delete this player permanently?"
- Impact explanations: "This will remove the player from 3 saved games"
- Next-step guidance: "You can add them back later from the roster"

### Preventive Guard Conditions
**Roster Operations**:
- Cannot create games with empty roster
- Cannot delete players currently in active games
- Cannot remove last goalkeeper without confirmation

**Game Operations**:
- Cannot start games without minimum players
- Cannot delete seasons that contain games
- Cannot archive teams with ongoing seasons

**Alert Examples**:
- "You need at least 1 player to create a game. Add players now?"
- "This player is in 2 saved games. Remove them anyway?"
- "Deleting this team will affect 5 games. Continue?"

### Progressive Confirmation
**Single Confirmation**: Simple operations (add player, edit name)
**Double Confirmation**: Destructive operations (delete team, clear all data)
**Impact Warnings**: Complex operations that affect multiple areas

**Example Flow - Delete Team**:
1. First alert: "Delete team 'Rangers'? This will affect 5 games and 12 players."
2. Second alert: "Are you sure? This cannot be undone."
3. Success confirmation: "Team 'Rangers' has been deleted."

### Multi-Language Support
**English/Finnish**: All alert messages available in both languages
- Contextual translations that preserve meaning
- Consistent terminology across all operations
- Fallback to English if translation missing

**Example Translations**:
- EN: "Delete this player permanently?"
- FI: "Poista tämä pelaaja pysyvästi?"

## UI Elements

### Alert Types
**Confirmation Alerts**: Yes/No decisions for user actions
**Warning Alerts**: Information about potential consequences
**Error Prevention**: Blocks that explain why action cannot be performed
**Success Confirmations**: Positive feedback when operations complete

### Visual Consistency
**Native Styling**: Uses browser's native alert styling for familiarity
**Consistent Icons**: When custom alerts are used, consistent icon patterns
**Color Coding**: Red for destructive, yellow for warning, blue for informational

### Context-Aware Messaging
**Operation-Specific**: Messages tailored to specific user action
**Data-Aware**: Includes relevant counts and names from user's actual data
**Solution-Oriented**: Suggests next steps when operations are blocked

## Guard Conditions

### Roster Guards
- **Empty Roster**: Prevents game creation, suggests roster setup
- **Goalkeeper Rules**: Maintains exactly one goalkeeper per roster
- **Player Dependencies**: Prevents deletion of players in active games
- **Duplicate Prevention**: Stops duplicate player names

### Game Guards  
- **Minimum Players**: Ensures sufficient players for game creation
- **Time Conflicts**: Warns about overlapping game schedules
- **Save Conflicts**: Prevents overwriting existing saves without confirmation
- **Export Validation**: Ensures data integrity before export operations

### Team/Season Guards
- **Dependency Checks**: Prevents deletion of entities with related data
- **Name Validation**: Ensures unique names within categories
- **Archive Safety**: Warns before archiving entities with active references
- **Bulk Operation Limits**: Prevents accidentally large-scale changes

## Key Behaviors
- **Proactive Prevention**: Stops problems before they occur rather than cleaning up afterward
- **Clear Communication**: Users always understand what will happen and why
- **Consistent Experience**: Same alert patterns apply across all app features
- **Recovery Guidance**: When operations are blocked, users are guided to solutions
- **Cross-Platform Reliability**: Works identically on all devices and operating systems
- **Intelligent Defaults**: Most common user choice is pre-selected in confirmations