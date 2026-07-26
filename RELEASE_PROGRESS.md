# Current Phase

Phase 6 - Landing page, match selection, tutorial, settings, pause, and results:
complete on 2026-07-26 and awaiting UI review.

# Baseline

- Pre-Phase 6 unit and integration baseline: passed - 228 tests across 41 files with
  `pnpm.cmd test`. Integration suites run within Vitest.
- Pre-Phase 6 E2E baseline: passed - 8 serial Chromium tests with
  `pnpm.cmd test:e2e`.
- Pre-Phase 6 type check, lint, and production build: passed with
  `pnpm.cmd typecheck`, `pnpm.cmd lint`, and `pnpm.cmd build`. The baseline build
  transformed 70 modules.
- Phase 6 red proof: failed as expected. Four focused suites could not resolve the
  not-yet-created player-preference adapter, deterministic tutorial controller, and
  landing simulation; the existing shell did not satisfy the new landing, setup,
  tutorial, settings, pause, or results expectations.
- Targeted Phase 6 tests: passed - 43 tests across 8 focused shell, persistence,
  tutorial, renderer lifecycle, bridge, minimap, and game-feel suites.
- Unit and integration tests: passed - 237 tests across 44 files with
  `pnpm.cmd test`.
- E2E tests: passed - 8 serial Chromium tests with `pnpm.cmd test:e2e`.
- Type check: passed with `pnpm.cmd typecheck`.
- Lint: passed with zero warnings using `pnpm.cmd lint`.
- Format: passed with `pnpm.cmd format:check`.
- Build: passed with `pnpm.cmd build`; Vite 5.4.21 transformed 78 modules and emitted
  0.63 kB HTML, 10.95 kB CSS, 247.10 kB main JavaScript, and a 1,484.89 kB lazy
  Phaser/game chunk before gzip.
- Production smoke: passed - 1 Chromium test with `pnpm.cmd test:production`; the built
  application completed landing, setup, first-run tutorial skip, and match startup
  without exposing test-only hooks.
- Manual browser review: passed for landing, setup, tutorial, active match, pause, and
  settings. The deterministic background remained non-interactive, selected cards and
  focus states were readable, the live match retained one canvas through settings, and
  browser diagnostics contained no errors.

# Completed

- Replaced the old single start overlay and temporary development selector with an
  explicit router-free flow: landing, setup, tutorial, match, nested panels, pause,
  results, replay, setup change, and main menu.
- Added the requested title and pitch:
  - `Rock Paper Scissors 2`
  - `Build your swarm. Hunt your prey. Become what hunts you.`
- Added a deterministic reduced-population landing simulation that:
  - accepts no gameplay input;
  - renders no normal HUD;
  - uses reduced effects;
  - pauses while the document is hidden;
  - cancels its animation and visibility listener when leaving the landing page.
- Added four accessible large-card selection rows for:
  - Rock, Paper, and Scissors with their faction-passive descriptions;
  - Casual, Normal, and Chaos with concise descriptions and score multipliers;
  - Last Faction Standing and Blitz with objectives and timer information;
  - Meadow, Forest, and Marsh with deterministic map preview styling and terrain copy.
- Kept Play Match disabled until every required selection is valid and preserved the
  last complete setup locally.
- Added a deterministic non-release tutorial map and action-gated controller for move,
  recruit, prey advantage, predator escape, dash, shrine entry, faction switch, and
  completion.
- Added first-run tutorial introduction, skip at every stage, saved completion, no
  forced replay after completion, and Replay Tutorial from How to Play.
- Kept tutorial code isolated from local records and authoritative match scoring.
- Added How to Play coverage for relationships, recruitment, movement, dash, combat
  advantage, shrine switching, result rules, and minimap.
- Added versioned, validated player preferences with safe handling for missing,
  corrupted, outdated, disabled, or full local storage.
- Added immediately persisted settings for master/music/SFX volumes, screen shake,
  particles, fullscreen, minimap opacity, reduced motion, and reduced flashes, plus a
  controls reference.
- Added live visual-setting propagation through `GameBridge` and `ArenaScene`.
  Changing minimap opacity or accessibility effects does not destroy or restart the
  active simulation.
- Added idempotent explicit pause control. How to Play and Settings opened from Pause
  keep the simulation and Blitz timer frozen until Resume.
- Added Pause actions for Resume, Restart, How to Play, Settings, and Quit to Main Menu.
- Added authoritative victory/defeat results with final/best score, completion or
  survival time, best time, total kills, recruited survivors, map, starting/final
  faction, difficulty, mode, new-record state, Play Again, Change Setup, and Main Menu.
- Kept Play Again on the same selected setup and destroyed the match cleanly when
  changing setup or returning to the landing page.
- Added keyboard-accessible semantic groups, modal roles, visible focus states, and
  background hiding for nested panels.
- Added 9 net new unit/component tests and replaced the 8 obsolete development-selector
  E2E paths with 8 complete player-flow scenarios.
- Implemented no audio playback, accounts, backend, multiplayer, procedural maps,
  campaign, bosses, upgrades, payments, advertisements, or features outside Phase 6.

# In Progress

- None.

# Blocked

- None.

# Decisions and Deviations

- React owns screen navigation and persisted preferences; `Simulation` remains the only
  authority for match time, faction state, scoring, victory, and defeat. No routing
  dependency or duplicate gameplay store was introduced.
- Landing autoplay uses the existing deterministic simulation with four independent
  units per faction, no recruited anchor, shrine disabled, and reduced visual settings.
  It has a separate lifecycle and cannot receive match input.
- Player preferences use `rps2:player-preferences`, separate from
  `rps2:local-records`, so settings/tutorial schema recovery cannot corrupt records.
- The tutorial is a small deterministic controller and canvas presentation rather than
  a release map or normal scored match. This guarantees controlled entities and prevents
  record writes.
- Tutorial completion and validated settings were implemented in Phase 6 because the
  explicit Phase 6 request required them, superseding the earlier roadmap that placed
  persistence and tutorial work in later phases.
- Volume settings are persisted and applied to application state immediately. Actual
  music/SFX playback remains Phase 7 and was not pulled forward.
- Fullscreen is attempted only from the direct Settings button gesture and gracefully
  ignores browser rejection.
- A scene-owned `setPaused(boolean)` command was added beside the existing toggle so
  nested panels cannot accidentally resume an already-paused match.
- Minimap opacity is applied to the existing minimap display objects. The base typed
  minimap configuration remains unchanged.
- The manual review used the browser skill to inspect visible layout and diagnostics.
  The automated serial E2E suite remains the authoritative proof for results and
  lifecycle transitions.
- Phase 6 implementation stopped before publishing. The later GitHub Pages publish is
  being performed only after the user's explicit follow-up request; no audio or
  future-phase work was included.

# Manual Review Required

- Review the visual density and copy length of all four setup rows on the target mobile
  devices and preferred desktop resolutions.
- Play the complete tutorial without using Skip and judge whether each stage needs
  longer explanatory timing or clearer animation before public release.
- Confirm sliders, toggles, fullscreen behavior, and reduced-motion/reduced-flash
  settings feel correct in the browsers targeted for release.
- Complete several Last Faction Standing and Blitz matches to review the expanded
  results hierarchy and new-record emphasis with realistic scores.
- Review Pause, nested How to Play/Settings, and return focus behavior with keyboard and
  assistive technology.
- Audio volume controls are intentionally silent until Phase 7 connects playback.

# Next Phase

Stop for Phase 6 UI review. Await explicit direction before beginning Phase 7 audio
integration.
