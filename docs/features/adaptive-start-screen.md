# Adaptive Start Screen

## Overview
Dual-mode start screen interface that intelligently adapts between first-time user and experienced user layouts based on app data state.

**⚠️ Implementation Note**: This document focuses on UI/UX behavior and business logic. The following technical aspects are NOT covered and must be investigated in the target app version before implementation:
- Data storage mechanisms (how player/game data is persisted and retrieved)
- State management approach (how app state is handled across components)
- Authentication requirements (if user sessions affect the start screen logic)
- Performance considerations for data checking (async data loading patterns)

## Business Logic

### Mode Detection Logic
The interface mode is determined by a single boolean condition:
```
isFirstTimeUser = !hasPlayers || !hasSavedGames
```

**Data Requirements**:
- `hasPlayers`: Boolean indicating if any players exist in the roster
- `hasSavedGames`: Boolean indicating if any games have been saved
- `canResume`: Boolean indicating if a specific resumable game exists
- `hasSeasonsTournaments`: Boolean indicating if seasons or tournaments exist

### Mode Switching Behavior
- **Automatic**: Mode switches instantly when component renders based on current data state
- **No persistence**: No user preference stored - always based on current app data
- **Immediate**: Changes take effect on next start screen visit

## UI/UX Implementation Details

### Visual Design Foundation

**Container Styling**:
- Full viewport height (`min-h-screen min-h-[100dvh]`)
- Dark theme base: `bg-slate-950 text-slate-100`
- Complex layered background with 11+ visual layers including noise, gradients, aurora effects
- Centered flex layout with overflow hidden

