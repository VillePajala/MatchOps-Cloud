# Feature 3: First Game Onboarding Implementation Plan

**Status**: ❌ Needs Re-Implementation (Current implementation is incorrect)  
**Priority**: Medium  
**Estimated Effort**: 4 days  
**Dependencies**: Feature 1 (Smart Roster Detection), Feature 2 (Adaptive Start Screen)

## Overview
Three-phase progressive onboarding system that appears on the soccer field for first-time users, providing contextual guidance based on user completion state. The system guides users from initial roster setup through their first match creation and interface tutorial.

## ⚠️ Current Implementation Issues
**CRITICAL**: The current implementation is in the wrong location and has incorrect behavior:
- ❌ Shows overlay on start screen instead of soccer field view
- ❌ "Aloita tästä" button triggers alert dialog instead of navigating to main app
- ❌ Missing three-phase progressive system as shown in reference screenshots
- ❌ Wrong content structure and Finnish translations

## 📸 Reference Screenshots Analysis
Based on provided screenshots showing correct implementation:

### Screenshot 1: Right After "Aloita tästä" Click
- ✅ **Main app view** with full soccer field visible as background
- ✅ **Center overlay** positioned over soccer field
- ✅ **Title**: "Valmis aloittamaan?" (Ready to get started?)
- ✅ **Message**: "Lisää ensin pelaajia, jotta voit luoda ensimmäisen joukkuesi ja ottelusi." (Add players first so you can create your first team and match)
- ✅ **Single button**: "Luo kokoonpano" (Create lineup/roster) - primary blue

### Screenshot 2: After Roster Creation
- ✅ **Same soccer field background** 
- ✅ **Updated overlay content**
- ✅ **Title**: "Kaikki valmista ensimmäiseen otteluun!" (All ready for first match!)
- ✅ **Message**: "Haluatseesi voit luoda ensimmäisen joukkuesi, turnauksei tai kautesi." (If you want, you can create your first team, tournament or season)
- ✅ **Three buttons**:
  - 🔵 **"Luo ensimmäinen ottelu"** (Create first match) - Primary blue
  - 🔘 **"Hallinnoi joukkueita"** (Manage teams) - Secondary gray
  - 🔘 **"Luo ensin kausi/turnaus"** (Create season/tournament first) - Secondary gray

### Screenshot 3: Tutorial Phase
- ✅ **Active game state** showing game header with team names and score
- ✅ **Tutorial overlay**: "Tervetuloa ensimmäiseen otteluusi!" (Welcome to your first match!)
- ✅ **Step-by-step guide** with bullet points about player selection
- ✅ **Navigation system**: Step indicators (dots) and Back/Next buttons
- ✅ **Title**: "Pelaajien valinta (yläpalkki)" (Player selection - top bar)

## Implementation Checklist

### Phase 1: Fix Navigation and Integration Point (Day 1.5)

#### 1.1 Fix Start Screen Navigation
- [ ] **File**: `src/app/page.tsx` or equivalent start screen component
- [ ] **Current Issue**: "Aloita tästä" button shows alert instead of navigating
- [ ] **Required Fix**: Button should navigate directly to main HomePage view
- [ ] **Implementation**:
```typescript
// Remove alert/dialog logic, replace with navigation
const handleStartClick = () => {
  // Navigate to main app view (HomePage)
  router.push('/'); // or appropriate route
};
```

#### 1.2 Move Overlay to Correct Location
- [ ] **Current Wrong Location**: Start screen component
- [ ] **Correct Location**: `src/components/HomePage.tsx` - over soccer field
- [ ] **Integration Point**: Soccer field container with relative positioning
- [ ] **Remove**: Existing overlay logic from start screen

#### 1.3 Update Component Interface for Three Phases
- [ ] **File**: `src/components/FirstGameOnboardingOverlay.tsx`
- [ ] **Enhanced Interface**:
```typescript
interface FirstGameOnboardingOverlayProps {
  phase: 'no-players' | 'has-players' | 'tutorial';
  hasPlayers: boolean;
  hasTeams: boolean;
  hasSeasons: boolean;
  hasTournaments: boolean;
  onCreateRoster: () => void;
  onCreateGame: () => void;
  onManageTeams: () => void;
  onManageSeasons: () => void;
  onDismiss: () => void;
  isVisible: boolean;
  // Tutorial phase specific
  tutorialStep?: number;
  onTutorialNext?: () => void;
  onTutorialPrev?: () => void;
  onTutorialClose?: () => void;
}
```

### Phase 2: Implement Correct Content and Design (Day 1)

