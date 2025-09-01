# MatchOps Local – Feature Documentation

This directory contains comprehensive documentation for all local-only features in MatchOps-Local. Each document provides detailed implementation guides with exact file paths, code snippets, and architectural explanations to help developers understand and implement these features.

## Documentation Standards

Each feature documentation includes:
- **Repo-relative file paths** for all code references (clickable in editor)
- **Complete TypeScript interfaces** and type definitions (quoted from code)
- **localStorage keys and React Query keys** used (as defined in `src/config/storageKeys.ts` and `src/config/queryKeys.ts`)
- **Translation key structures** with examples
- **Implementation gotchas and important details**
- **Architecture explanations and component relationships**

Notes on references:
- Line numbers are intentionally avoided to reduce brittleness. Search within the referenced files to locate snippets that are shown inline.
- All examples and claims have been verified against the current code in this repository.

## Core User Experience Features

### Smart Roster Detection (`smart-roster-detection.md`)
**Intelligent state detection that prevents empty roster dead-ends**
- Detects empty roster states at app startup (`src/app/page.tsx`)
- Provides guard conditions throughout UI components
- Adapts StartScreen interface for first-time vs experienced users
- Implements proactive user guidance to roster setup
- **Key Implementation**: Boolean state flags (`hasPlayers`, `hasSavedGames`, `isFirstTimeUser`)

### Adaptive Start Screen (`adaptive-start-screen.md`)
**Dual-mode interface that adapts to user experience level**
- First-time users: Simplified 2-button interface (Get Started, How It Works)
- Experienced users: Full-featured interface with intelligent disabled states
- Multi-layered holographic gradient animations on logo
- Finnish/English language switching
- **Key Implementation**: Conditional rendering based on `isFirstTimeUser` boolean

### First Game Onboarding (`first-game-onboarding.md`)
**Three-layer guided onboarding system for new users**
- **Center Overlay**: Welcome message with call-to-action over soccer field
- **Warning Banner**: Persistent reminder to complete setup
- **Instructions Modal**: 7-step carousel guide with professional styling
- Dynamic button system that detects teams/seasons availability
- **Key Implementation**: Conditional rendering in `HomePage.tsx` based on onboarding state

### Robust Alert System (`robust-alert-system.md`)
**Consistent user guidance across all roster operations**
- Native `window.confirm()` alerts for cross-platform reliability
- Internationalized messaging with English/Finnish support
- Guard conditions prevent invalid state transitions
- Impact warnings for destructive actions (team deletion)
- **Key Implementation**: Guard patterns in multiple UI entry points

### How It Works Help Content (`how-it-works-help.md`)
**Comprehensive help system with multiple entry points**
- Accessible from Start Screen, Hamburger Menu, and Control Bar
- Seven-section content structure with semantic icon integration
- Advanced modal design with visual enhancement layers
- Professional styling with consistent design language
- **Key Implementation**: `InstructionsModal.tsx` with reusable content sections

## Multi-Team Architecture

### Team Management (`team-management.md`)
**Complete multi-team support with independent team rosters**
- Teams are first-class entities with their own player rosters
- Each team maintains independent roster with team-specific player data
- Atomic roster operations using lock manager to prevent race conditions
- Team CRUD operations with name validation and duplication functionality
- UI components: `TeamManagerModal.tsx`, `TeamRosterModal.tsx`
- **Key Implementation**: Teams stored using `TEAMS_INDEX_KEY` (`'soccerTeamsIndex'`) and `TEAM_ROSTERS_KEY` (`'soccerTeamRosters'`) in `src/config/storageKeys.ts`

### Master Roster Management (`master-roster-management.md`)
**Centralized player pool management (post-multi-team refactor)**
- Master roster serves as authoritative player source for all teams
- Checkbox functionality removed for clear separation from game selection
- Comprehensive CRUD operations with validation and error handling
- React Query integration for optimistic updates and cache management
- **Key Implementation**: `RosterSettingsModal.tsx` focused exclusively on master roster

