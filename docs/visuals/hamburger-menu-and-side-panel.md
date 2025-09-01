## Control Bar Hamburger Menu & Sliding Side Panel

This document describes the slide‑in side panel that is opened from the Control Bar’s hamburger button: what it is, how it works, visual details, and how to reproduce it.

- Source implementation: `src/components/ControlBar.tsx`
- Trigger: hamburger button inside the Control Bar
- Mechanics: state‑driven visibility + CSS transform transitions, with overlay click‑to‑close and touch/mouse drag to dismiss

### 1) Trigger button (Hamburger)
- Element: `<button>` with the `HiBars3` icon.
- Base size and shape via shared class string:
  - `w-9 h-9` square, rounded, centered content, `shadow-lg`.
  - Text color `text-slate-100`, bold `font-semibold`.
  - Transitions: `transition-all duration-150`, active scale `active:scale-95`.
  - Focus ring for accessibility: `focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900`.
- Color scheme for this button: `bg-slate-700 hover:bg-slate-600 focus:ring-slate-500`.
- Update badge: if an app update is available, a red pulsing dot appears (`absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse`).

### 2) Overlay (scrim)
- Rendered only when the side panel is open.
- Full‑screen, behind the drawer: `fixed inset-0 bg-black/50 z-40`.
- Clicking the overlay closes the panel.

### 3) Side panel (drawer)
- Positioning & size: `fixed top-0 left-0 h-full w-80` (320 px width), `z-50`.
- Layout & appearance:
  - Container: `flex flex-col bg-slate-800/98 backdrop-blur-sm shadow-xl border-r border-slate-600/50`.
  - Transition: `transition-transform duration-300 ease-in-out` when not dragging; otherwise transitions are disabled for immediate drag feedback.
  - Open/closed states:
    - Open: `translate-x-0`.
    - Closed: `-translate-x-full`.
  - While dragging, an inline `style.transform` overrides the class transform: `translateX(dragOffsetpx)`.
  - Cursor feedback: `cursor: grab` (dragging sets `grabbing`).

### 4) Open/Close logic
- State: `isSidePanelOpen`.
- Open/close via:
  - Clicking the hamburger button (toggles open/close; resets `dragOffset`).
  - Clicking the overlay (closes).
  - Clicking outside the panel area (document‐level mousedown listener when open; closes).
  - Tapping the panel header back chevron (closes).
  - Selecting any menu action (handlers are wrapped to close after action).
  - Swipe/drag gesture (see below).

### 5) Gestures: swipe/drag to close
- Touch (mobile):
  - On touch start, capture `clientX` and set `isDragging`.
  - On move, compute `diff = currentX - startX`. Only leftward drags (negative diff) move the panel; capped at `-320` (panel width).
  - Prevent page scroll when drag exceeds 10 px.
  - On end, if dragged beyond 30% of panel width (`-96px`), close; then reset.
- Mouse (desktop testing):
  - On mouse down within the panel, start tracking and attach `mousemove`/`mouseup` listeners on `document`.
  - Leftward movement updates `dragOffset` (min `-320`).
  - On mouse up, if `dragOffset < -96`, close; then reset and remove listeners.

### 6) Header
- Layout: `px-4 py-3 border-b border-slate-700/80 flex justify-between items-center`.
- Title: `text-lg font-semibold text-yellow-300`.
- Close button: `HiOutlineChevronLeft` icon, `text-slate-400 hover:text-slate-200 p-1 rounded`.

### 7) Navigation content
- Container: `<nav class="flex flex-col p-4 space-y-1 overflow-y-auto flex-1">`.
- Section groups (each with margin bottom):
  1) Game Management
  2) Setup & Configuration
  3) Analysis & Tools
  4) Resources (external links)
  5) Settings (includes PWA update actions)
  6) Account (Sign Out)
- Section headings: `text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2`.
- Menu items (buttons or anchors):
  - Base: `w-full flex items-center px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700/75 rounded-lg transition-colors`.
  - Icon size: `w-5 h-5 mr-2` (leading icon per item).
  - Some items are disabled based on state (e.g., `Game Settings` if no game loaded: adds `opacity-50 cursor-not-allowed` and `disabled`).
  - External links open in a new tab with `target="_blank" rel="noopener noreferrer"`.
  - All action handlers are wrapped to automatically close the drawer after running.

### 8) PWA update options (conditional)
- Shown when `showUpdateOption` is true.
- Buttons:
  - "Check for Updates": shows spinner (`animate-spin`) while checking; disabled during check.
  - "Refresh App": styled as a positive action (`text-green-400 hover:bg-green-900/25`) when an update is available (`lastCheckResult?.updateAvailable`).

### 9) Z‑index and layering
- Control Bar container: `relative z-40`.
- Overlay: `z-40` (covers app content but sits below the drawer).
- Drawer: `z-50` (above the overlay for interaction).

### 10) Replication checklist
1. Add a state flag `isOpen` and an integer `dragOffset` (px).
2. Render an overlay `fixed inset-0 bg-black/50 z-40` only when open; clicking it closes the panel.
3. Render a left drawer `fixed top-0 left-0 h-full w-80 z-50 flex flex-col bg-slate-800/98 backdrop-blur-sm shadow-xl border-r border-slate-600/50`.
4. Toggle classes `translate-x-0` vs `-translate-x-full` and a `transition-transform duration-300 ease-in-out` when not dragging.
5. While dragging, set inline `style.transform = translateX(dragOffsetpx)` and switch cursor to `grabbing`.
6. Implement touch/mouse handlers:
   - Track start X; update `dragOffset` for negative diffs only; clamp to `-320`.
   - On end, if `dragOffset < -96`, close; otherwise snap back to 0.
7. Include a header with title and close button; below it, a scrollable nav with grouped items.
8. For actions, wrap handlers to close the drawer after executing.
9. Optionally display an update badge on the hamburger trigger and include conditional PWA update actions in the drawer.

### 11) Key class tokens (visual identity)
- Colors and surfaces: `bg-slate-800/98`, `hover:bg-slate-700/75`, borders `border-slate-600/50`, text `text-slate-100`, section titles `text-slate-400`, accent title `text-yellow-300`.
- Effects: `backdrop-blur-sm`, `shadow-xl` (drawer), `shadow-lg` (buttons), overlay `bg-black/50`.
- Motion: panel `transition-transform duration-300 ease-in-out`; buttons `duration-150 active:scale-95`.
- Sizing: drawer `w-80` (320 px), icon `w-5 h-5`, trigger `w-9 h-9`.

### 12) File references
- Trigger and drawer logic: `src/components/ControlBar.tsx`
- Touch/mouse drag handlers: `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`, `handleMouseDown` within `ControlBar.tsx`.
- Wrapped menu handlers: `wrapHandler` (closes drawer after action).


