# Implementation Progress

## Current phase

Complete — display-only minimap

## Completed

- [x] Phase 0 — strict React/TypeScript/Vite/Phaser project, pnpm 11 dependency policy, Vitest, Testing Library, Playwright, ESLint, and Prettier.
  - Red proof: the first smoke test failed because `App` did not exist.
  - Green proof: application smoke test and all foundation commands pass.
- [x] Phase 1 — exhaustive faction matrix, typed central configuration, vector math, authoritative unit state, deterministic random spawning, and living-unit spatial queries.
  - Red proof: five domain suites initially failed on missing modules.
  - Green proof: 18 domain tests passed before simulation work began.
- [x] Phase 2 — flee-over-chase AI, loose swarm steering, recruitment, solid-tree avoidance, simultaneous advantage/disadvantage damage, per-target cooldowns, knockback, health/death, particles, anchor fallback, pause, timer, results, and clean restart.
  - Red proof: AI, combat, recruitment, spawn, and simulation suites initially failed on missing systems.
  - Green proof: unit/integration coverage includes group-overturn combat, obstacle constraint, particle cleanup, neutral anchor fallback, win/loss, and 20 restart cycles.
- [x] Phase 3 — Phaser meadow scene with fixed trees, crisp faction shapes, damage feedback, particles, responsive camera, and throttled snapshots.
- [x] Phase 4 — React start screen, live faction HUD, keyboard controls, pause overlay, victory/defeat results, and restart without reload.
  - Red proof: bridge/UI suites initially failed before the bridge module existed.
- [x] Phase 5 — Playwright flows for start/movement, pause/time/restart, forced victory, forced defeat, and production-only hook exclusion.
- [x] Phase 6 — README, balancing guidance, favicon, base-path-safe Vite build, GitHub Pages CI/deploy workflow, and production smoke.
- [x] Visual QA — start screen and live meadow inspected at desktop size; canvas, HUD, trees, units, and camera framing rendered cleanly with no console warnings.
- [x] Review hardening — added independent ally cohesion, fixed-step simulation, long-frame obstacle protection, complete config validation, focus-safe input, renderer failure recovery, direct Phaser factory/scene lifecycle tests, exact Pages-artifact smoke testing, and refreshed documentation.
  - Red proof: seven focused tests failed across AI, simulation, input, configuration, renderer lifecycle, and failure UI before implementation.
- [x] Deployment hardening — cancelled disposed async Phaser startups and made bridge-controller cleanup ownership-safe so React Strict Mode cannot leave CI browser tests connected to a stale game instance.
  - Red proof: the lifecycle regression failed before implementation, and repeated browser execution reproduced the pause/result race.
  - Green proof: 20 consecutive browser flows passed after the fix.
  - The expanded 54-test suite passes across 16 files, including previously excluded Phaser integration boundaries.
- [x] Arcade movement systems — per-unit motion config, acceleration/deceleration/drag, limited steering and turn rate, delayed remembered AI decisions, seeded prediction error, pursuit overshoot, invisible player swarm target, loose deterministic offsets, and momentum-aware tree avoidance.
  - Red proof: the focused suites failed on missing motion state, missing AI memory modules, absent config guards, and synchronized/direct movement behavior.
  - Green proof: 14 focused movement/config tests and the complete 65-test suite pass.
- [x] Display-only minimap — reusable nonzero-origin coordinate mapper, aspect-preserving bottom-left layout, all-living-unit markers, recruited/neutral/anchor emphasis, camera zoom/clamping, cached terrain/landmark layer, reusable dynamic layer, resize handling, restart-safe authoritative projection, and scene cleanup.
  - Red proof: three focused suites failed on the intentionally missing mapper, model, and renderer modules before implementation.
  - Green proof: 17 focused minimap tests plus scene/config coverage pass; the complete suite now contains 82 passing tests.
  - Visual direction: the supplied reference informed only the compact framed hierarchy. Ornate framing, lanes, portraits, detailed icons, and dense map art were intentionally not copied.

## In progress

- None.

## Blocked

- None.

## Test status

- Unit/integration/UI: 82 passed across 22 files.
- Coverage: passing; 96.5% statements/lines overall and 100% statements/lines in `src/game/minimap`.
- Browser E2E: 4 passed in Chromium.
- Production smoke: 1 passed in Chromium for both the root build and the repository-subpath build.
- Typecheck: passed.
- Lint: passed with zero warnings.
- Format check: passed.
- Root-path production build: passed.
- GitHub Pages-style subpath build and smoke: passed at `/Rock_Paper_Scissors_v2/`.
- Visual browser check: meadow, HUD, faction rendering, and live simulation passed with no browser console warnings.

## Deviations

- Browser tests run with one worker because parallel WebGL contexts caused nondeterministic page initialization; serial execution is stable and configured.
- The MVP remains one map and client-only as required; no broader campaign features from older project notes were imported.
- The minimap shrine is a non-interactive visual landmark only. There is no shrine collision, capture, faction switching, or duplicated gameplay state.
- A Git remote is configured. The repository workflow is ready to validate and deploy on `main`, but this local hardening pass does not claim a successful live Pages run or public URL.

## Next task

- Optional: play-balance `GAME_CONFIG.units.motion` and `GAME_CONFIG.minimap` after extended human playtesting, then inspect the GitHub Actions deployment after commit and push.
