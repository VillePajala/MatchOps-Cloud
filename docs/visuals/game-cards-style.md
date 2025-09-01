## Game Cards Visual and Content Specification

This document describes the styling, structure, and behavior of the saved game "cards" shown in the Load Game view.

- Source implementation: `src/components/LoadGameModal.tsx`
- Context: Cards are rendered inside the Load Game modal list (`<ul> ... <li> ...`)

### 1) Card container
- Wrapper: `<div class="relative rounded-lg border shadow-lg transition-all duration-200 ... hover:shadow-xl">`
- Alternating surface (based on index parity):
  - Even: `bg-slate-700/60 border-slate-600/60 hover:bg-slate-700/80 hover:border-slate-500/80`
  - Odd:  `bg-slate-700/40 border-slate-600/40 hover:bg-slate-700/60 hover:border-slate-500/60`
- Current/active game indicator: adds `ring-2 ring-indigo-500 border-indigo-500`
- Each card `<li>` has `relative mb-5 last:mb-0` and brings to front when its dot‑menu is open via `z-10`.

### 2) Expand/collapse interaction
- Main clickable surface is a button:
  - `<button class="w-full p-5 text-left hover:bg-slate-700/20 transition-colors rounded-lg" ...>`
  - Sets `aria-expanded` and an accessible `aria-label` that toggles between expand/collapse copy.
  - Chevron at the far right reflects state (`HiOutlineChevronDown` or `HiOutlineChevronUp`).

### 3) Header content (top row)
- Team names (left side):
  - Layout: `flex items-center gap-3 mb-2`
  - Home label: `<h3 class="text-lg ...">{displayHomeTeamName}</h3>`
  - Away label: `<h3 class="text-lg ...">{displayAwayTeamName}</h3>`
  - Visual rule based on `game.homeOrAway` and `isCurrent`:
    - Your team is bold + brighter (`font-semibold` and `text-slate-100` or `text-indigo-400` when current)
    - Opponent is normal weight and dimmer (`font-normal` and `text-slate-300` or `text-indigo-300` when current)
  - Separator: `vs` with `text-slate-400 font-medium`

### 4) Context badge (season/tournament)
- Shown if the game is linked to a Season or Tournament.
- Badge classes: `inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer`
  - Tournament: `bg-purple-500/20 text-purple-300 hover:bg-purple-500/30`
  - Season:     `bg-blue-500/20 text-blue-300 hover:bg-blue-500/30`
- Selected filter highlight: `ring-2 ring-indigo-500`
- Accessibility: `role="button"`, `tabIndex=0`, supports Enter/Space to activate filtering.

### 5) Meta row (date/time/location)
- Wrapper: `flex items-center gap-4 text-sm text-slate-400 mb-3`
- Items (each prefixed with an icon):
  - Date: calendar SVG + locale date from `game.gameDate`
  - Time: `HiOutlineClock` + `game.gameTime`
  - Location: `HiOutlineMapPin` + `game.gameLocation`

### 6) Status badges (always visible)
- Wrapper: `flex items-center gap-2 flex-wrap`
- Badges:
  - Not Played: `bg-red-500/20 text-red-300`
  - Active (current game): `bg-green-500/20 text-green-300` with small green dot
  - Assessments Pending (shown when selected players > assessments): `bg-amber-500/20 text-amber-300`

### 7) Score block (right side of header row)
- Wrapper: `ml-6 flex items-center gap-4`
- Score text: `text-2xl font-bold` with dynamic color:
  - Tie: `text-gray-300`
  - Win: `text-green-400` (determined by `homeOrAway` vs `homeScore/awayScore`)
  - Loss: `text-red-400`
  - Default: `text-slate-100`
- Subtext label under score: `Final Score` in `text-xs text-slate-400 mt-1`
- Chevron icon near score indicates expand/collapse.

### 8) Expanded details section
- Container: `border-t border-slate-600/40 bg-slate-700/40`
- Inner padding/content: `p-5 space-y-4`

8.1) Game notes
- Wrapper: `bg-slate-800/60 rounded-lg p-4 border border-slate-700/40`
- Title: `text-sm font-medium text-slate-200 mb-2`
- Body: `text-slate-300 whitespace-pre-line leading-relaxed`

8.2) Assessments progress (if selected players > 0)
- Wrapper: `bg-slate-800/60 rounded-lg p-3 border border-slate-700/40`
- Header row with title and progress fraction `%` (text-xs in `text-slate-400`)
- Progress bar: outer `w-full bg-slate-700 rounded-full h-1.5 overflow-hidden`
  - Inner fill: `h-1.5 bg-indigo-500 rounded-full transition-all duration-500` with inline `style.width = "{percent}%"`

8.3) Actions row
- Layout: `flex items-center justify-between`
- Left: primary "Load Game" button
  - Classes: `px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors`
  - Disabled state adds `opacity-50 cursor-not-allowed`
  - While loading, shows a small spinner SVG with `animate-spin`
  - On success: calls `onLoad(gameId)` and closes the modal
- Right: secondary icon buttons
  - Export JSON: `p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700/40 rounded-lg`
  - Export CSV:  same as above
  - Delete: `p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg`
  - All respect disabled state when an action for that game is in progress

8.4) Error boxes (conditional)
- For load/delete errors while action is active:
  - `bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm`

### 9) List-level styling
- List container: `scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-1 px-1`
- The modal itself layers gradients/noise per the global style guide and provides a header, filter box, and footer pagination.

### 10) Data fields surfaced per card
- Identity: `gameId`
- Teams: `teamName`, `opponentName`, and `homeOrAway` (controls bolding and score win/loss eval)
- Context: `seasonId` / `tournamentId` (resolved to name and badge)
- Schedule/location: `gameDate`, `gameTime`, `gameLocation`
- Score: `homeScore`, `awayScore`
- Status: `isPlayed`, `isCurrent`
- Assessments: `selectedPlayerIds.length`, `assessments` map (to compute completion)
- Notes: `gameNotes`

### 11) Accessibility
- Expand/collapse button uses `aria-expanded` and descriptive `aria-label`.
- Context badge is keyboard activatable (Enter/Space) with `role="button"` and `tabIndex=0`.
- Buttons have visible focus via inherited focus styles from the modal/theme.

### 12) Replication checklist
1. Recreate the card container with alternating slate surfaces, border, subtle hover elevation, and active ring for current.
2. Build the header row with: team names styling cues, context badge (season/tournament), meta row (date/time/location), and colored score block.
3. Implement expand/collapse with a large clickable surface; reflect state with chevron and `aria-expanded`.
4. In the expanded section, add: optional Game Notes, assessments progress bar, primary Load button, and secondary export/delete icons with disabled and loading states.
5. Apply the exact class tokens above for visual parity; keep colors in the slate/indigo palette.
6. Keep list container thin scrollbar styling for consistent feel.

### 13) File references
- Card layout and logic: `src/components/LoadGameModal.tsx`
- Global visuals: see `docs/project/STYLE_GUIDE.md` for palette/effects used by the modal shell


