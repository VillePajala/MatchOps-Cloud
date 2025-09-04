# Seasons & Tournaments Management Modal

## Overview
Full-screen modal interface for creating, editing, and managing seasons and tournaments as global organizational entities that can be associated with games across all teams.

**⚠️ Implementation Note**: This document focuses on UI/UX behavior and business logic. The following technical aspects are NOT covered and must be investigated in the target app version before implementation:
- Data storage mechanisms (how seasons/tournaments are persisted and retrieved)
- State management approach (how season/tournament state is handled across components)
- Authentication requirements (if user identity affects organizational access)
- Performance considerations for entity management and game associations

## Business Logic

### Data Structures

**Season Interface**:
```typescript
interface Season {
  id: string;
  name: string;
  location?: string;
  periodCount?: number;        // 1 or 2 periods
  periodDuration?: number;     // Duration in minutes
  startDate?: string;
  endDate?: string;
  gameDates?: string[];
  archived?: boolean;
  notes?: string;
  color?: string;
  badge?: string;
  ageGroup?: string;
}
```

**Tournament Interface**:
```typescript
interface Tournament {
  id: string;
  name: string;
  location?: string;
  level?: string;              // Competition level
  periodCount?: number;        // 1 or 2 periods
  periodDuration?: number;     // Duration in minutes
  startDate?: string;
  endDate?: string;
  gameDates?: string[];
  archived?: boolean;
  notes?: string;
  color?: string;
  badge?: string;
  ageGroup?: string;
}
```

### Field Validation Logic

**Period Count Validation**:
```typescript
const sanitizedPeriodCount = 
  periodCount === 1 || periodCount === 2 ? periodCount : undefined;
```

**Period Duration Validation**:
```typescript
const sanitizedPeriodDuration = 
  periodDuration > 0 ? periodDuration : undefined;
```

**Name Validation**:
- Required field for both seasons and tournaments
- Cannot be empty after trimming
- Used for entity identification and display

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
- Background blur effects and gradients similar to other modals

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

### Tab System

**Tab Navigation**:
- Two tabs: "Seasons" and "Tournaments"
- Active tab highlighting with indigo color scheme
- Tab switching updates content area dynamically

**Tab Button Styling**:
```css
/* Active tab */
background: #4f46e5; /* bg-indigo-600 */
color: white;

/* Inactive tab */
background: #374151; /* bg-slate-700 */
color: #cbd5e1; /* text-slate-300 */

/* Both tabs */
padding: 0.5rem 1rem; /* px-4 py-2 */
border-radius: 0.375rem 0.375rem 0 0; /* rounded-t-md */
```

### Entity List Display

**Entity Card Layout**:
Each season/tournament appears in a card showing:
```
┌─────────────────────────────┐
│ Entity Name                 │ <- Bold, slate-200
│ Start Date - End Date       │ <- Small, slate-400 (tournaments only)
│ Games: X | Goals: Y         │ <- Statistics, slate-400
│                [Edit][Del]  │ <- Action buttons
└─────────────────────────────┘
```

**Entity Card Styling**:
```css
background: rgba(30, 41, 59, 0.6); /* bg-slate-800/60 */
padding: 0.5rem; /* p-2 */
border-radius: 0.375rem; /* rounded-md */
margin-bottom: 0.5rem; /* space-y-2 */
```

### Add New Entity Interface

**Add Button**:
```css
display: flex;
align-items: center;
gap: 0.5rem; /* gap-2 */
padding: 0.5rem 0.75rem; /* px-3 py-2 */
font-size: 0.875rem; /* text-sm */
background: #4f46e5; /* bg-indigo-600 */
color: white;
border-radius: 0.375rem; /* rounded-md */

&:hover {
  background: #4338ca; /* hover:bg-indigo-500 */
}
```

**Add Form Fields**:
When "Add New" is clicked, a form appears with the following fields:

**Common Fields (Both Seasons & Tournaments)**:
1. **Name**: Text input (required)
2. **Location**: Text input (optional) 
3. **Age Group**: Dropdown select from predefined options
4. **Period Count**: Number input (1 or 2)
5. **Period Duration**: Number input (minutes)
6. **Notes**: Textarea (optional)
7. **Archived**: Checkbox (default unchecked)

**Tournament-Only Fields**:
1. **Level**: Dropdown select from predefined competition levels
2. **Start Date**: Date input
3. **End Date**: Date input

### Form Field Specifications

**Text Input Styling**:
```css
width: 100%;
padding: 0.375rem 0.75rem; /* px-3 py-1.5 */
background: #374151; /* bg-slate-700 */
border: 1px solid #4b5563; /* border-slate-600 */
border-radius: 0.375rem; /* rounded-md */
color: white;
&::placeholder {
  color: #9ca3af; /* placeholder-slate-400 */
}
&:focus {
  border-color: #6366f1; /* focus:border-indigo-500 */
  box-shadow: 0 0 0 1px #6366f1; /* focus:ring-indigo-500 */
}
```

