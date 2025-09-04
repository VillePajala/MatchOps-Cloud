# Team Management (Multi‑Team Support)

## Overview
Manage multiple teams as curated sub-rosters. Select a team during game creation to auto-load roster and persist `teamId` on the game. Filter Load/Stats by team.

## Key Behaviors
- Teams (CRUD) with per-team rosters
- New Game: team dropdown ("No Team" uses master roster); roster auto-loads; team name auto-fills
- Load Game: filter by All / each Team / Legacy
- Stats: team filter (optional), passed to calculators

## Data Model (summary)
- `Team` and `TeamRoster` stored via `TEAMS_INDEX_KEY` (`'soccerTeamsIndex'`) and `TEAM_ROSTERS_KEY` (`'soccerTeamRosters'`) in `src/config/storageKeys.ts`
- `AppState.teamId?: string` (per-game association)
- Seasons/Tournaments remain global

## Files
- Data: `src/utils/teams.ts`
- New Game: `src/components/NewGameSetupModal.tsx`
- Load: `src/components/LoadGameModal.tsx`
- Stats: `src/components/GameStatsModal.tsx`, `src/components/PlayerStatsView.tsx`, `src/utils/playerStats.ts`
- Team Manager: `src/components/TeamManagerModal.tsx`, `src/components/TeamRosterModal.tsx`

## i18n
- `teamManager.*`, `newGameSetupModal.*`, `loadGameModal.*`, `gameStatsModal.*`, `controlBar.manageTeams`

## Full Design & Acceptance Criteria
See `../../MULTI-TEAM-SUPPORT.md` for the complete plan, risks, migration, testing, and success criteria.

---

## Architecture and Differences vs Pre‑Team State

### Before (no teams)
- Only one global roster ("master kokoonpano") existed.
- New Game used the master roster as both the available list and the initial selection (often all selected).
- Saved games had no `teamId`; Load/Stats could not be filtered by team.
- Editing who belongs to the roster was done in the global Roster Settings.

### Now (teams as first‑class entities)
- Teams are data entities with their own rosters; master kokoonpano still exists as the global source of truth.
- **Master Roster Management**: RosterSettingsModal now exclusively manages the master roster - team name functionality removed to avoid confusion with separate team management.
- New Game behavior:
  - Available players for setup = full master kokoonpano.
  - If a Team is selected, players from that team are pre‑selected within the master list; if No Team is selected, default pre‑selection is the entire master list (or empty if desired).
  - On start, we persist both the actual available player list (from master) and the chosen selection for that game; we also persist `teamId` if a team was chosen.
- In‑game editing (Game Settings):
  - Team context (if any) is preselected; the available list remains the master list saved with the game.
  - Coaches can add/remove which players are selected for that game without changing team membership.
  - Team membership is managed only in Team Manager; Game Settings only changes the game's selection.
- Load/Stats can filter by specific team or show All/Legacy.

### Data and Storage
- Teams index: `TEAMS_INDEX_KEY` (`'soccerTeamsIndex'`) → `{ [teamId: string]: Team }`
- Team rosters: `TEAM_ROSTERS_KEY` (`'soccerTeamRosters'`) → `{ [teamId: string]: TeamPlayer[] }`
- AppState (per saved game): adds optional `teamId` and persists `availablePlayers` and `selectedPlayerIds` for that game snapshot.
- Seasons/Tournaments remain global; no `teamId` there.

### Query Keys & Hooks
- `queryKeys.teams`, `queryKeys.teamRoster(teamId)`; global `seasons`, `tournaments`, `savedGames` unchanged.
- Hooks in `src/hooks/useTeamQueries.ts` encapsulate CRUD and cache invalidation for teams and rosters.

---

## New Game Flow (team‑aware pre‑selection)

1) Team selection dropdown (or No Team) in `NewGameSetupModal.tsx`.
2) Available list = full master kokoonpano.
3) Pre‑selected IDs:
   - If Team selected: pre‑select only those master players whose names match the team roster (robust normalization; IDs differ by design).
   - If No Team: optionally select all from master, or none depending on UX configuration.
4) On Confirm:
   - `HomePage.handleStartNewGameWithSetup(...)` receives `(teamId, availablePlayersForGame, selectedPlayerIds, ...)`.
   - Game state is created with `teamId` (if any), `availablePlayers` set to the full list shown in the modal, and `selectedPlayerIds` as chosen.

