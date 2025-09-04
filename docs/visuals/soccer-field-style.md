## Soccer Field Visual Specification

This document captures the exact visuals and rendering logic of the current soccer field so it can be replicated in another project.

- Source implementation: `src/components/SoccerField.tsx`
- Rendering target: HTML5 Canvas (client-side)
- Strategy: High‑DPI aware rendering with an offscreen, prerendered background (grass + lines) that is blitted each frame for performance

### Canvas setup
- Device‑pixel ratio (DPR) scaling:
  - Buffer size: `canvas.width = cssWidth * dpr`, `canvas.height = cssHeight * dpr`
  - Draw space in CSS pixels: `context.resetTransform(); context.scale(dpr, dpr)`
- All sizes below are CSS pixels (independent of DPR)

### Draw order (background)
1. Base solid grass color: `#427B44`
2. Two grain/noise layers (repeating patterns):
   - Cloud pattern: 400×400, opacity 0.02
   - Grain pattern: 100×100, opacity 0.03
3. Mowing stripes (vertical):
   - Count: 9 stripes across width
   - Blend mode: `soft-light`
   - Even stripes: `rgba(255, 255, 255, 0.04)`
   - Odd stripes: `rgba(0, 0, 0, 0.04)`
4. Lighting overlays:
   - Linear gradient top→bottom: black 0.03 → black 0.25
   - Radial hotspot: center X at mid‑width, center Y at 30% height, radius ≈ 80% height
     - Color stops: white 0.10 at center → transparent at edge
5. Field lines and spots (also prerendered into the background, see next section)

Notes:
- The prerendered background is cached in an offscreen canvas keyed by size and mode, then drawn with `drawImage` each frame.
- The container behind the canvas uses `bg-green-700` but the canvas fully covers it.

### Field lines and markings
- Global style for lines:
  - Stroke: `rgba(255, 255, 255, 0.6)`
  - Line width: `2`
  - Shadow: `shadowColor rgba(0,0,0,0.25)`, `shadowBlur 2`, `shadowOffsetY 1`
- Edge margin from canvas: `lineMargin = 5`

Drawn elements and proportions (relative to canvas CSS size, `W`=width, `H`=height):
- Touchline/Goal line rectangle: full field boundary at `lineMargin`
- Halfway line: horizontal line at `H / 2`
- Center circle: radius `0.08 × min(W, H)`
- Penalty areas:
  - Width `0.6 × W`, height `0.18 × H`
  - Top penalty area at `y = lineMargin`
  - Bottom penalty area at `y = H - lineMargin - penaltyBoxHeight`
  - D‑arcs (both ends): radius `0.8 × centerCircleRadius`, drawn outside each penalty area
- Goal boxes:
  - Width `0.3 × W`, height `0.07 × H`
  - Centered horizontally; placed at the same y as their respective penalty areas
- Corner arcs: radius `0.02 × min(W, H)` at each corner
- Spots (filled circles, no shadow):
  - Center spot at `(W/2, H/2)`
  - Penalty spots at distances `0.12 × H` from each goal line
  - Spot radius: `3`
  - Fill: `rgba(255, 255, 255, 0.8)`

### Noise pattern generator
- Each noise layer is a generated `CanvasPattern` composed of black/white random pixels with a specified alpha.
- Implementation outline:
  - Create an offscreen canvas of given size (e.g., 400×400)
  - Fill `ImageData` with `randomValue ∈ {0, 255}` for R/G/B; alpha = `opacity × 255`
  - `ctx.createPattern(noiseCanvas, 'repeat')`

### Performance optimizations
- Background (grass, stripes, lighting, lines, spots) is drawn once per size/mode into an offscreen canvas and cached.
- The on‑screen canvas only blits the cached background and then draws dynamic overlays (players, drawings, ball, etc.).
- High‑DPI scaling ensures crisp lines on retina displays while using CSS pixel math for layout.

### Key constants (exact values)
- Base grass color: `#427B44`
- Stripes: 9 vertical bands; `soft-light` composite; ±0.04 alpha alternation
- Linear lighting gradient alpha: 0.03 → 0.25
- Radial hotspot alpha: 0.10 → 0.0, center at `(W/2, H*0.3)`, radius `H*0.8`
- Lines: `rgba(255, 255, 255, 0.6)`, width 2, shadow blur 2, offsetY 1
- Margins and radii:
  - `lineMargin = 5`
  - `centerRadius = 0.08 × min(W, H)`
  - `penaltyBox = { width: 0.6 × W, height: 0.18 × H }`
  - `goalBox = { width: 0.3 × W, height: 0.07 × H }`
  - `penaltySpotDist = 0.12 × H`
  - `cornerRadius = 0.02 × min(W, H)`
  - `spotRadius = 3`

### Replication checklist
1. Create a canvas, scale by DPR, and compute using CSS `W`/`H`.
2. Draw base `#427B44`.
3. Overlay cloud (400×400, 0.02) and grain (100×100, 0.03) noise patterns.
4. Add 9 vertical `soft-light` mowing stripes, alternating ±0.04 alpha.
5. Apply lighting overlays: linear top→bottom (0.03→0.25 black) and radial hotspot at `(W/2, H*0.3)` (0.10→0 white).
6. Draw markings with `rgba(255,255,255,0.6)`, lineWidth `2`, and subtle shadow.
7. Use the listed proportions for center circle, boxes, arcs, corners, and spots.
8. For performance, prerender the full background into an offscreen canvas and blit each frame.

### File references
- Drawing logic and constants: `src/components/SoccerField.tsx`
- Container placement: `src/components/SoccerField.tsx` (canvas fills parent; wrapper has `bg-green-700`)