**Logo Design**:
- Uses Audiowide font family
- Responsive sizing: `text-6xl sm:text-8xl md:text-9xl lg:text-[10rem]`
- Multi-layered holographic gradient animation with three rotating conic gradients
- Colors: Cyan (#22d3ee), Lime (#a3e635), Yellow (#fde047), Orange (#f97316), Magenta (#e83d6d), Violet (#8b5cf6)
- Each word ("Match", "Ops", "Local") has different rotation offsets (0deg, 45deg, 95deg)

### First-Time User Mode

**Trigger Condition**: `isFirstTimeUser = true`

**Layout Structure**:
```
- Logo (top, centered)
- Flexible spacer
- Button container (max-width: sm, centered, px-4)
  - "Get Started" button
  - "How It Works" button
- Flexible spacer (mirrors top)
- Language switcher (bottom, fixed position)
```

**Button Specifications**:

**Get Started Button**:
- Style: `px-6 py-4 rounded-lg text-lg font-bold text-white`
- Colors: `bg-gradient-to-r from-indigo-600 to-violet-700`
- Hover: `hover:from-indigo-500 hover:to-violet-600`
- Effects: `focus:ring-2 focus:ring-indigo-500 shadow-xl`
- Action: Navigates to main app with no specific initial action

**How It Works Button**:
- Style: `px-4 py-2.5 rounded-md text-sm font-medium text-slate-300`
- Background: `bg-slate-800/50 hover:bg-slate-700/50`
- Border: `border border-slate-600`
- Action: Opens instructions modal overlay

**Spacing**: 
- Button gap: `gap-4 sm:gap-5`
- Equal flex spacers above and below button container

### Experienced User Mode

**Trigger Condition**: `isFirstTimeUser = false`

**Layout Structure**:
```
- Logo (top, centered)
- Flexible spacer
- Button container (max-width: sm, centered, px-4)
  - [Conditional] Setup Roster (if !hasPlayers)
  - Resume Last Game
  - Load Game
  - Seasons & Tournaments
  - Manage Teams
  - View Stats
- Flexible spacer (mirrors top)
- Language switcher (bottom, fixed position)
```

**Button State Logic**:

**Setup Roster Button**:
- **Visibility**: Only shown when `!hasPlayers`
- **Style**: Primary button style (enabled)
- **Position**: First in button list when visible

**Resume Last Game Button**:
- **Visibility**: Always shown
- **State**: Enabled if `canResume`, disabled otherwise
- **Style**: Primary when enabled, disabled when not

**Load Game Button**:
- **Visibility**: Always shown
- **State**: Enabled if `hasSavedGames`, disabled otherwise
- **Style**: Primary when enabled, disabled when not

**Seasons & Tournaments Button**:
- **Visibility**: Always shown
- **State**: Enabled if `hasPlayers`, disabled otherwise
- **Text**: "Seasons & Tournaments" if `hasSeasonsTournaments`, "First Season/Tournament" otherwise
- **Style**: Primary when enabled, disabled when not

**Manage Teams Button**:
- **Visibility**: Always shown
- **State**: Enabled if `hasPlayers`, disabled otherwise
- **Style**: Primary when enabled, disabled when not

**View Stats Button**:
- **Visibility**: Always shown
- **State**: Enabled if `hasSavedGames`, disabled otherwise
- **Style**: Primary when enabled, disabled when not

**Button Styling Classes**:

**Primary Button Style**:
```css
w-full px-4 py-3 rounded-lg text-base font-semibold text-white 
bg-gradient-to-r from-indigo-600 to-violet-700 
hover:from-indigo-500 hover:to-violet-600 
transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 
shadow-lg text-center leading-tight
```

**Disabled Button Style**:
```css
w-full px-4 py-3 rounded-lg text-base font-semibold text-slate-400 
bg-gradient-to-r from-slate-700 to-slate-600 
cursor-not-allowed shadow-lg opacity-50 text-center leading-tight
```

**Spacing**:
- Button gap: `gap-3`
- Equal flex spacers above and below button container

### Language Switcher

**Position**: Fixed at bottom center (`absolute left-1/2 -translate-x-1/2 bottom-8 md:bottom-6`)
**Container**: `bg-slate-800/70 border border-slate-600 backdrop-blur-sm rounded-lg`

**Button Styling**:
- Active: `bg-indigo-600 text-white`
- Inactive: `text-slate-300 hover:bg-slate-700/60`
- Size: `px-3 h-8 text-xs font-bold`
- Languages: "EN" and "FI" options

### Modal Integration

**Instructions Modal**:
- Triggered by "How It Works" button in first-time user mode
- Component: `InstructionsModal`
- Props: `isOpen`, `onClose`
- Overlay behavior standard modal pattern

## Responsive Behavior

**Breakpoint Adaptations**:
- Logo size scales across 4 breakpoints (sm, md, lg)
- Container padding adjusts: `py-8 md:py-7`
- Button gaps adjust: `gap-4 sm:gap-5` (first-time) vs `gap-3` (experienced)
- Language switcher position: `bottom-8 md:bottom-6`

**Layout Constraints**:
- Maximum button container width: `max-w-sm` (384px)
- Consistent horizontal padding: `px-4`
- Full viewport height utilization with safe area considerations

## Internationalization

**Translation Keys Used**:
- `startScreen.getStarted` (default: "Get Started")
- `startScreen.howItWorks` (default: "How It Works")
- `startScreen.setupRoster` (default: "Setup Team Roster")
- `startScreen.resumeGame` (default: "Resume Last Game")
- `startScreen.loadGame` (default: "Load Game")
- `startScreen.createSeasonTournament` (default: "Seasons & Tournaments")
- `startScreen.createFirstSeasonTournament` (default: "First Season/Tournament")
- `startScreen.manageTeams` (default: "Manage Teams")
- `startScreen.viewStats` (default: "View Stats")
- `startScreen.languageEnglish` (default: "English")
- `startScreen.languageFinnish` (default: "Finnish")

**Language Persistence**: Selected language is stored and restored across sessions.

## Animation and Effects

**Logo Animation**:
- Three-layer rotating conic gradients with CSS custom properties
- Animation class: `start-logo-gradient-animate`
- Each word has different rotation offset via `--holo-start` CSS variable
- Animation duration: Continuous infinite rotation at slow speed
- Z-index layering: Logo above background, below modals (z-10 to z-20 range)

**Button Interactions**:
- Color transitions on hover (`transition-colors`)
- Focus ring on keyboard interaction (`focus:ring-2 focus:ring-indigo-500`)
- Disabled buttons have no hover effects and `cursor-not-allowed`

**Background Effects**:
- 11+ layered background effects including noise, gradients, aurora, grid, spotlights
- Rotating highlight layer with slow animation (`animate-rotate-slow`)
- Gradient animations (`animate-gradient`)

## Edge Cases and Error Handling

**Data State Combinations**:
1. **No data at all**: Shows first-time user mode
2. **Only players, no games**: Shows first-time user mode  
3. **Only games, no players**: Shows first-time user mode
4. **Both players and games**: Shows experienced user mode

**Button State Edge Cases**:
- Disabled buttons have no click handlers (`onClick={condition ? handler : undefined}`)
- All buttons in experienced mode are always visible, state managed via styling only
- Text content adapts based on data existence (seasons/tournaments button text)

**Modal State**:
- Instructions modal state managed locally in component
- Modal can only be opened from first-time user mode

## Key Behaviors Summary

1. **Automatic Adaptation**: Interface changes based purely on data state, no configuration
2. **Progressive Disclosure**: Complexity increases as user adds data to the app
3. **Consistent Language**: Language selection persists across both modes and sessions
4. **Visual Hierarchy**: Primary actions emphasized through styling and positioning
5. **Accessibility**: Keyboard navigation, focus management, and ARIA labels included
6. **Responsive Design**: Layout adapts across mobile, tablet, and desktop breakpoints

## Responsive Design Specifications

**Breakpoint Values**:
- **Mobile**: < 640px (default)
- **Small (sm)**: ≥ 640px 
- **Medium (md)**: ≥ 768px
- **Large (lg)**: ≥ 1024px

**Logo Scaling**:
- Mobile: `text-6xl` (96px)
- Small: `sm:text-8xl` (128px)
- Medium: `md:text-9xl` (144px)
- Large: `lg:text-[10rem]` (160px)

**Button Container**:
- Max width: `max-w-sm` (384px)
- Padding: `px-4` (16px horizontal)
- Gap variations: `gap-4 sm:gap-5` vs `gap-3`

**Language Switcher Position**:
- Mobile: `bottom-8` (32px from bottom)
- Desktop: `md:bottom-6` (24px from bottom)