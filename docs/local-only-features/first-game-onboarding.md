# First Game Onboarding

## Overview
Comprehensive onboarding system with three interconnected layers designed to guide users from initial app setup through their first real game experience:

1. **Center Overlay** - Initial setup guidance on the default workspace
2. **Top Warning Banner** - Temporary workspace alerts 
3. **First Game Interface Guide** - Tutorial overlay for actual game interface

The system provides dynamic feedback based on existing teams and seasons/tournaments, ensuring contextual guidance.

## Implementation Architecture

### Core Constants
**File**: `src/config/constants.ts`
```typescript
export const DEFAULT_GAME_ID = 'unsaved_game';
```

The system uses `DEFAULT_GAME_ID` to identify when users are in the temporary workspace vs. a real game.

## Layer 1: Center Overlay

### Display Conditions
**File**: `src/components/HomePage.tsx`

```typescript
{currentGameId === DEFAULT_GAME_ID && playersOnField.length === 0 && drawings.length === 0 && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
    <div className="bg-slate-800/95 border border-indigo-500/50 rounded-xl p-10 max-w-lg mx-4 pointer-events-auto shadow-2xl backdrop-blur-sm">
      {/* Overlay Content */}
    </div>
  </div>
)}
```

**Conditions for Display**:
- `currentGameId === DEFAULT_GAME_ID` (user in temporary workspace)
- `playersOnField.length === 0` (no players placed yet)
- `drawings.length === 0` (no drawings made yet)
- **NOT** dependent on `hasUsedWorkspace` (removed in current implementation)

### Content Structure

#### No Players State
**Translation Keys**: `firstGame.titleNoPlayers`, `firstGame.descNoPlayers`

When `availablePlayers.length === 0`:
- Shows "Ready to get started?" title
- Primary action: "Set up Roster" button → opens RosterSettingsModal
- Secondary action: "How It Works" button → opens InstructionsModal

#### Has Players State  
**Translation Keys**: `firstGame.title`, `firstGame.desc`

When `availablePlayers.length > 0`:
- Shows "Ready to track your first game?" title
- Three dynamic action buttons with contextual styling

### Dynamic Button System

#### Button 1: Create First Game
**Implementation**: Lines ~2730-2740 in HomePage.tsx
- **Style**: Primary indigo gradient
- **Action**: Opens NewGameSetupModal
- **Always Available**: When players exist

#### Button 2: Team Management (Dynamic)
**Logic**: Based on `teams.length > 0`

```typescript
// Team count check (from useTeamsQuery hook)
const { data: teams = [] } = useTeamsQuery();

// Button text and styling
{teams.length > 0 
  ? t('firstGame.manageTeams', 'Manage Teams') 
  : t('firstGame.createTeam', 'Create First Team')
}
```

**Visual States**:
- **No Teams**: "Create First Team" - bright emerald background (`bg-emerald-600`)
- **Has Teams**: "Manage Teams" - dimmed slate with border (`bg-slate-700 border-slate-600`)

#### Button 3: Seasons/Tournaments (Dynamic)
**Logic**: Based on combined seasons and tournaments count

```typescript
const { data: seasons = [] } = useSeasonsQuery();
const { data: tournaments = [] } = useTournamentsQuery();
const hasSeasonsTournaments = seasons.length > 0 || tournaments.length > 0;

// Button text
{hasSeasonsTournaments 
  ? t('firstGame.manageSeasonsAndTournaments', 'Manage Seasons & Tournaments')
  : t('firstGame.createSeasonTournament', 'Create Season/Tournament First')
}
```

**Visual States**:
- **None Exist**: "Create Season/Tournament First" - darker slate (`bg-slate-800`)
- **Exist**: "Manage Seasons & Tournaments" - dimmed slate with border (`bg-slate-700 border-slate-600`)

## Layer 2: Workspace Warning Banner

### Display Conditions
**File**: `src/components/HomePage.tsx`

```typescript
{currentGameId === DEFAULT_GAME_ID && (playersOnField.length > 0 || drawings.length > 0) && (
  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
    <div className="bg-amber-600/95 border border-amber-500/50 rounded-lg px-6 py-3 shadow-xl backdrop-blur-sm max-w-md">
      {/* Warning Content */}
    </div>
  </div>
)}
```

**Trigger Conditions**:
- `currentGameId === DEFAULT_GAME_ID` (still in temporary workspace)
- `playersOnField.length > 0 || drawings.length > 0` (user has made changes)

### Banner Styling
- **Background**: `bg-amber-600/95` (warning amber with transparency)
- **Position**: Centered at top with `z-40` (above field content)
- **Design**: Rounded corners, backdrop blur, amber border

### Content
**Translation Key**: `firstGame.workspaceWarning`
- Warns user they're in temporary workspace
- Prompts to create a real game to save progress
- Includes warning icon for visual emphasis

## Layer 3: First Game Interface Guide

### Trigger Logic
**File**: `src/components/HomePage.tsx`