Rationale:
- Keeps a single authoritative player pool (master), while teams act as curated pre‑selections that speed up setup.
- Avoids fragmenting the available list; team membership does not remove non‑team players from availability.

---

## Game Settings Flow (edit selection during game)

- Opens with the game’s `teamId` preselected (if present) and uses the game’s saved `availablePlayers` list (master snapshot).
- The selection can be freely adjusted (add/remove players) without changing team membership.
- Changes are saved back into the game session (`selectedPlayerIds`), keeping availability intact.

Difference from pre‑team state:
- Before: only one roster; selection edits implicitly modified the global roster via older flows in some places.
- Now: selection edits modify only the game; team membership is edited solely via Team Manager.

---

## Team Manager & Roster Editing

### Selecting From Master (edit team membership)
- UI lists the full master kokoonpano.
- Pre‑selection: players already in the team are automatically checked using robust name matching (Unicode normalization + lowercasing + trimming).
- Save action replaces the team roster with the exact selected set (no duplicates), generating new team‑local player IDs.

Why replace instead of append:
- Guarantees that toggling checkboxes yields an exact match for membership.
- Avoids duplicate team members and keeps the UX predictable.

Edge cases handled:
- Name matching with diacritics (ä/ö, composed vs decomposed forms) via `.normalize('NFKC')` before comparing.
- Empty team → no pre‑selection; coach can build membership from master.

---

## Migration & Data Versioning

### Migration System (v1 → v2)
Multi-team support introduced automatic data versioning to ensure smooth transitions:

- **Fresh Installations**: New users get data version 2 immediately - no migration needed, no default team created
- **Existing v1 Data**: Automatic migration creates a default team from existing roster data, preserves all historical data
- **Migration Safety**: Full backup/restore system with rollback capability on migration failure
- **Idempotent Operations**: Safe to run multiple times, migration only occurs once

### Migration Components
- **Version Detection**: `src/utils/migration.ts` - `getAppDataVersion()`, `checkForExistingData()`
- **Migration Logic**: Creates default team from existing roster, maintains data integrity
- **Backup System**: `src/utils/migrationBackup.ts` - automatic backup before migration
- **Recovery**: Manual recovery functions for failed migrations

### Key Storage Keys
- `APP_DATA_VERSION_KEY` (`'appDataVersion'`): Current data schema version (1 = pre-teams, 2 = multi-team)
- `TEAMS_INDEX_KEY` (`'soccerTeamsIndex'`): Teams index for multi-team support
- `TEAM_ROSTERS_KEY` (`'soccerTeamRosters'`): Per-team roster data

## Backward Compatibility

- Legacy games (no `teamId`) remain valid and appear under All/Legacy in Load/Stats.
- Master kokoonpano remains the global list; team rosters are curated subsets, not a replacement.
- Seasons/Tournaments remain global and unscoped.
- Historical data preserved through migration with no data loss.

---

## Risks & Mitigations

- Duplicate names across master may pre‑select unintended players.
  - Mitigation: prefer stable identifiers if/when master players have unique keys across imports; for now, normalization + review is sufficient.
- Team deletion may orphan games.
  - Mitigation: orphaned banner + reassign flow; Load/Stats still show legacy.
- Performance with large master lists.
  - Mitigation: simple client filtering; virtualize lists if needed.

---

## Developer Checklist

- Data
  - [ ] `TEAMS_INDEX_KEY` (`'soccerTeamsIndex'`) and `TEAM_ROSTERS_KEY` (`'soccerTeamRosters'`) keys present and validated
  - [ ] `AppState.teamId?` persisted on new games when team selected

- New Game
  - [ ] Available list uses master kokoonpano
  - [ ] Team pre‑selection applied (normalized name match)
  - [ ] `availablePlayers` and `selectedPlayerIds` saved on create

- Game Settings
  - [ ] Team preselected if present; selection changes don’t affect team membership

- Team Manager
  - [ ] Full master list shown in selection
  - [ ] Pre‑checked = current team
  - [ ] Save uses replace semantics (no duplicates; new IDs)

- UX
  - [ ] Load modal has All/Team/Legacy filters
  - [ ] Stats accept optional team filter
