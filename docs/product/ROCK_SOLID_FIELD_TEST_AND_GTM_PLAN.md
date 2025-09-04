## Rock‑Solid Field Testing and Go‑To‑Market Plan

This document lays out a pragmatic path to make the app production‑ready via real‑life testing, instrumentation, quality bars, and a lightweight GTM. It assumes minimal new features; the focus is stability, data integrity, and performance.

### Scope Lock (Week 0)
- Freeze new features; triage backlog into Must‑Fix, Should‑Fix, Later.
- Create a "Field Test Build" branch and a release checklist.
- Add an in‑app "Send diagnostics" action that attaches device info, app version, and the last 100 logs.

### Week 1: Instrumentation & Crash Reporting
- Add error tracking: Sentry (web + service worker).
- Telemetry events (TanStack Query/console → Sentry breadcrumbs):
  - autosave_start|success|error; save_queue_depth; last_save_ms
  - timer_start|pause|resume|reset; timer_state_save|error
  - goal_log_open|submit|error; opponent_goal
  - place_all; goalie_toggle; drawing_start|end
  - load_game_open|select|success|error; load_game_ms
- Hidden diagnostics panel: queue size, last save timestamp, storage provider, offline/online, IndexedDB health.

### Week 1–2: Small, Controlled On‑Field Beta (5–10 coaches, 10–20 matches)
- Distribute via PWA install; capture device matrix (iOS Safari, Android Chrome, screen DPI).
- 1‑page test script per match:
  1. Start game → confirm sub interval ticks
  2. Log two goals (own & opponent)
  3. Place‑all + toggle goalie
  4. Draw one tactic
  5. Airplane mode toggle; background app; resume
  6. Load a saved game mid‑match; export after match
- Auto‑attach diagnostics snapshot on game end.

### Week 2–3: Fix Rounds (Stability & Data Integrity)
- Resolve any IndexedDB keyPath/put errors, autosave skips, roster↔field sync hazards.
- Guardrails:
  - Never commit empty `playersOnField` from sync path
  - Single‑paint toggle ops (no double writes/race)
  - Save‑queue backoff; stuck detection; auto‑recover
- Safe shutdown/resume: on hide → persist `{savedTime, timestamp}` and pause; on resume → compute delta.

### Week 3: Performance Hardening (low‑end Android target)
- Canvas: pre‑render static background; redraw dynamic layers only; rAF‑throttle touch‑move; reduce per‑frame allocations.
- Targets: 60 fps on small state changes; ≤16 ms paint typical; initial field draw ≤300 ms.
- Network: cache warmers; defer heavy queries; background refetch when idle.

### Week 3–4: Broader Pilot (30–50 matches)
- Service Level Objectives (SLOs):
  - Crash‑free sessions ≥ 99%
  - Autosave success ≥ 99.5%
  - Timer drift ≤ 1s per 15 minutes (resume compensates)
  - No data loss on airplane/background toggles
- Weekly release train; regression playbook; hotfix path.

### Week 4: Polish Critical Flows
- First‑run checklist before kickoff: team/roster/periods set.
- Goal logging ≤ 2 taps; haptic; accessible labels.
- Clear offline status chip; robust empty states for load/save.
- Undo for last goal/sub within 10 seconds.

### Week 5: Pricing & Gates (keep free for testers)
- Feature gates: Free (1 team, 3 saved games) → Pro unlocks limits and adds export/analytics.
- Billing: Stripe web checkout & customer portal; App Store/Play deferred.
- In‑app paywall: transparent copy; trial; referral code.

### Week 6: Soft Launch
- Season‑start promo; invite codes to pilot clubs; refer‑a‑coach (1 month free each).
- Dashboard: release health, crash rate, autosave success, p50/p95 load time.
- Support: email/Intercom; 24‑hour SLA for match‑blocking issues.

### Real‑Life Test Day Checklist (Coach)
- Update to latest; PWA installed; battery saver off; roster & periods confirmed.
- During match: timer run/pause, 2 goals, goalie toggle, place‑all, one drawing, airplane toggle, background & resume.
- After: end game; export; reload saved game; verify goals/time.

### Quality Bar to Ship
- Crash‑free sessions ≥ 99%
- No lost goals/logs across 50+ live matches
- Autosave success ≥ 99.5% with retries/backoff
- Cold start → ready ≤ 2s on mid‑range Android
- Zero double‑paint glitches on goalie toggle/place‑all

### Minimal Tech Worklist
- Sentry + telemetry + diagnostics panel
- Timer resume logic (compute delta) and background pause
- Save queue watchdog + backoff
- Canvas layering & pre‑rendering finalized
- Weekly regression suite & release checklist



