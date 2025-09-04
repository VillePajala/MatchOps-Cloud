# First Game Onboarding (Center Overlay)

## Overview
**⚠️ PLANNED FEATURE**: This center overlay system is referenced in code comments but not currently implemented. This document describes the intended behavior for future implementation.

Simple center overlay guidance system that should appear on the soccer field to help first-time users understand next steps for game creation.

**⚠️ Implementation Note**: This document focuses on UI/UX behavior and business logic. The following technical aspects are NOT covered and must be investigated in the target app version before implementation:
- Data storage mechanisms (how onboarding progress is tracked and persisted)
- State management approach (how overlay visibility state is handled)
- Authentication requirements (if user identity affects onboarding behavior)
- Performance considerations for overlay rendering and field interaction

## Business Logic

### Overlay Trigger Condition
The center overlay should appear based on user data state:
```
showOverlay = isFirstTimeUser && (user clicked "Get Started" from start screen)
```

**Data Requirements**:
- `hasPlayers`: Boolean indicating if any players exist in roster
- `hasSavedGames`: Boolean indicating if any games have been saved
- `isFirstTimeUser`: Derived boolean (`!hasPlayers || !hasSavedGames`)
- Navigation context (when user navigates from start screen to main app)

### Content Adaptation Logic
The overlay content adapts based on roster state:

**No Players State** (`!hasPlayers`):
- Title: "Ready to get started?"
- Description: "First, add players so you can create your first team and match."
- Primary Action: "Set Up Team Roster"

**Has Players State** (`hasPlayers`):
- Title: "Ready to create your first match!"
- Description: "If you'd like, you can first create your first team, tournament, or season."
- Primary Action: "Create Your First Match"
- Secondary Actions: "Create Season/Tournament First", "Create First Team", "Manage Teams", etc.

### Completion Tracking
- One-time experience: `hasSeenAppGuide` flag prevents repeated display
- Persists across app sessions
- Can be manually reset for testing purposes

## UI/UX Implementation Details

### Overlay Positioning
**Container**:
- Positioned as centered overlay on soccer field
- Does not block field interaction completely
- Semi-transparent background allows field visibility

**Z-Index**: Above field canvas but below modal dialogs (suggested: `z-30`)

### Visual Design

**Overlay Container**:
```css
/* Centered positioning over field */
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);

/* Semi-transparent background */
background: rgba(0, 0, 0, 0.8);
backdrop-filter: blur(4px);

/* Rounded container with border */
border-radius: 12px;
border: 1px solid rgba(255, 255, 255, 0.1);

/* Responsive sizing */
max-width: 24rem; /* max-w-96 */
margin: 1rem; /* mx-4 */
padding: 1.5rem; /* p-6 */
```

**Typography**:
- Title: Large, bold heading
- Description: Medium body text with good contrast
- Actions: Button styling consistent with app design system

### Content Structure

**No Players State Layout**:
```
┌─────────────────────────────┐
│  Ready to get started?      │  <- Title
│                             │
│  First, add players so you  │  <- Description
│  can create your first team │
│  and match.                 │
│                             │
│  [Set Up Team Roster]      │  <- Primary Action
└─────────────────────────────┘
```

**Has Players State Layout**:
```
┌─────────────────────────────┐
│  Ready to create your first │  <- Title
│  match!                     │
│                             │
│  If you'd like, you can     │  <- Description
│  first create your first    │
│  team, tournament, or       │
│  season.                    │
│                             │
│  [Create Your First Match]  │  <- Primary Action
│  [Create Season/Tournament  │  <- Secondary Actions
│   First]                    │
│  [Create First Team]        │
│  [Manage Teams]             │
│  [Manage Seasons &          │
│   Tournaments]              │
└─────────────────────────────┘
```

### Button Specifications

**Primary Action Button**:
```css
width: 100%;
padding: 0.75rem 1rem; /* py-3 px-4 */
background: linear-gradient(to right, #4f46e5, #7c3aed); /* indigo-600 to violet-700 */
color: white;
border-radius: 0.5rem; /* rounded-lg */
font-weight: 600; /* font-semibold */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); /* shadow-lg */

/* Hover state */
&:hover {
  background: linear-gradient(to right, #4338ca, #6d28d9); /* indigo-500 to violet-600 */
}

/* Focus state */
&:focus {
  outline: none;
  box-shadow: 0 0 0 2px #4f46e5; /* focus:ring-2 focus:ring-indigo-500 */
}
```

