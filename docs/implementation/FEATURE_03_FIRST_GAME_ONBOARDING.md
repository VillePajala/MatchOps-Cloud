# Feature 3: First Game Onboarding Implementation Plan

**Status**: Ready for Implementation  
**Priority**: Medium  
**Estimated Effort**: 3 days  
**Dependencies**: Feature 1 (Smart Roster Detection), Feature 2 (Adaptive Start Screen)

## Overview
Center overlay guidance system on the soccer field for first-time users, providing contextual help based on roster state.

## Current State Analysis
- ✅ `MigratedSoccerField.tsx` exists with canvas implementation
- ✅ Canvas sizing: 800x600 with responsive scaling (`w-full h-full`, max-height: 70vh)
- ✅ Existing modal z-index patterns: standard modals use `z-[60]`
- ✅ App settings system available for completion tracking
- ❌ No overlay system on soccer field
- ❌ No onboarding completion tracking

## Implementation Checklist

### Phase 1: Overlay Component Creation (Day 1.5)

#### 1.1 Create Onboarding Overlay Component
- [ ] **File**: `src/components/FirstGameOnboardingOverlay.tsx`
- [ ] **Component Interface**:
```typescript
interface FirstGameOnboardingOverlayProps {
  hasPlayers: boolean;
  onSetupRoster: () => void;
  onCreateNewGame: () => void;
  onDismiss: () => void;
  isVisible: boolean;
}
```

#### 1.2 Implement Overlay Design
- [ ] **Positioning Strategy**:
  - [ ] Use `absolute` positioning over field container
  - [ ] Center both horizontally and vertically
  - [ ] Ensure responsive design across screen sizes

- [ ] **Visual Design**:
```typescript
// Base overlay container
className="absolute inset-0 flex items-center justify-center z-[70] bg-black/40 backdrop-blur-sm"

// Content card
className="bg-slate-800/95 border border-slate-600 rounded-xl p-6 max-w-md mx-4 shadow-2xl"
```

#### 1.3 Implement State-Based Content
- [ ] **No Players State**:
  - [ ] Title: "Ready to set up your team?"
  - [ ] Message: Explain need to add players first
  - [ ] Primary action: "Set Up Team Roster" button
  - [ ] Secondary action: "Skip for now" link

- [ ] **Has Players State**:
  - [ ] Title: "Ready to create your first match!"
  - [ ] Message: Explain game creation process
  - [ ] Primary action: "Create New Game" button  
  - [ ] Secondary action: "Maybe later" link

#### 1.4 Add Field Integration Logic
- [ ] **Find Field Container Component**:
  - [ ] Locate parent component of `MigratedSoccerField.tsx`
  - [ ] Identify field wrapper with proper positioning context
  - [ ] Ensure container has `relative` positioning for overlay

### Phase 2: Field Component Integration (Day 1)

#### 2.1 Locate and Modify Field Parent
- [ ] **Investigation Tasks**:
  - [ ] Find component that renders `MigratedSoccerField`
  - [ ] Identify current container structure and styling
  - [ ] Verify positioning context for absolute overlays

- [ ] **Integration Steps**:
  - [ ] Add overlay conditional rendering to field parent
  - [ ] Pass required props (detection data, modal handlers)
  - [ ] Ensure z-index stacking works correctly

#### 2.2 Implement Overlay Dismissal Logic
- [ ] **Dismissal Conditions**:
  - [ ] Manual dismissal via "Skip" or "Maybe later"
  - [ ] Automatic dismissal after completing actions
  - [ ] Click outside overlay to dismiss

- [ ] **State Management**:
  - [ ] Track dismissal in component state
  - [ ] Prevent re-showing until conditions change
  - [ ] Integrate with completion tracking system

### Phase 3: Settings Integration and Completion Tracking (Day 1)

#### 3.1 Add App Settings Integration
- [ ] **File**: `src/utils/appSettings.ts`
- [ ] **Current Interface Analysis**: Review existing `AppSettings` interface
- [ ] **Add New Setting**:
```typescript
export interface AppSettings {
  // ... existing settings
  hasSeenFirstGameOnboarding?: boolean;
}
```

#### 3.2 Implement Completion Tracking
- [ ] **Setting Functions**:
  - [ ] `getHasSeenFirstGameOnboarding(): Promise<boolean>`
  - [ ] `setHasSeenFirstGameOnboarding(seen: boolean): Promise<void>`
  - [ ] Integrate with existing storage system patterns

#### 3.3 Add Display Logic
- [ ] **Show Conditions**:
  - [ ] User has not seen onboarding (`hasSeenFirstGameOnboarding === false`)
  - [ ] User is in game/field view (not on start screen)
  - [ ] Either no players or no games (first-time user indicators)