#### 2.1 Update Finnish Content Structure
- [ ] **Phase 1 - No Players State**:
  - [ ] **Title**: "Valmis aloittamaan?"
  - [ ] **Message**: "Lisää ensin pelaajia, jotta voit luoda ensimmäisen joukkuesi ja ottelusi."
  - [ ] **Button**: "Luo kokoonpano" (primary blue, full width)

- [ ] **Phase 2 - Has Players State**:
  - [ ] **Title**: "Kaikki valmista ensimmäiseen otteluun!"
  - [ ] **Message**: "Haluatseesi voit luoda ensimmäisen joukkuesi, turnauksei tai kautesi."
  - [ ] **Three Buttons**:
    - Primary: "Luo ensimmäinen ottelu" (blue)
    - Secondary: "Hallinnoi joukkueita" (gray)
    - Secondary: "Luo ensin kausi/turnaus" (gray)

#### 2.2 Match Screenshot Visual Design
- [ ] **Exact positioning** as shown in screenshots
- [ ] **Dark overlay background** with rounded corners
- [ ] **Proper button styling** matching screenshot colors
- [ ] **Icon integration** as shown (sport/play icons)
- [ ] **Responsive sizing** to match reference

#### 2.3 Implement Tutorial Phase (Phase 3)
- [ ] **Tutorial Overlay Structure**:
```typescript
// Tutorial phase content structure
{
  title: "Tervetuloa ensimmäiseen otteluusi!",
  subtitle: "Käydään nopeastit läpi perustoimimat",
  sections: [
    {
      title: "Pelaajien valinta (yläpalkki)",
      steps: [
        "Napeauta pelaajekiekkoa aktivoidaaksei pelaaja",
        "Kun pelaaja on valiituna, paina kilven kuvaa asettaaksi hänet maalivahdoksi", 
        "Pelaajan ollessa valittuna, napauta kenttää sijoittaksesei pelaaja"
      ]
    }
    // Additional tutorial sections...
  ]
}
```

### Phase 3: Correct Display Logic and State Management (Day 1)

#### 3.1 Fix Display Triggers
- [ ] **Remove**: Current start screen overlay logic
- [ ] **Add**: Soccer field overlay logic in HomePage.tsx
- [ ] **Show Phase 1** when:
  - User first enters main app from "Aloita tästä"
  - `appStateDetection.isFirstTimeUser === true`
  - `appStateDetection.hasPlayers === false`
  - Not previously dismissed

- [ ] **Show Phase 2** when:
  - `appStateDetection.hasPlayers === true`
  - `appStateDetection.hasGames === false` 
  - First time seeing this phase

- [ ] **Show Phase 3 (Tutorial)** when:
  - User enters their first actual game
  - `currentGameId !== DEFAULT_GAME_ID`
  - Never seen tutorial before

#### 3.2 Update App Settings Integration
- [ ] **File**: `src/utils/appSettings.ts`
- [ ] **Enhanced Settings**:
```typescript
export interface AppSettings {
  // ... existing settings
  firstGameOnboardingPhase1Completed?: boolean;
  firstGameOnboardingPhase2Completed?: boolean;
  firstGameTutorialCompleted?: boolean;
}
```

#### 3.3 State Management Logic
- [ ] **Progressive state tracking** for all three phases
- [ ] **Smart dismissal logic** - phases can be skipped but remembered
- [ ] **Context-aware display** - only show relevant phase

### Phase 4: Translation Updates and Finnish Localization (Day 0.5)

#### 4.1 Add Correct Finnish Translations
- [ ] **File**: `public/locales/fi/common.json`
- [ ] **Add Keys Based on Screenshots**:
```json
{
  "firstGame": {
    "phase1": {
      "title": "Valmis aloittamaan?",
      "message": "Lisää ensin pelaajia, jotta voit luoda ensimmäisen joukkuesi ja ottelusi.",
      "createRoster": "Luo kokoonpano"
    },
    "phase2": {
      "title": "Kaikki valmista ensimmäiseen otteluun!",
      "message": "Haluatseesi voit luoda ensimmäisen joukkuesi, turnauksei tai kautesi.",
      "createFirstMatch": "Luo ensimmäinen ottelu",
      "manageTeams": "Hallinnoi joukkueita", 
      "createSeasonTournament": "Luo ensin kausi/turnaus"
    },
    "tutorial": {
      "title": "Tervetuloa ensimmäiseen otteluusi!",
      "subtitle": "Käydään nopeastit läpi perustoimimat",
      "playerSelection": "Pelaajien valinta (yläpalkki)",
      "steps": {
        "selectPlayer": "Napeauta pelaajekiekkoa aktivoidaaksei pelaaja",
        "setGoalie": "Kun pelaaja on valiituna, paina kilven kuvaa asettaaksi hänet maalivahdoksi",
        "placePlayer": "Pelaajan ollessa valittuna, napauta kenttää sijoittaksesei pelaaja"
      },
      "back": "Takaisin",
      "next": "Seuraava"
    }
  }
}
```

