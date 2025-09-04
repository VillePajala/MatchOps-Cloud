## Player Discs Visual Specification (On-Field)

This document captures the precise visuals for player and opponent discs as rendered on the field canvas.

- Source implementation: `src/components/SoccerField.tsx`
- Rendering target: HTML5 Canvas with high‑DPI scaling (drawn in CSS pixels)
- Related constants:
  - `PLAYER_RADIUS = 20`
  - Opponent radius = `PLAYER_RADIUS * 0.9` (18 px)

### 1) High‑DPI and coordinate basis
- Canvas buffer is sized to `CSS size × devicePixelRatio` and the context is scaled with `context.scale(dpr, dpr)`. All sizes documented here are in CSS pixels.
- Absolute drawing coordinates are computed from relative positions: `absX = relX * W`, `absY = relY * H` where `W`/`H` are the canvas CSS width/height.

### 2) Color scheme
- Home player base color:
  - Default: Purple `#7E22CE` (via `tinycolor`)
  - Goalie: Orange `#F97316`
  - Optional override: a specific `player.color` if provided
- Opponent base color: Red `#DC2626`

### 3) Disc geometry
- Player disc radius: `PLAYER_RADIUS` (20 px)
- Opponent disc radius: `PLAYER_RADIUS * 0.9` (18 px)
- All discs are perfect circles drawn with `context.arc(absX, absY, radius, 0, 2π)`

### 4) “Polished Enamel” shading model (players and opponents)
The following steps create depth, sheen, and contrast on each disc:
1. Base fill
   - `context.fillStyle = baseColor`
   - Fill the full circle path.
2. Clipping mask
   - Save the context, create a circular clip matching the disc, and draw highlights/shadows inside the clip.
3. Top‑left highlight (sheen)
   - Radial gradient center: `(absX − 0.3r, absY − 0.3r)`
   - Inner radius: `0` (point); outer radius: `1.2r`
   - Color stops: `rgba(255,255,255,0.2)` → `rgba(255,255,255,0)`
   - Apply by filling a square covering the disc bounds.
4. Bottom‑right inner shadow
   - Radial gradient center: `(absX + 0.4r, absY + 0.4r)`
   - Inner radius: `0`; outer radius: `1.5r`
   - Color stops: `rgba(0,0,0,0.2)` → `rgba(0,0,0,0)`
   - Fill over the disc bounds within the clip.
5. Border stroke
   - Restore from clip, redraw the circle path
   - `strokeStyle = 'rgba(255, 255, 255, 0.7)'`, `lineWidth = 1.5`

Notes:
- Opponents use the same shading model with the red base color.
- No external drop shadow is used for normal players/opponents (only the inner highlight/shadow and thin white border). Tactical discs (in tactics mode) do add a drop shadow; see below.

### 5) Tactical discs (tactics board view only)
- Radius: `PLAYER_RADIUS * 0.9`
- Fill colors:
  - Home: `#7E22CE` (purple)
  - Opponent: `#DC2626` (red)
  - Goalie: `#F97316` (orange)
- Effects:
  - Temporary shadow while drawing: `shadowColor rgba(0,0,0,0.5)`, `shadowBlur 5`, `shadowOffsetX 1`, `shadowOffsetY 2`
  - Border: `strokeStyle rgba(255,255,255,0.7)`, `lineWidth 1.5`

### 6) Player name label (optional)
- Rendered when `showPlayerNames` is true; positioned at the disc center.
- Font: `'600 12px Rajdhani, sans-serif'` (semi‑bold, 12 px)
- Alignment: `textAlign = 'center'`, `textBaseline = 'middle'`
- Engraved/embossed look via three layered fills:
  1) Dark offset shadow (top‑left): `fillStyle rgba(0,0,0,0.25)` at `(x − 0.5, y − 0.5)`
  2) Light offset highlight (bottom‑right): `fillStyle rgba(255,255,255,0.25)` at `(x + 0.5, y + 0.5)`
  3) Main text: `fillStyle '#F0F0F0'` at `(x, y)`
- Text content: `player.nickname || player.name`

### 7) Draw order (normal game view)
1. Field background and lines
2. User drawings (tactical pen strokes)
3. Opponents (under players for proper overlap)
4. Players (topmost among discs)

In tactics board view, discs use the “tactical discs” path and a separate ball rendering step; players/opponents in the normal sense are not drawn.

### 8) Replication checklist
1. Compute absolute positions from `relX/relY` against canvas CSS `W/H`.
2. For each player/opponent:
   - Determine radius (20 px player, 18 px opponent) and base color (player: default purple, goalie orange, or provided; opponent: red).
   - Fill a solid circle.
   - Create a circular clip and render two radial gradients:
     - Sheen: center at `(x−0.3r,y−0.3r)`, radius `1.2r`, white 0.2 → 0.
     - Inner shadow: center at `(x+0.4r,y+0.4r)`, radius `1.5r`, black 0.2 → 0.
   - Restore and stroke a thin border: white 0.7 alpha, lineWidth 1.5.
3. If names are shown, render the three‑layer engraved label at the disc center using Rajdhani 12 px.
4. Maintain draw order so players appear above opponents and drawings.

### 9) Exact values reference
- Radii:
  - Player: `20`
  - Opponent: `18` (`0.9 × PLAYER_RADIUS`)
  - Name font size: `12px`, weight `600`
- Colors:
  - Player default: `#7E22CE` (purple)
  - Goalie: `#F97316` (orange)
  - Opponent: `#DC2626` (red)
  - Border: `rgba(255, 255, 255, 0.7)`
  - Name main fill: `#F0F0F0`
  - Name shadow/highlight: `rgba(0,0,0,0.25)` and `rgba(255,255,255,0.25)`
- Gradients:
  - Sheen: center offset `−0.3r, −0.3r`, radius `1.2r`, white alpha `0.2 → 0`
  - Inner shadow: center offset `+0.4r, +0.4r`, radius `1.5r`, black alpha `0.2 → 0`
- Border width: `1.5`

### 10) File references
- Disc rendering and labels: `src/components/SoccerField.tsx` (players, opponents, tactical discs)
- Radius constant: `PLAYER_RADIUS` in `src/components/SoccerField.tsx`