- [ ] **Hide Conditions**:
  - [ ] User has completed onboarding
  - [ ] User has dismissed overlay
  - [ ] User has both players and saved games (experienced user)

### Phase 4: Translation and Responsive Design (Day 0.5)

#### 4.1 Add Translation Keys
- [ ] **File**: `public/locales/en/common.json`
- [ ] **Add Keys**:
```json
{
  "firstGame.titleNoPlayers": "Ready to set up your team?",
  "firstGame.titleHasPlayers": "Ready to create your first match!",
  "firstGame.messageNoPlayers": "Start by adding players to your roster. You'll need at least one player to create a game.",
  "firstGame.messageHasPlayers": "You have players ready! Create your first match to start tracking game statistics and player performance.",
  "firstGame.setupRoster": "Set Up Team Roster",
  "firstGame.createNewGame": "Create New Game",
  "firstGame.skipForNow": "Skip for now",
  "firstGame.maybeLater": "Maybe later"
}
```

- [ ] **File**: `public/locales/fi/common.json`
- [ ] **Add Finnish Translations**

#### 4.2 Implement Responsive Design
- [ ] **Mobile Optimization (< 640px)**:
  - [ ] Reduce padding and margins
  - [ ] Adjust font sizes for readability
  - [ ] Ensure touch-friendly button sizes (min 44px)
  - [ ] Consider full-screen overlay on very small screens

- [ ] **Tablet Optimization (640px - 1024px)**:
  - [ ] Maintain card-based design
  - [ ] Adjust max-width for better proportions
  - [ ] Ensure buttons are appropriately sized

- [ ] **Desktop Optimization (> 1024px)**:
  - [ ] Maintain current design specifications
  - [ ] Consider slightly larger content area
  - [ ] Ensure overlay doesn't dominate large screens

### Phase 5: Testing and Edge Cases (Day 0.5)

#### 5.1 Integration Testing
- [ ] **Component Integration**:
  - [ ] Overlay renders correctly over soccer field
  - [ ] Z-index stacking works with other modals
  - [ ] Dismissal logic functions as expected
  - [ ] Settings persistence works correctly

#### 5.2 User Flow Testing
- [ ] **No Players Flow**:
  - [ ] Overlay appears with correct content
  - [ ] "Set Up Roster" opens `RosterSettingsModal`
  - [ ] After adding first player, overlay updates content
  - [ ] "Skip" properly dismisses and marks as seen

- [ ] **Has Players Flow**:
  - [ ] Overlay shows game creation content
  - [ ] "Create New Game" opens `NewGameSetupModal`
  - [ ] After creating first game, overlay disappears permanently
  - [ ] "Maybe Later" dismisses without marking complete

#### 5.3 Edge Case Testing
- [ ] **Multiple Field Views**: Overlay only shows once per session
- [ ] **Navigation During Overlay**: Proper cleanup when navigating away
- [ ] **Modal Interaction**: Overlay dismisses when other modals open
- [ ] **Error States**: Graceful handling of storage/settings errors

#### 5.4 Responsive Testing
- [ ] **Mobile Devices**: Touch interaction works correctly
- [ ] **Tablet Portrait/Landscape**: Layout adapts appropriately  
- [ ] **Desktop Screens**: Overlay proportions look correct
- [ ] **Very Large Screens**: Overlay doesn't become too large

### Phase 6: Performance and Polish (Day 0.5)

#### 6.1 Performance Optimization
- [ ] **Conditional Rendering**: Only render when needed
- [ ] **Event Handlers**: Proper cleanup to prevent memory leaks
- [ ] **Animation Performance**: Smooth fade-in/out transitions
- [ ] **Settings Caching**: Minimize storage calls

#### 6.2 Visual Polish
- [ ] **Animation Timing**: Smooth entrance/exit animations
- [ ] **Focus Management**: Proper focus handling for accessibility
- [ ] **Visual Hierarchy**: Clear content organization and emphasis
- [ ] **Consistency**: Match app's overall design language

## File Dependencies
- `src/components/FirstGameOnboardingOverlay.tsx` (new)
- `src/utils/appSettings.ts` (modify - add new setting)
- Field parent component (modify - add overlay integration)
- `public/locales/en/common.json` (modify)
- `public/locales/fi/common.json` (modify)

## Success Criteria
- [ ] Overlay appears for first-time users at appropriate times
- [ ] Content adapts correctly based on roster state
- [ ] Action buttons route to correct modals and workflows
- [ ] Completion tracking prevents repetitive displays
- [ ] Responsive design works across all device sizes
- [ ] Performance impact is minimal
- [ ] All content is properly translated
- [ ] Integration with existing field component is seamless

## Post-Implementation Notes
- Document field component integration approach used
- Record any challenges with z-index stacking
- Note user feedback on onboarding effectiveness
- Document performance metrics and optimization results