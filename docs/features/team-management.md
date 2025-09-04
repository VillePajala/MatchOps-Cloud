# Team Management Modal

## Overview
Full-screen modal interface for creating, editing, and managing teams as organizational entities with associated player rosters, providing team-based game organization and roster management.

**⚠️ Implementation Note**: This document focuses on UI/UX behavior and business logic. The following technical aspects are NOT covered and must be investigated in the target app version before implementation:
- Data storage mechanisms (how team data and rosters are persisted and retrieved)
- State management approach (how team state is handled across components)
- Authentication requirements (if user identity affects team access)
- Performance considerations for team operations and roster management

## Business Logic

### Data Structures

**Team Interface**:
```typescript
interface Team {
  id: string;                 // team_...
  name: string;               // "PEPO U10"
  color?: string;             // brand/accent color (optional)
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
}
```

**Team Player Interface**:
```typescript
interface TeamPlayer {
  id: string;                 // player_...
  name: string;
  nickname?: string;
  jerseyNumber?: string;
  isGoalie?: boolean;
  color?: string;
  notes?: string;
  receivedFairPlayCard?: boolean;
}
```

### Team Validation Logic

**Name Validation**:
```typescript
const validateTeamName = async (name: string, excludeTeamId?: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Team name cannot be empty');
  }
  if (trimmed.length > 48) {
    throw new Error('Team name cannot exceed 48 characters');
  }
  // Case-insensitive uniqueness check
  // Excludes current team when editing
};
```

**Color Selection**:
- Predefined color palette with 8 options
- Default color: `#6366F1` (Indigo)
- Visual color picker interface

## UI/UX Implementation Details

### Modal Design Foundation

**Full-Screen Modal Container**:
```css
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.7);
display: flex;
align-items: center;
justify-content: center;
z-index: 60;
font-family: theme(fontFamily.display);
```

**Content Container**:
```css
background: #1e293b; /* slate-800 */
display: flex;
flex-direction: column;
height: 100%;
width: 100%;
position: relative;
overflow: hidden;
```

**Background Effects**:
- Noise texture overlay (`bg-noise-texture`)
- Sky gradient from top (`bg-gradient-to-b from-sky-400/10 via-transparent to-transparent`)
- Indigo soft-light blend (`bg-indigo-600/10 mix-blend-soft-light`)

### Header Section

**Header Styling**:
```css
display: flex;
justify-content: center;
align-items: center;
padding: 2.5rem 1.5rem 1rem; /* pt-10 pb-4 px-6 */
backdrop-filter: blur(4px);
background: rgba(15, 23, 42, 0.2); /* bg-slate-900/20 */
border-bottom: 1px solid rgba(51, 65, 85, 0.2); /* border-slate-700/20 */
flex-shrink: 0;
```

**Title Styling**:
```css
font-size: 1.875rem; /* text-3xl */
font-weight: 700; /* font-bold */
color: #fbbf24; /* text-yellow-400 */
letter-spacing: 0.025em; /* tracking-wide */
filter: drop-shadow(0 10px 8px rgba(0, 0, 0, 0.04)); /* drop-shadow-lg */
text-align: center;
```

### Create New Team Interface

**Create Button**:
```css
width: 100%;
display: flex;
align-items: center;
justify-content: center;
gap: 0.5rem; /* gap-2 */
padding: 0.75rem 1rem; /* px-4 py-3 */
background: #4f46e5; /* bg-indigo-600 */
color: white;
border-radius: 0.5rem; /* rounded-lg */
font-weight: 500; /* font-medium */
transition: background-color 0.15s ease;

&:hover {
  background: #4338ca; /* hover:bg-indigo-500 */
}

&:focus {
  outline: none;
  box-shadow: 0 0 0 2px #6366f1; /* focus:ring-2 focus:ring-indigo-500 */
}
```

**Create Form Layout**:
When "New Team" is clicked, shows a form with:
1. **Team Name Input**: Required text field
2. **Color Picker**: Visual color selection
3. **Save/Cancel Buttons**: Form actions