**Secondary Action Buttons**:
```css
width: 100%;
padding: 0.5rem 0.75rem; /* py-2 px-3 */
background: rgba(51, 65, 85, 0.6); /* bg-slate-700/60 */
color: #cbd5e1; /* text-slate-300 */
border: 1px solid #475569; /* border-slate-600 */
border-radius: 0.375rem; /* rounded-md */
font-size: 0.875rem; /* text-sm */
margin-top: 0.5rem; /* mt-2 */

/* Hover state */
&:hover {
  background: rgba(71, 85, 105, 0.6); /* hover:bg-slate-600/60 */
}
```

### User Interaction Behavior

**Action Routing**:
- **Set Up Team Roster**: Opens roster management modal
- **Create Your First Match**: Opens new game setup modal
- **Create Season/Tournament First**: Opens season/tournament management modal
- **Create First Team**: Opens team creation modal
- **Manage Teams**: Opens team management modal
- **Manage Seasons & Tournaments**: Opens season/tournament modal

**Overlay Dismissal**:
- Any action button click hides overlay and sets `hasSeenAppGuide = true`
- Click outside overlay area dismisses without setting completion flag
- No explicit close button (actions serve as completion mechanism)

### Responsive Design

**Mobile Adaptation**:
```css
/* Mobile screens (< 640px) */
@media (max-width: 640px) {
  max-width: calc(100vw - 2rem); /* Account for margins */
  padding: 1rem; /* Reduced padding */
  font-size: 0.875rem; /* Smaller text */
}

/* Tablet and desktop */
@media (min-width: 640px) {
  max-width: 24rem; /* max-w-96 */
  padding: 1.5rem;
}
```

**Button Stack**:
- Buttons stack vertically on all screen sizes
- Full-width buttons for easy touch interaction
- Adequate spacing between action buttons

## Internationalization

### Translation Keys Used

**Common Keys**:
- `firstGame.title` (default: "Ready to create your first match!")
- `firstGame.titleNoPlayers` (default: "Ready to get started?")
- `firstGame.desc` (default: "If you'd like, you can first create your first team, tournament, or season.")
- `firstGame.descNoPlayers` (default: "First, add players so you can create your first team and match.")

**Action Keys**:
- `firstGame.setupRoster` (default: "Set Up Team Roster")
- `firstGame.createGame` (default: "Create Your First Match")
- `firstGame.createSeasonFirst` (default: "Create Season/Tournament First")
- `firstGame.createTeam` (default: "Create First Team")
- `firstGame.manageTeams` (default: "Manage Teams")
- `firstGame.manageSeasonsAndTournaments` (default: "Manage Seasons & Tournaments")

**Additional Context Keys**:
- `firstGame.rosterFirst` (default: "Add players first, then create your game")
- `firstGame.orExperiment` (default: "Or experiment first:")
- `firstGame.experimentOption` (default: "Use temporary workspace for testing")
- `firstGame.workspaceWarning` (default: "Temporary workspace - changes won't be saved")
- `firstGame.createRealGame` (default: "Create real game")

### Language Support
- All content fully translatable
- Text length considerations for different languages
- RTL language support through CSS logical properties

## Integration Points

### Modal System Integration
- Overlay actions trigger existing modal systems
- Consistent with app's modal management patterns
- Proper z-index layering (overlay < modals)

### Navigation Integration
- Actions route to appropriate app sections
- Maintains navigation state and history
- Integrates with existing routing patterns

### Settings Integration
- Uses `hasSeenAppGuide` setting for completion tracking
- Integrates with app settings persistence layer
- Can be reset via settings for development/testing

## Technical Considerations

### Performance
- Overlay only renders when needed (conditional rendering)
- Minimal impact on field canvas performance
- Efficient state management for visibility

### Accessibility
- Keyboard navigation support for all buttons
- Screen reader compatible text and roles
- Focus management when overlay appears/disappears

### Field Interaction
- Overlay allows limited field interaction underneath
- Semi-transparent design maintains field context
- Does not interfere with essential field functionality

## Key Behaviors Summary

1. **Contextual Appearance**: Shows only for first-time users on field access
2. **Adaptive Content**: Changes based on current roster state
3. **One-Time Experience**: Permanently dismissed after any action
4. **Non-Blocking**: Allows some field interaction while visible
5. **Action-Oriented**: Every button leads to concrete next steps
6. **Progressive Guidance**: Adapts to user's current setup progress
7. **Mobile-Friendly**: Optimized for touch interaction and small screens