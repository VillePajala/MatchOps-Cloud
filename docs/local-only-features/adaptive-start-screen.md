# Adaptive Start Screen (Dual-Mode)

## Overview
Switches between a simplified first-time user interface and a full-featured interface for experienced users.

## Detection (Updated)
```typescript
// src/app/page.tsx
const isFirstTimeUser = !hasPlayers || !hasSavedGames;
// User is considered first-time if they lack EITHER a roster OR saved games
```

## First-Time Mode
- Streamlined two-button interface:
  - **Get Started** (primary) - Opens Home with default workspace
  - **How It Works** (secondary) - Opens instructions modal
- Clean layout with centered logo and minimal choices

## Experienced Mode (Reorganized)
Full-featured interface with logical button progression:

### Primary Actions (Top)
1. **Resume Last Game** - Only shown when `canResume` is true
2. **Load Game** - Enabled when games exist

### Management Actions (Middle)
3. **Teams** (was "Manage Teams") - Team management modal
4. **Seasons & Tournaments** - Smart text based on existing data
5. **Stats** (was "View Stats") - Player statistics viewer

### Setup Actions (Bottom)
6. **Setup Roster** - Only shown when no players exist
7. **How It Works** - Instructions modal

## Visual Design Updates

### Logo Animation
- **Multi-layered holographic gradients** with independent animations
- Three gradient layers (primary, secondary, tertiary) using `background-blend-mode: screen`
- Each title line has different `--holo-start` angles (0deg, 45deg, 95deg)
- Four concurrent animations per line with varying durations:
  - `start-holo-drift`: 10-12s
  - `start-holo-rotate`: 26-32s  
  - `start-holo-rotate2`: 38-44s
  - `start-holo-rotate3`: 60-75s
- Staggered timing and background sizes prevent synchronization

### Gradient Palette
```css
/* High-contrast colors optimized for dark background */
Primary: #22d3ee (Cyan), #a3e635 (Lime), #fde047 (Yellow), 
         #f97316 (Orange), #e83d6d (Magenta), #8b5cf6 (Violet)
```

### Layout Changes
- Removed tagline and decorative divider for cleaner appearance
- Adjusted vertical spacing with `py-8 md:py-7` containers
- Better button grouping with consistent gaps

## Finnish Label Updates
Recent terminology changes for clarity:
- "Lataa peli" → "Lataa ottelu" (Load game → Load match)
- "Jatka edellistä peliä" → "Jatka edellistä ottelua" (Resume last game → Resume last match)
- "Hallinnoi joukkueita" → "Joukkueet" (Manage teams → Teams)
- "Näytä tilastot" → "Tilastot" (View stats → Stats)

## Button Styling
- Primary: Indigo-to-violet gradient with shadow
- Disabled: Slate gradient with 50% opacity
- All buttons use consistent padding and font weight

## i18n Keys
Core keys used:
- `startScreen.getStarted`, `startScreen.howItWorks`
- `startScreen.resumeGame`, `startScreen.loadGame`  
- `startScreen.manageTeams`, `startScreen.viewStats`
- `startScreen.createSeasonTournament`, `startScreen.setupRoster`