### Team Creation Form

**Form Container**:
```css
background: rgba(51, 65, 85, 0.5); /* bg-slate-700/50 */
border-radius: 0.5rem; /* rounded-lg */
padding: 1rem; /* p-4 */
border: 1px solid #4b5563; /* border-slate-600 */
```

**Name Input Field**:
```css
width: 100%;
padding: 0.5rem 0.75rem; /* px-3 py-2 */
background: #374151; /* bg-slate-700 */
border: 1px solid #4b5563; /* border-slate-600 */
border-radius: 0.375rem; /* rounded-md */
color: #f1f5f9; /* text-slate-100 */

&::placeholder {
  color: #9ca3af; /* placeholder-slate-400 */
}

&:focus {
  outline: none;
  box-shadow: 0 0 0 2px #6366f1; /* focus:ring-2 focus:ring-indigo-500 */
}
```

**Color Picker Interface**:
8 predefined colors displayed as circular buttons:

**Color Options**:
- `#6366F1` (Indigo) - Default
- `#8B5CF6` (Violet)
- `#06B6D4` (Cyan)
- `#10B981` (Emerald)
- `#F59E0B` (Amber)
- `#EF4444` (Red)
- `#EC4899` (Pink)
- `#84CC16` (Lime)

**Color Button Styling**:
```css
width: 2rem; /* w-8 */
height: 2rem; /* h-8 */
border-radius: 9999px; /* rounded-full */
border: 2px solid;
transition: all 0.15s ease;

/* Selected state */
&.selected {
  border-color: white;
  transform: scale(1.1);
}

/* Unselected state */
&.unselected {
  border-color: #6b7280; /* border-slate-500 */
  
  &:hover {
    border-color: #d1d5db; /* hover:border-slate-300 */
  }
}
```

### Team List Display

**Team Card Layout**:
Each team appears in a card showing:
```
┌─────────────────────────────┐
│ [Color] Team Name           │ <- Name with color indicator
│ X Players | Y Games         │ <- Statistics
│                [...] [Edit] │ <- Actions menu
└─────────────────────────────┘
```

**Team Card Styling**:
```css
background: rgba(51, 65, 85, 0.5); /* bg-slate-700/50 */
border-radius: 0.5rem; /* rounded-lg */
padding: 1rem; /* p-4 */
border: 1px solid #4b5563; /* border-slate-600 */
margin-bottom: 0.75rem;
```

**Team Name Display**:
```css
font-size: 1.125rem; /* text-lg */
font-weight: 600; /* font-semibold */
color: #f1f5f9; /* text-slate-100 */
```

### Team Actions System

**Actions Menu Button**:
```css
padding: 0.5rem; /* p-2 */
color: #9ca3af; /* text-slate-400 */
border-radius: 0.375rem; /* rounded-md */
transition: colors 0.15s ease;

&:hover {
  color: #f1f5f9; /* hover:text-slate-100 */
  background: rgba(51, 65, 85, 0.5); /* hover:bg-slate-700/50 */
}
```

**Actions Menu Options**:
1. **Edit Team**: Opens inline edit form
2. **Manage Roster**: Opens team roster management modal
3. **Duplicate Team**: Creates copy with "(Copy)" suffix
4. **Delete Team**: Removes team after confirmation

**Actions Menu Styling**:
```css
position: absolute;
background: #1e293b; /* bg-slate-800 */
border: 1px solid #374151; /* border-slate-700 */
border-radius: 0.375rem; /* rounded-md */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); /* shadow-lg */
z-index: 10;
```

### Edit Team Interface

**Edit Form Fields**:
When editing, the team card transforms to show:
1. **Name Input**: Pre-populated with current name
2. **Color Picker**: Current color selected
3. **Save/Cancel Actions**: Form controls

**Edit Form Styling**:
- Same styling as create form
- Pre-populated with current team values
- Inline editing within team card

### Team Statistics Display

**Statistics Format**:
- **Player Count**: "X Players" from team roster
- **Game Count**: "Y Games" using team statistics
- **Last Used**: Shows recent activity (if available)