### Seasons & Tournaments Decoupled (`seasons-tournaments-decoupled.md`)
**Global organizational entities independent of teams**
- Seasons and tournaments work independently from team rosters
- Multiple teams can participate in same season/tournament
- Clean data structures with no roster/team references
- Global availability across all components regardless of team context
- **Key Implementation**: Separate `src/utils/seasons.ts` and `src/utils/tournaments.ts`

## Additional Features

### External Matches (`external-matches.md`)
**Player statistics adjustment system for games played outside the app**
- Manual stat adjustments (goals, assists) for external games
- Complete CRUD interface for managing adjustments
- Integration with statistics calculation system
- Proper impact calculation and display in player statistics
- **Key Implementation**: `PlayerStatAdjustment` interface with storage in localStorage

## Technical Architecture

### Data Storage Strategy
- **localStorage**: Primary storage for all data with async wrappers
- **React Query**: Centralized state management and caching
- **Lock Manager**: Prevents race conditions in roster operations
- **Migration System**: Handles data integrity and schema evolution

### State Management Patterns
- **useReducer**: Core game session state (timer, score, periods)
- **useState**: Local UI state within components
- **React Query**: Asynchronous data operations and caching
- **Boolean Flags**: Smart detection states throughout the application

### Internationalization
- **i18next**: Full English/Finnish support with structured translation keys
- **Fallback Text**: English fallbacks provided in all translation calls
- **Context-Aware Messaging**: Different phrasing for different UI contexts

### Component Architecture
- **Modal System**: Consistent modal patterns across all features
- **Conditional Rendering**: Intelligent UI adaptation based on app state
- **Separation of Concerns**: Clear boundaries between roster, team, and game management

## Implementation Benefits

### User Experience Improvements
- **Prevents Dead Ends**: Smart detection guides users away from empty states
- **Progressive Disclosure**: Interface complexity adapts to user experience level
- **Context-Aware Guidance**: Appropriate messaging for different scenarios
- **Consistent Interactions**: Standardized patterns across all features

### Developer Experience Benefits
- **Type Safety**: Complete TypeScript coverage with detailed interfaces
- **Predictable State**: Clear boolean flags and consistent data structures
- **Error Handling**: Comprehensive validation and graceful degradation
- **Testing Support**: Mockable async patterns and isolated components

## Development Workflow

### Adding New Features
1. **Define Types**: Add interfaces to `src/types/index.ts`
2. **Create Utils**: Add storage operations to `src/utils/`
3. **Build Components**: Create UI components with proper props
4. **Add Translations**: Update both English and Finnish locale files
5. **Write Tests**: Cover new functionality with unit/integration tests
6. **Document**: Add comprehensive documentation following these standards

### Common Implementation Patterns
- **Guard Conditions**: Check preconditions before state transitions
- **Confirmation Dialogs**: Use native `window.confirm()` for destructive actions
- **Async Wrappers**: localStorage operations always return Promises
- **Error Boundaries**: Graceful fallbacks for corrupted data states

## Migration and Compatibility

### Backward Compatibility
- **Existing Games**: Continue working with existing save data format
- **Progressive Enhancement**: New users get enhanced experience without breaking existing workflows
- **Data Migration**: Automatic schema updates maintain data integrity

### Future Extensibility
- **Modular Architecture**: Features can be independently enhanced or disabled
- **Consistent Patterns**: New features follow established architectural patterns
- **Documentation Standards**: This documentation approach scales to new features

## Related Documentation
- **Overall Architecture**: `../../MULTI-TEAM-SUPPORT.md` - Complete multi-team implementation plan
- **Project Setup**: `../../CLAUDE.md` - Development environment and build process
- **Main Documentation**: Project root README for general information

---

**Note**: All documentation is verified against actual implementation and serves as an authoritative guide for understanding and extending these features.
