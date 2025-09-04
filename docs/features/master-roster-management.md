# Master Roster Management (Roster Settings Modal)

## Overview
Full-screen modal interface for managing the master player roster with basic search functionality, individual player CRUD operations, and player statistics access.

**⚠️ Implementation Note**: This document focuses on UI/UX behavior and business logic. The following technical aspects are NOT covered and must be investigated in the target app version before implementation:
- Data storage mechanisms (how roster data is persisted and retrieved)
- State management approach (how roster state is handled across components)
- Authentication requirements (if user identity affects roster access)
- Performance considerations for large rosters and search functionality

## Business Logic

### Modal State Management
```typescript
interface RosterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: Player[];
  onRenamePlayer: (playerId: string, playerData: { name: string; nickname: string }) => void;
  onSetJerseyNumber: (playerId: string, number: string) => void;
  onSetPlayerNotes: (playerId: string, notes: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddPlayer: (playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => void;
  isRosterUpdating?: boolean;
  rosterError?: string | null;
  onOpenPlayerStats: (playerId: string) => void;
}
```

### Player Data Structure
```typescript
interface Player {
  id: string;
  name: string;
  nickname?: string;
  jerseyNumber?: string;
  notes?: string;
  // Additional field properties...
}
```

### Search Functionality
**Search Logic**:
```typescript
const filteredPlayers = availablePlayers.filter(player => {
  if (!searchText) return true;
  const search = searchText.toLowerCase();
  return (
    player.name.toLowerCase().includes(search) ||
    (player.nickname && player.nickname.toLowerCase().includes(search))
  );
});
```

**Search Behavior**:
- Case-insensitive text matching
- Searches both player name and nickname fields
- Real-time filtering as user types
- No minimum character requirement

### Edit State Management
- **Single Edit Mode**: Only one player can be edited at a time
- **Edit Lock**: Adding new players disabled during edit mode
- **Form Validation**: Player name cannot be empty
- **Change Detection**: Only modified fields trigger update calls

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
border-radius: 0;
box-shadow: theme(boxShadow.xl);
border: none;
overflow: hidden;
display: flex;
flex-direction: column;
height: 100%;
width: 100%;
position: relative;
```

**Background Effects**:
- Noise texture overlay (`bg-noise-texture`)
- Indigo soft-light blend (`bg-indigo-600/10 mix-blend-soft-light`)
- Sky gradient from top (`bg-gradient-to-b from-sky-400/10 via-transparent to-transparent`)
- Blurred corner glows (top sky, bottom indigo)

### Header Section

**Title Area**:
```css
display: flex;
justify-content: center;
align-items: center;
padding-top: 2.5rem; /* pt-10 */
padding-bottom: 1rem; /* pb-4 */
backdrop-filter: blur(4px);
background: rgba(15, 23, 42, 0.2); /* bg-slate-900/20 */
```

**Title Styling**:
```css
font-size: 1.875rem; /* text-3xl */
font-weight: 700; /* font-bold */
color: #fbbf24; /* text-yellow-400 */
letter-spacing: 0.025em; /* tracking-wide */
filter: drop-shadow(0 10px 8px rgba(0, 0, 0, 0.04)); /* drop-shadow-lg */
```

**Fixed Header Section**:
```css
padding: 0.25rem 1.5rem 1rem; /* px-6 pt-1 pb-4 */
backdrop-filter: blur(4px);
background: rgba(15, 23, 42, 0.2); /* bg-slate-900/20 */
```

### Player Counter

**Counter Display**:
- Shows total player count with highlighting
- Format: "[XX] Total Players" where XX is highlighted in yellow
- Always visible in fixed header area

**Counter Styling**:
```css
margin-bottom: 1.25rem; /* mb-5 */
text-align: center;
font-size: 0.875rem; /* text-sm */
color: #cbd5e1; /* text-slate-300 */