```typescript
const [showFirstGameGuide, setShowFirstGameGuide] = useState<boolean>(false);
const [firstGameGuideStep, setFirstGameGuideStep] = useState<number>(0);

// Check if user has seen the guide before
const firstGameGuideShown = useMemo(() => {
  // Logic to check localStorage for previous viewing
}, []);

// Show guide when entering first real game
useEffect(() => {
  if (!firstGameGuideShown && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
    const timer = setTimeout(() => {
      setShowFirstGameGuide(true);
    }, 1500); // 1.5s delay for game state to settle
    
    return () => clearTimeout(timer);
  }
}, [firstGameGuideShown, currentGameId]);
```

**Display Conditions**:
- `!firstGameGuideShown` (user hasn't seen guide before)
- `currentGameId !== DEFAULT_GAME_ID` (user is in real game, not workspace)
- `playersOnField.length === 0` (fresh game start)
- `initialLoadComplete` (app has finished loading)

### Guide Structure
**File**: `src/components/HomePage.tsx`

The guide is implemented as a step-by-step carousel with 7 steps:

#### Step 0: Player Selection
```typescript
{firstGameGuideStep === 0 && (
  <div className="space-y-3">
    <h3 className="font-semibold text-indigo-200 text-base">
      {t('firstGameGuide.playerSelection', 'Player Selection (Top Bar)')}
    </h3>
    <ul className="text-sm text-slate-300 space-y-2 list-disc pl-4 marker:text-slate-400">
      <li>{t('firstGameGuide.tapToSelect', 'Tap player disc to select')}</li>
      <li>{t('firstGameGuide.goalieInstructions', 'When selected, tap shield to set as goalie')}</li>
      <li>{t('firstGameGuide.tapFieldPlace', 'Tap field to place player')}</li>
    </ul>
  </div>
)}
```

#### Navigation Controls
```typescript
// Bottom navigation with step indicators
<div className="flex justify-between items-center">
  <button 
    onClick={() => setFirstGameGuideStep(Math.max(0, firstGameGuideStep - 1))}
    disabled={firstGameGuideStep === 0}
    className="px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded disabled:opacity-50"
  >
    {t('firstGameGuide.previous', 'Previous')}
  </button>
  
  <div className="flex gap-1">
    {Array.from({ length: 7 }).map((_, i) => (
      <div 
        key={i}
        className={`w-2 h-2 rounded-full ${
          i === firstGameGuideStep ? 'bg-indigo-400' : 'bg-slate-600'
        }`}
      />
    ))}
  </div>
  
  <button 
    onClick={handleNextOrClose}
    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded"
  >
    {firstGameGuideStep === 6 ? t('firstGameGuide.close') : t('firstGameGuide.next')}
  </button>
</div>
```

### Persistence
**localStorage Integration**: Guide completion is stored to prevent repeated displays:

```typescript
// Save that user has seen the guide
const handleCloseGuide = () => {
  setShowFirstGameGuide(false);
  localStorage.setItem('hasSeenFirstGameGuide', 'true');
};
```

## Instructions Modal Enhancement

### Component Location
**File**: `src/components/InstructionsModal.tsx`

### Modal Structure
```typescript
const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
      <div className="bg-slate-800 flex flex-col h-full w-full bg-noise-texture relative overflow-hidden">
        {/* Gradient overlays for visual appeal */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
        
        {/* Header with title and close button */}
        <div className="flex justify-center items-center pt-10 pb-4 px-6 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20">
          <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg text-center">
            {t('instructionsModal.title')}
          </h2>
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2">
            <HiOutlineXMark className="w-6 h-6" />
          </button>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-6">
          {/* Content sections */}
        </div>
      </div>
    </div>
  );
};
```

### Content Sections

#### Section 1: Player Selection (Lines 57-66)
```typescript
<section className="space-y-3">
  <h3 className="text-2xl font-bold text-yellow-300">
    {t('firstGameGuide.playerSelection', 'Player Selection (Top Bar)')}
  </h3>
  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
    <ul className="text-sm leading-6 text-slate-200 space-y-2 list-disc pl-5 marker:text-slate-400">
      <li>{t('firstGameGuide.tapToSelect', 'Tap player disc to select')}</li>
      <li>{t('firstGameGuide.goalieInstructions', 'When player is selected, tap shield icon to set as goalie')}</li>
      <li>{t('firstGameGuide.tapFieldPlace', 'Tap field to place player')}</li>
    </ul>
  </div>
</section>
```

#### Section 2: The Field (Lines 68-93)
**Key Features**:
- Icon integration with HeroIcons
- Color-coded action buttons matching UI
- Comprehensive field interaction guide

```typescript
<li>
  <span className="text-slate-200">{t('firstGameGuide.placeAllTip', 'Place all players at once with:')}</span>
  <HiOutlineSquares2X2 aria-hidden className="inline-block align-[-2px] ml-2 text-purple-300" size={18} />
</li>
```

#### Advanced Sections
- **Tactical View** (Lines 95-122): Formation mode, tactical positioning
- **Quick Actions** (Lines 124-170): Bottom bar controls, undo/redo, goal logging
- **Game Management** (Lines 172-210): Settings, stats, timer controls
- **Data & Organization** (Lines 212-250): Import/export, teams, seasons

### Icon System
**Implementation**: Consistent use of HeroIcons v2 with semantic colors:

```typescript
import {
  HiOutlineSquares2X2,      // Purple - place all players
  HiOutlinePlusCircle,      // Red/Purple - add opponents/tactics
  HiOutlineBackspace,       // Amber - clear drawings
  HiOutlineTrash,          // Red - reset field
  HiOutlineUsers,          // Slate - roster settings
  // ... more icons
} from 'react-icons/hi2';
```

### Styling System
- **Background**: Gradient overlays with noise texture
- **Sections**: Dark slate panels with border highlights
- **Typography**: Yellow headings, slate body text
- **Icons**: Color-coded to match actual UI elements
- **Layout**: Full-screen modal with scrollable content

## Translation System

### Key Structure
**Files**: `public/locales/*/common.json`

#### Center Overlay Keys
```json
{
  "firstGame": {
    "title": "Ready to track your first game?",
    "titleNoPlayers": "Ready to get started?",
    "desc": "Create a game to start tracking player positions...",
    "descNoPlayers": "First, set up your team roster...",
    "createFirstGame": "Create First Game",
    "manageTeams": "Manage Teams",
    "createTeam": "Create First Team", 
    "manageSeasonsAndTournaments": "Manage Seasons & Tournaments",
    "createSeasonTournament": "Create Season/Tournament First",
    "setupRoster": "Set up Roster",
    "howItWorks": "How It Works",
    "workspaceWarning": "This is a temporary workspace..."
  }
}
```

#### Interface Guide Keys
```json
{
  "firstGameGuide": {
    "title": "Welcome to Your First Game!",
    "subtitle": "Let's quickly go over the basics",
    "playerSelection": "Player Selection (Top Bar)",
    "theField": "The Field",
    "tacticalView": "Tactical View", 
    "quickActions": "Quick Actions (Bottom Bar)",
    "tapToSelect": "Tap player disc to select",
    "goalieInstructions": "When player is selected, tap shield icon to set as goalie",
    "dragToAdjust": "Drag players by dragging",
    "doubleTapRemove": "Double-tap to remove a player from the field",
    "placeAllTip": "Place all players at once with:",
    "addOpponentTip": "Add opponents with:",
    "clearDrawingsTip": "Clear drawings with:",
    "resetFieldTip": "Reset field with:",
    "previous": "Previous",
    "next": "Next", 
    "close": "Got it!",
    "skipGuide": "Skip Guide"
  }
}
```

#### Instructions Modal Keys
```json
{
  "instructionsModal": {
    "title": "How It Works",
    "closeButton": "Close Instructions"
  }
}
```

## State Management

### Local State Hooks
**File**: `src/components/HomePage.tsx`

```typescript
// First Game Guide state
const [showFirstGameGuide, setShowFirstGameGuide] = useState<boolean>(false);
const [firstGameGuideStep, setFirstGameGuideStep] = useState<number>(0);

// Instructions Modal state  
const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState<boolean>(false);
```

### Data Dependencies
Data for dynamic buttons and overlays comes from React Query–backed hooks (`src/hooks/useGameDataQueries.ts` and `src/hooks/useTeamQueries.ts`), which load teams, seasons, tournaments, saved games, and the master roster.

## Implementation Gotchas

### 1. Timing Dependencies
- **First Game Guide**: 1.5s delay ensures game state is fully loaded before showing
- **Dynamic Buttons**: Must wait for React Query data before rendering correct states

### 2. Z-Index Management
- **Center Overlay**: `z-30` (above field, below modals)
- **Warning Banner**: `z-40` (above overlay)
- **Instructions Modal**: `z-[60]` (above everything)

### 3. Responsive Design
- **Center Overlay**: `max-w-lg mx-4` for mobile adaptation
- **Warning Banner**: `max-w-md` for mobile-friendly width
- **Guide**: `max-h-[85vh]` prevents overflow on smaller screens

### 4. Pointer Events
- **Overlays**: `pointer-events-none` on container, `pointer-events-auto` on content
- **Prevents**: Interference with field interactions when overlay is present

### 5. State Persistence
- **Guide Completion**: Stored in localStorage as `'hasSeenFirstGameGuide'`
- **Modal State**: Component-level state, not persisted

## Future Enhancement Opportunities

### Potential Improvements
1. **Progressive Disclosure**: More granular guide steps based on user actions
2. **Contextual Hints**: In-app tooltips for specific UI elements
3. **Video Integration**: Short demo videos for complex interactions
4. **Analytics**: Track which guidance steps are most/least helpful
5. **Customizable**: Allow users to replay specific guide sections
6. **Multi-language**: Enhanced translation coverage for guide content
7. **Accessibility**: Better screen reader support for guide content