**Statistics Styling**:
```css
font-size: 0.875rem; /* text-sm */
color: #9ca3af; /* text-slate-400 */
```

## Team Operations

### CRUD Operations

**Create Team**:
```typescript
const createTeam = async (name: string, color: string) => {
  await validateTeamName(name);
  const newTeam = {
    id: generateTeamId(),
    name: name.trim(),
    color,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  // Save to storage
};
```

**Update Team**:
```typescript
const updateTeam = async (teamId: string, updates: Partial<Team>) => {
  if (updates.name) {
    await validateTeamName(updates.name, teamId);
  }
  // Apply updates with new updatedAt timestamp
};
```

**Delete Team**:
- Confirmation dialog using `window.confirm()`
- Checks for associated games before deletion
- Preserves game history with team name notation

**Duplicate Team**:
- Creates new team with "(Copy)" suffix
- Copies team color and basic properties
- Generates new unique ID and timestamps

### Roster Management Integration

**Team Roster Access**:
- "Manage Roster" action opens `TeamRosterModal`
- Separate interface for assigning players to teams
- Integration with master roster management

## Form Behavior

### Keyboard Navigation
- **Enter**: Submits form when in name input
- **Escape**: Cancels current operation
- **Tab**: Standard form navigation

### Validation Feedback
- Client-side validation with immediate feedback
- Error messages displayed via alerts
- Form prevents submission until validation passes

### State Management
- Single team edit mode (no concurrent editing)
- Form state resets after successful operations
- Loading states during async operations

## Internationalization

### Translation Keys Used

**Modal Structure**:
- `teamManager.title` (default: "Teams")
- `teamManager.newTeam` (default: "New Team")
- `teamManager.createNewTeam` (default: "Create new team")

**Form Fields**:
- `teamManager.teamName` (default: "Team Name")
- `teamManager.teamColor` (default: "Team Color")
- `teamManager.namePlaceholder` (default: "Enter team name")

**Actions**:
- Standard action keys: `common.save`, `common.cancel`, `common.edit`, `common.delete`
- Context-specific actions for duplicate and roster management

**Validation Messages**:
- Form validation errors with translated feedback
- Confirmation dialogs for destructive actions

## Integration Points

### Modal System Integration
- Consistent z-index and backdrop patterns
- Standard modal open/close behavior
- Proper focus management and accessibility

### Roster Management Integration
- Opens TeamRosterModal for player assignment
- Maintains team context across modal transitions
- Updates statistics after roster changes

### Game Creation Integration
- Teams available for selection during game setup
- Team-based game organization and filtering
- Historical game associations preserved

## Accessibility Considerations

### Keyboard Navigation
- **Tab Order**: Logical progression through form fields and buttons
- **Enter Key**: Submits forms when in text inputs
- **Escape Key**: Cancels current operation and closes forms
- **Arrow Keys**: Navigate through color picker options

### Screen Reader Support
- **ARIA Labels**: All buttons have descriptive `aria-label` attributes
- **Form Labels**: Proper label associations for all form inputs
- **Status Updates**: Form validation results announced to screen readers
- **Role Attributes**: Modal has `role="dialog"` and `aria-modal="true"`

### Visual Accessibility
- **Color Contrast**: All text meets WCAG AA contrast requirements
- **Focus Indicators**: Clear focus rings on all interactive elements
- **Color Independence**: Team identification not solely dependent on color
- **Icon Alternatives**: Text labels accompany all icon buttons

## Key Behaviors Summary

1. **Simple Team Management**: Create, edit, delete teams with basic properties
2. **Visual Color System**: 8 predefined colors for team identification
3. **Name Validation**: Unique team names with character limits
4. **Statistics Integration**: Shows player count and game usage
5. **Roster Management**: Direct access to team player assignment
6. **Duplicate Functionality**: Easy team copying for similar setups
7. **Delete Protection**: Confirmation required for team removal
8. **Translation Support**: Complete internationalization for all UI text
9. **Accessibility Compliant**: Full keyboard navigation and screen reader support