#### 4.2 Add English Translations
- [ ] **File**: `public/locales/en/common.json`
- [ ] **Add equivalent English keys** for international support

### Phase 5: HomePage Integration and Soccer Field Overlay (Day 1)

#### 5.1 Integrate with Soccer Field Container
- [ ] **File**: `src/components/HomePage.tsx`
- [ ] **Find soccer field container** (likely around MigratedSoccerField usage)
- [ ] **Add overlay positioning**:
```typescript
// Soccer field container with overlay support
<div className="relative w-full h-full">
  <MigratedSoccerField {...fieldProps} />
  
  {/* First Game Onboarding Overlay */}
  {showFirstGameOnboarding && (
    <FirstGameOnboardingOverlay
      phase={currentOnboardingPhase}
      hasPlayers={appStateDetection?.hasPlayers ?? false}
      hasTeams={teams?.length > 0}
      hasSeasons={seasons?.length > 0}
      hasTournaments={tournaments?.length > 0}
      onCreateRoster={() => openModal('rosterSettings')}
      onCreateGame={() => openModal('newGameSetup')}
      onManageTeams={() => openModal('teamManagement')}
      onManageSeasons={() => openModal('seasonTournamentManagement')}
      onDismiss={handleOnboardingDismiss}
      isVisible={showFirstGameOnboarding}
      // Tutorial props when in tutorial phase
      tutorialStep={tutorialStep}
      onTutorialNext={handleTutorialNext}
      onTutorialPrev={handleTutorialPrev}
      onTutorialClose={handleTutorialClose}
    />
  )}
</div>
```

#### 5.2 Implement Phase Detection Logic
- [ ] **Phase 1 Trigger**: First app entry from start screen
- [ ] **Phase 2 Trigger**: After roster creation, before first game
- [ ] **Phase 3 Trigger**: First real game entry
- [ ] **Smart state management** prevents duplicate displays

### Phase 6: Testing and Integration Validation (Day 1)

#### 6.1 User Flow Testing Against Screenshots
- [ ] **"Aloita tästä" Navigation**: Verify button navigates to main app
- [ ] **Phase 1 Display**: Matches Screenshot 1 exactly
- [ ] **Phase 2 Display**: Matches Screenshot 2 exactly  
- [ ] **Phase 3 Display**: Matches Screenshot 3 exactly
- [ ] **Progressive Flow**: Each phase leads naturally to next

#### 6.2 Integration Testing
- [ ] **Soccer field visibility**: Overlay doesn't obstruct gameplay when dismissed
- [ ] **Modal integration**: Action buttons open correct modals
- [ ] **State persistence**: Completed phases don't re-appear
- [ ] **Responsive behavior**: Works on all device sizes

#### 6.3 Edge Case Testing
- [ ] **Navigation during overlay**: Proper cleanup
- [ ] **Multiple modal conflicts**: Z-index management
- [ ] **Data loading states**: Graceful loading/error handling
- [ ] **Translation switching**: All content updates correctly

## File Dependencies

### Files to Modify
- `src/app/page.tsx` (fix start screen navigation)
- `src/components/HomePage.tsx` (add soccer field overlay integration)
- `src/components/FirstGameOnboardingOverlay.tsx` (complete rewrite based on screenshots)
- `src/utils/appSettings.ts` (add three-phase tracking)
- `public/locales/fi/common.json` (add correct Finnish translations)
- `public/locales/en/common.json` (add English translations)

### Files to Remove/Clean Up
- Any existing start screen overlay logic
- Incorrect onboarding integration points

## Success Criteria
- [ ] "Aloita tästä" navigates directly to main app view with soccer field
- [ ] Phase 1 overlay matches Screenshot 1 exactly (visual and content)
- [ ] Phase 2 overlay matches Screenshot 2 exactly (visual and content)  
- [ ] Phase 3 tutorial matches Screenshot 3 exactly (visual and content)
- [ ] Progressive flow works seamlessly from start to first game completion
- [ ] All Finnish translations match screenshot text exactly
- [ ] Soccer field remains fully functional during and after onboarding
- [ ] State persistence prevents repetitive displays
- [ ] All action buttons route to correct modals and complete expected workflows

## Implementation Priority
**HIGH PRIORITY** - Current implementation is completely incorrect and needs to be redone to match the documented behavior shown in reference screenshots.

## Post-Implementation Notes
- Document exact integration approach used for soccer field overlay
- Record z-index management strategy for three-phase system
- Note user feedback on corrected onboarding flow effectiveness
- Document any challenges with navigation flow correction