/* Count number styling */
.count {
  color: #fbbf24; /* text-yellow-400 */
  font-weight: 600; /* font-semibold */
}
```

### Add Player Interface

**Add Player Button**:
```css
width: 100%;
padding: 0.5rem 1rem; /* px-4 py-2 */
border-radius: 0.375rem; /* rounded-md */
font-size: 0.875rem; /* text-sm */
font-weight: 500; /* font-medium */
transition: colors 0.15s ease;
box-shadow: theme(boxShadow.sm);
background: linear-gradient(to bottom, #6366f1, #4f46e5); /* from-indigo-500 to-indigo-600 */
color: white;

&:hover {
  background: linear-gradient(to bottom, #4f46e5, #4338ca); /* hover:from-indigo-600 hover:to-indigo-700 */
}

&:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Add Player Form**:
- Appears below search field when "Add Player" is clicked
- Full-width card layout with form fields
- Responsive grid layout (1 column on mobile, 2 columns on larger screens)

**Form Field Structure**:
```
┌─────────────────────────────┐
│ [Player Name]  [Nickname]   │ <- Grid: 1 col mobile, 2 col desktop
│ [Jersey #]                  │ <- Small width, center-aligned
│ [Notes textarea]            │ <- Full width, 3 rows
│           [Cancel] [Save]   │ <- Right-aligned buttons
└─────────────────────────────┘
```

### Search Interface

**Search Input**:
```css
width: 100%;
background: #374151; /* bg-slate-700 */
border: 1px solid #4b5563; /* border-slate-600 */
border-radius: 0.375rem; /* rounded-md */
box-shadow: theme(boxShadow.sm);
padding: 0.5rem 0.75rem; /* py-2 px-3 */
color: white;
font-size: 0.875rem; /* text-sm */

&:focus {
  outline: none;
  box-shadow: 0 0 0 2px theme(colors.indigo.500);
}
```

**Search Behavior**:
- Real-time filtering with no debouncing
- Placeholder text: "Search players..."
- Focus management prevents interference with add player form
- Search disabled when adding new player

### Player List Interface

**Scrollable Content Area**:
```css
flex: 1;
overflow-y: auto;
min-height: 0;
```

**Player Card Layout**:
Each player is displayed in a card with the following structure:
```
┌─────────────────────────────┐
│ Player Name (Nickname)      │ <- Title with optional nickname
│ Jersey: #XX                 │ <- Jersey number if set
│ Notes: Player notes...      │ <- Notes if set
│ [Edit] [Stats] [Delete]     │ <- Action buttons
└─────────────────────────────┘
```

**Player Card Styling**:
```css
background: rgba(15, 23, 42, 0.7); /* bg-slate-900/70 */
padding: 1rem; /* p-4 */
border-radius: 0.5rem; /* rounded-lg */
border: 1px solid #374151; /* border-slate-700 */
box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06); /* shadow-inner */
margin-bottom: 0.75rem; /* space between cards */
```

### Edit Mode Interface

**Edit Form Fields**:
When editing, the player card transforms into an edit form with:
- Player name input (required)
- Nickname input (optional)
- Jersey number input (3 character limit, center-aligned)
- Notes textarea (3 rows, non-resizable)

**Edit Form Styling**:
- Same card styling as add player form
- Form validates on save (name required)
- Auto-scrolls edited player into view
- Save/Cancel buttons at bottom right

**Input Styling** (shared across forms):
```css
display: block;
width: 100%;
background: #374151; /* bg-slate-700 */
border: 1px solid #4b5563; /* border-slate-600 */
border-radius: 0.375rem; /* rounded-md */
box-shadow: theme(boxShadow.sm);
padding: 0.5rem 0.75rem; /* py-2 px-3 */
color: white;
font-size: 0.875rem; /* text-sm */

&:focus {
  outline: none;
  box-shadow: 0 0 0 2px theme(colors.indigo.500);
}
```

### Button System

**Primary Button Style**:
```css
padding: 0.5rem 1rem; /* px-4 py-2 */
border-radius: 0.375rem; /* rounded-md */
font-size: 0.875rem; /* text-sm */
font-weight: 500; /* font-medium */
transition: colors 0.15s ease;
box-shadow: theme(boxShadow.sm);
background: linear-gradient(to bottom, #6366f1, #4f46e5); /* from-indigo-500 to-indigo-600 */
color: white;
```

**Secondary Button Style**:
```css
padding: 0.5rem 1rem; /* px-4 py-2 */
border-radius: 0.375rem; /* rounded-md */
font-size: 0.875rem; /* text-sm */
font-weight: 500; /* font-medium */
transition: colors 0.15s ease;
box-shadow: theme(boxShadow.sm);
background: linear-gradient(to bottom, #4b5563, #374151); /* from-slate-600 to-slate-700 */
color: #e2e8f0; /* text-slate-200 */
```

**Icon Button Style**:
```css
padding: 0.375rem; /* p-1.5 */
border-radius: 0.375rem; /* rounded-md */
transition: colors 0.15s ease;

&:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Action Button Layout

Each player card has three action buttons:
1. **Edit**: Opens inline edit form (pencil icon)
2. **Stats**: Opens player statistics modal (chart bar icon)  
3. **Delete**: Removes player with confirmation (trash icon)

**Button Container**:
```css
display: flex;
justify-content: flex-end;
gap: 0.75rem; /* gap-3 */
padding-top: 0.5rem; /* pt-2 */
```

## Form Validation and Error Handling

### Validation Rules
1. **Player Name**: Required, cannot be empty after trim
2. **Jersey Number**: Optional, 3 character maximum
3. **Nickname**: Optional field
4. **Notes**: Optional field

### Error Display
- Validation errors shown via browser alert dialogs
- Uses translated error messages
- Form prevents submission until validation passes

### Loading States
- Buttons disabled during roster updates (`isRosterUpdating` prop)
- Visual indication of disabled state (reduced opacity)
- Prevents concurrent operations

## Responsive Design

### Layout Adaptations
**Mobile (< 640px)**:
- Single column form layouts
- Full-width buttons and inputs
- Stacked action buttons

**Desktop (≥ 640px)**:
- Two-column grid for name/nickname fields
- Side-by-side form elements where appropriate
- Horizontal action button layout

### Touch Interactions
- Large touch targets for mobile users
- Proper focus management for form fields
- Scroll behavior optimization for modal content

## Internationalization

### Translation Keys Used
**Modal Structure**:
- `rosterSettingsModal.title` (default: "Manage Roster")
- `rosterSettingsModal.totalPlayersShort` (default: "Total Players")
- `rosterSettingsModal.addPlayerButton` (default: "Add Player")
- `rosterSettingsModal.searchPlaceholder` (default: "Search players...")

**Form Fields**:
- `rosterSettingsModal.playerNamePlaceholder` (default: "Player Name")
- `rosterSettingsModal.nicknamePlaceholder` (default: "Nickname (Optional)")
- `rosterSettingsModal.jerseyHeader` (default: "#")
- `rosterSettingsModal.notesPlaceholder` (default: "Player notes...")

**Validation Messages**:
- `rosterSettingsModal.nameRequired` (default: "Player name cannot be empty.")

**Action Labels**: Standard labels for Edit, Save, Cancel, Delete actions

### Language Support
- Complete English and Finnish support
- Form validation messages fully translatable
- Consistent terminology with main app interface

## Integration Points

### Modal System Integration
- Consistent z-index layering (`z-[60]`)
- Standard modal backdrop behavior
- Proper focus management and accessibility

### Player Statistics Integration
- Direct connection to player stats modal
- Passes player data for detailed analytics
- Maintains context between roster and stats views

### Roster Data Management
- Integrates with master roster utilities
- Handles all CRUD operations through prop callbacks
- Maintains data consistency across app components

## Technical Considerations

### Performance
- Efficient search filtering with simple string matching
- Minimal re-renders through proper state management
- Optimized scroll behavior for large rosters

### User Experience
- Intuitive single-edit-mode prevents confusion
- Clear visual feedback for all actions
- Smooth transitions between view and edit modes

### Data Integrity
- Form validation prevents invalid data entry
- Proper error handling for roster operations
- Consistent state management across operations

## Key Behaviors Summary

1. **Simple CRUD Operations**: Add, edit, delete individual players with basic form interface
2. **Basic Search**: Real-time text search across name and nickname fields
3. **Single Edit Mode**: Only one player editable at a time to prevent confusion
4. **Visual Consistency**: Matches app design system with slate/indigo color scheme
5. **Mobile Optimized**: Full-screen modal with responsive form layouts
6. **Form Validation**: Required field validation with translated error messages
7. **Statistics Integration**: Direct access to detailed player statistics
8. **Loading States**: Visual feedback during roster update operations