**Grid Layout for Numeric Fields**:
```css
display: grid;
grid-template-columns: repeat(2, 1fr); /* grid-cols-2 */
gap: 0.5rem; /* gap-2 */
```

### Edit Mode Interface

**Edit Form**:
- Clicking edit icon transforms entity card into edit form
- Same field structure as add form but pre-populated with current values
- Save/cancel buttons appear at bottom right

**Edit Form Actions**:
- **Save**: Green check icon button
- **Cancel**: Gray X icon button

**Action Button Styling**:
```css
padding: 0.25rem; /* p-1 */
color: #10b981; /* text-green-400 (save) */
color: #9ca3af; /* text-slate-400 (cancel) */

&:hover {
  color: #059669; /* hover:text-green-300 (save) */
  color: #e5e7eb; /* hover:text-slate-200 (cancel) */
}
```

### Entity Statistics Display

Each entity shows basic usage statistics:
- **Games**: Count of associated games
- **Goals**: Total goals across all associated games

**Statistics Styling**:
```css
font-size: 0.75rem; /* text-xs */
color: #9ca3af; /* text-slate-400 */
```

### Delete Confirmation

**Delete Flow**:
1. User clicks delete button (trash icon)
2. `window.confirm()` dialog appears with confirmation message
3. If confirmed, entity is deleted via mutation
4. If cancelled, no action taken

**Delete Button Styling**:
```css
padding: 0.25rem; /* p-1 */
color: #9ca3af; /* text-slate-400 */

&:hover {
  color: #ef4444; /* hover:text-red-500 */
}
```

## Dropdown Options

### Age Groups
Predefined age group options from `AGE_GROUPS` config:
- Values determined by app configuration
- Displayed as dropdown options in both add and edit forms

### Competition Levels (Tournaments Only)
Predefined level options from `LEVELS` config:
- Available only for tournaments
- Translated display names using `common.level{Level}` keys

## Form Validation

### Required Fields
- **Name**: Cannot be empty, validated on save
- All other fields are optional

### Value Sanitization
- **Period Count**: Must be 1 or 2, otherwise set to undefined
- **Period Duration**: Must be positive number, otherwise set to undefined
- **Numeric Fields**: Parsed with `parseInt()`, invalid values become undefined

### Error Handling
- Form validation errors prevent save operation
- Invalid numeric inputs are silently converted to undefined
- Required field validation shows user feedback

## Internationalization

### Translation Keys Used

**Modal Structure**:
- `seasonTournamentModal.title` (default: "Manage Seasons & Tournaments")
- `seasonTournamentModal.seasons` (default: "Seasons")
- `seasonTournamentModal.tournaments` (default: "Tournaments")

**Form Labels**:
- `seasonTournamentModal.locationLabel` (default: "Default Location")
- `seasonTournamentModal.periodCountLabel` (default: "Periods")
- `seasonTournamentModal.periodDurationLabel` (default: "Duration (min)")
- `seasonTournamentModal.startDateLabel` (default: "Start Date")
- `seasonTournamentModal.endDateLabel` (default: "End Date")
- `seasonTournamentModal.notesLabel` (default: "Notes")
- `seasonTournamentModal.archiveLabel` (default: "Archived")

**Statistics**:
- `seasonTournamentModal.statsGames` (default: "Games")
- `seasonTournamentModal.statsGoals` (default: "Goals")

**Actions**:
- `seasonTournamentModal.confirmDelete` (default: "Are you sure you want to delete {{name}}?")
- `seasonTournamentModal.createNew` (default: "Create New")
- Standard action keys: `common.save`, `common.cancel`, `common.edit`, `common.delete`

**Dropdown Options**:
- `common.selectAgeGroup` (default: "-- Select Age Group --")
- `common.selectLevel` (default: "-- Select Level --")
- Dynamic level translations: `common.level{LevelName}`

## Integration Points

### Modal System Integration
- Uses same z-index and backdrop patterns as other modals
- Consistent background effects and styling
- Standard modal open/close behavior

### Game Association
- Seasons and tournaments are available for selection during game creation
- Games can be associated with either, both, or neither
- Association provides organizational context for game statistics

### Statistics Calculation
- Statistics are calculated from associated games
- Real-time updates when games are added/removed
- Aggregate statistics shown in entity cards

## Key Behaviors Summary

1. **Global Entities**: Seasons and tournaments are available to all teams and games
2. **Simple CRUD**: Basic create, read, update, delete operations with form validation
3. **Tab Interface**: Clean separation between seasons and tournaments management
4. **Optional Fields**: Most fields are optional except entity name
5. **Statistics Integration**: Shows usage statistics for each entity
6. **Delete Confirmation**: Native browser confirmation for destructive actions
7. **Responsive Forms**: Form layouts adapt to content and screen size
8. **Translation Support**: Complete internationalization for all UI text