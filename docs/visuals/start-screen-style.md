## Start Screen Visual Specification

This document describes the exact styling and composition of the start screen, so it can be replicated elsewhere.

- Source implementation: `src/components/StartScreen.tsx`
- Font: Rajdhani (app-wide)
- Color mood: deep blue/indigo, aurora gradients, subtle noise and grid, soft glows

### 1) Root container
- Classes: `relative flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 font-display overflow-hidden py-8 sm:py-16 md:py-24 px-4`
- Notes:
  - `overflow-hidden` ensures gradient/glow layers don’t cause scrollbars
  - All decorative layers are absolutely positioned within this container

### 2) Background layers (from back to front)
Add each as a full-size absolutely positioned div (`absolute inset-0`), unless noted.

1. Noise texture
   - Class: `bg-noise-texture`
   - Purpose: subtle grain to avoid flat color banding

2. Radial base gradient (dark blue field)
   - Class: `bg-gradient-radial from-slate-950 via-slate-900/80 to-slate-900`
   - Result: center is slightly brighter than edges; keeps overall dark blue tone

3. Animated aurora sweep
   - Class: `pointer-events-none animate-gradient [background:linear-gradient(120deg,theme(colors.indigo.950),theme(colors.blue.900),theme(colors.cyan.900),theme(colors.indigo.950))] opacity-25`
   - Effect: slow-moving chromatic sheen; opacity 0.25 to stay subtle

4. Subtle grid
   - Class: `pointer-events-none sm:opacity-[0.04] opacity-[0.03] [background-image:linear-gradient(to_right,rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:40px_40px]`
   - Effect: adds structure; lower opacity on small screens

5. Diagonal color wash overlay
   - Class: `bg-gradient-to-br from-indigo-900/30 via-sky-700/20 to-cyan-600/30 mix-blend-overlay`
   - Effect: mid-intensity color tint across the background

6. Top/bottom blue tint
   - Class: `bg-gradient-to-b from-sky-400/10 via-transparent to-transparent`
   - Effect: faint brightness from top, fading to transparent

7. Title spotlight (behind the hero title)
   - Element: `absolute top-[28%] left-1/2 -translate-x-1/2 w-[60vw] h-[32vh]`
   - Class: `pointer-events-none opacity-70 [background:radial-gradient(closest-side,rgba(56,189,248,0.14),transparent_70%)] blur-[28px]`
   - Effect: cyan glow ellipse for focus under the title

8. Large blurred corner glows
   - Top: `absolute -inset-[50px] bg-sky-400/10 blur-3xl top-0 opacity-50`
   - Bottom: `absolute -inset-[50px] bg-indigo-600/10 blur-3xl bottom-0 opacity-50`
   - Effect: very soft ambience at top and bottom edges

9. Radial color accents
   - Left/top: `pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(60%_50%_at_12%_12%,theme(colors.indigo.700)/0.25_0%,transparent_70%)]`
   - Right/bottom: `pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(50%_40%_at_88%_78%,theme(colors.sky.500)/0.25_0%,transparent_70%)]`
   - Effect: secondary hue accents to add depth

10. Vignette
    - Class: `pointer-events-none [background:radial-gradient(120%_90%_at_50%_50%,transparent_60%,rgba(0,0,0,0.35)_100%)]`
    - Effect: gently darkens edges to focus center content

11. Conic rotating highlight
    - Class: `pointer-events-none animate-rotate-slow opacity-10 [background:conic-gradient(from_150deg_at_65%_38%,theme(colors.cyan.400)/0.35_0deg,transparent_60deg,transparent_300deg,theme(colors.indigo.500)/0.35_360deg)]`
    - Effect: extremely subtle moving highlight for premium feel

Layer order matters: keep the noise and base gradients at the back; place glows, radial accents, and vignette above; keep overlays `pointer-events-none` so they don’t block clicks.

### 3) Title and tagline
- Wrapper: `relative z-10 flex flex-col items-center w-full max-w-sm sm:max-w-md mt-[-6vh] sm:mt-[-5vh]`
- Title text classes: `text-6xl sm:text-7xl lg:text-9xl font-extrabold tracking-tight leading-tight drop-shadow-lg mb-2 text-center`
- Title color: `text-yellow-400` with an inner neon glow (extra span behind text):
  - `absolute inset-0 -z-10 blur-[6px] opacity-60 [background:radial-gradient(closest-side,rgba(234,179,8,0.35),transparent_70%)]`
- Tagline classes: `text-xl sm:text-2xl text-slate-200/95 text-center tracking-wide drop-shadow-md relative`
- Tagline halo: `absolute inset-0 -z-10 mx-auto w-[80%] h-full pointer-events-none [background:radial-gradient(closest-side,rgba(99,102,241,0.12),transparent_70%)] blur-md`
- Divider under tagline: `h-px w-44 sm:w-64 bg-gradient-to-r from-transparent via-sky-400/70 to-transparent mx-auto mt-6 sm:mt-8 mb-14 sm:mb-20`

### 4) Primary/secondary action buttons
- Buttons use the shared `Button` component variants:
  - Primary: solid indigo (`variant="primary"`)
  - Secondary: translucent slate (`variant="secondary"`)
  - Destructive (Sign Out): red (`variant="destructive"`)
- Width helper: `w-64 sm:w-64 md:w-56`
- Icons sized `w-4 sm:w-5 h-4 sm:h-5`, arranged inside a flex row with equal left/right padding spacing.

### 5) Auth success toast (conditional)
- Position: `fixed top-20 left-1/2 transform -translate-x-1/2 z-50`
- Container: `bg-green-600/90 backdrop-blur-sm border border-green-500/70 text-green-100 px-6 py-3 rounded-lg shadow-lg animate-fade-in`

### 6) Language switcher control
- Position: `absolute left-1/2 -translate-x-1/2 bottom-8 md:bottom-6 z-20`
- Container: `flex rounded-lg bg-slate-800/70 border border-slate-600 backdrop-blur-sm overflow-hidden`
- Buttons:
  - Active: `bg-indigo-600 text-white`
  - Inactive: `text-slate-300 hover:bg-slate-700/60`
  - Shared: `px-3 h-8 text-xs font-bold transition-colors` (FI has extra `border-l border-slate-600/60`)

### 7) Accessibility & performance notes
- All decorative layers have `pointer-events-none` to keep interactions unobstructed.
- The animated gradients are low-opacity and lightweight; they run continuously but should not impact input latency.
- The strong vignette keeps content legible while allowing vibrant accents around the edges.

### 8) Replication checklist
1. Create the root container with dark slate background and text color.
2. Add layers in order: noise → radial base → animated sweep → grid → diagonal overlay → top tint → spotlight → big glows → radial accents → vignette → rotating conic.
3. Ensure overlays use `pointer-events-none` and the container is `overflow-hidden`.
4. Implement title with yellow neon inner glow spans and the tagline halo + divider.
5. Use shared `Button` variants for actions and the language switcher control.


