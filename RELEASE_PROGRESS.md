# Current Phase

Phase 4 gameplay-review follow-up: complete and awaiting player review.

# Baseline

- Pre-Phase 4 baseline: passed - 189 tests across 32 files with `pnpm test`.
- Initial Phase 4 red proof: four focused suites could not load because the typed sprite
  manifest, animation controller, game-feel profiles, and particle pool did not exist.
  Five integration tests also failed for the missing one-shot effect queue, visual
  settings, particle cap/velocity inheritance, transient-state reset, and tree collision
  safety margin.
- Targeted Phase 4 tests: passed - 25 tests across 8 focused files.
- First complete-suite regression run: 207 of 208 tests passed. The new HUD “Swarm” label
  conflicted with the valid existing minimal-HUD contract. The extra label was removed
  and recruitment now pulses the existing current-faction count pill; the test was not
  weakened or rewritten.
- Gameplay-review baseline: passed - 208 tests across 37 files before the right-edge,
  spawn-distribution, and AI-aggression changes.
- Gameplay-review red proof: seven focused assertions failed for the missing animated
  boundary radius, camera containment margin, cross-region spawn distribution, extended
  AI perception, chase-speed bonus, and updated typed tuning.
- Gameplay-review targeted tests: passed - 33 tests across 6 focused files.
- Unit and integration tests: passed - 212 tests across 37 files with `pnpm test`.
- Coverage: passed - 212 tests; 96.29% statements/lines, 85.86% branches, and 93.65%
  functions with `pnpm test:coverage`.
- E2E tests: passed - 7 serial Chromium tests with `pnpm test:e2e`.
- Type check: passed with `pnpm typecheck`.
- Lint: passed with zero warnings using `pnpm lint`.
- Format and diff checks: passed with `pnpm format:check` and `git diff --check`.
- Build: passed with `pnpm build`; Vite 5.4.21 transformed 67 modules and emitted
  0.63 kB HTML, 3.69 kB CSS, 178.60 kB main JavaScript, and a 1,522.25 kB lazy
  Phaser/game chunk before gzip.
- Production smoke: passed - 1 Chromium test with `pnpm test:production`; the built game
  loaded, started, and excluded test-only hooks.
- Manual browser inspection: passed. Rock, Paper, and Scissors remained distinguishable
  without relying solely on colour; combat and shrine feedback rendered cleanly; tree
  trunks depth-sorted correctly around units; no browser console errors were reported.
- Gameplay-review production validation: passed - type check, lint, format check, diff
  check, 67-module production build, 7 serial Chromium E2E tests, and 1 production
  smoke test.

# Completed

- Preserved the Phase 1 movement/combat work, Phase 2 Triad Shrine, and Phase 3 map
  architecture.
- Established a fixed asset contract before external artwork:
  - 16 x 16 logical pixel frames.
  - Origin at (8, 8).
  - 1.5x gameplay display scale.
  - Nearest-neighbour filtering.
- Added a typed original code-authored sprite manifest covering Idle, Move, Dash, Hit,
  Death, and Shrine states for every faction, plus safe faction fallbacks, validation,
  and development warnings for missing frames.
- Added recognizable silhouettes:
  - Rock: uneven outlined stone, highlight, shaded edge, chips, and cracks.
  - Paper: asymmetric off-white sheet, dark outline, folded corner, crease, and multiple
    flutter/crumple/torn frames.
  - Scissors: two red handle loops, pivot, separate shaded blades, open/closed snip
    frames, and a directional silhouette rather than an X.
- Added one shared animation-state controller with velocity-responsive playback,
  movement start/stop, dash, temporary hit recovery, death transition, shrine
  transformation, Rock rolling, Paper flutter/stretch, Scissors direction/snipping,
  reduced-motion behavior, and restart/stale-runtime cleanup.
- Replaced abstract unit glyph rendering with batched pixel-frame drawing while retaining
  nearest-neighbour Phaser configuration and readable health bars.
- Fixed the reported tree pass-through:
  - Added a centralized three-unit collision safety margin around obstacle bodies for
    both normal movement and dash.
  - Moved trunks/canopies/logs/stones into the dynamic depth-sorted actor pass so units
    behind a trunk are occluded and units in front render over it.
- Added grass/dust movement particles, subtle shadows, velocity stretch, crowding
  compression, directional lean, configurable camera lag, and swarm-size zoom-out.
- Added one-shot recruitment events with pulse rings, hop/spin animation, faction
  particles, existing-HUD count pulse, and an unimplemented `unit-recruited` sound hook
  reserved for the future audio phase.
- Added separate advantage/disadvantage effect profiles. Advantage hits use more
  particles, longer configurable flash, directional impact, a 28 ms hit pause, and
  optional subtle shake. Scissors can emit small metallic accents.
- Added faction-specific death particles with previous-velocity inheritance and short
  death-transition frames.
- Added a reusable particle pool with a hard maximum of 240 active particles and
  intensity scaling.
- Enhanced shrine presentation with an idle glow while preserving the channel ring,
  sacrifice particles, transformation wave, and dormant state.
- Added accepted visual settings for screen shake, particle intensity, reduced motion,
  and reduced flashes without implementing the future Settings UI.
- Added an 18px sprite boundary contract and a configurable 24px camera containment
  margin so the full animated unit remains visible at the right edge and inside every
  world boundary.
- Changed independent spawning to draw deterministically from the shared set of valid
  non-anchor spawn regions. Factions are now interspersed instead of occupying isolated
  faction groups, while the recruited Rock anchor remains safe and deterministic.
- Increased independent AI perception from 190px to 215px, reduced its decision/reaction
  cadence from 260/140ms to 225/110ms, and added a modest 1.08x pursuit-only speed
  multiplier. Flee behavior retains its existing 1.12x multiplier.
- Added four gameplay-review tests without weakening or replacing existing coverage.
- Added 19 tests in Phase 4 without skipping, disabling, or weakening an existing test.
- Implemented no scoring, difficulty presets, game modes, final menus, audio playback,
  persistence, backend, accounts, procedural maps, or external copyrighted assets.

# In Progress

- None.

# Blocked

- None.

# Decisions and Deviations

- The user's explicit Phase 4 specification overrides the previous roadmap label that
  placed match options/scoring in Phase 4 and pixel units in Phase 5. The plan has been
  resequenced; no future phase was started.
- Original pixel art is stored as typed code-authored pixel rectangles rather than
  downloaded image files. This gives deterministic validation and safe fallbacks while
  preserving the exact frame contract for later replacement artwork.
- Rendering remains batched through Phaser `Graphics` rather than creating one Sprite
  object per unit. This keeps the current swarm inexpensive while still providing typed
  animation state and frame data.
- Tree collision was not mathematically absent: the larger visual issue was static trees
  always rendering behind units. The fix combines depth sorting with a small collision
  skin so both visual and physical pass-through are addressed.
- The existing minimal HUD contract forbids an additional swarm label. Recruitment
  feedback remounts/pulses the current faction's existing count pill instead.
- Hit pause is applied only to advantage hits by default. Reduced motion suppresses hit
  pause, camera zoom motion, movement particles, recruitment hop, and screen shake.
- Sound integration is only a typed one-shot event hook in this phase; no audio asset or
  playback system was added.
- Random spawn positions remain deterministic for a given match seed and stay restricted
  to handcrafted map spawn regions; the change removes faction grouping without adding
  procedural maps.
- Camera containment is symmetric on both axes even though the reported issue was on the
  right edge, preventing the same visual escape on other screen edges.
- Vite client ambient types are now declared in both TypeScript projects because the E2E
  `GameSnapshot` type import pulls browser-side modules into the Node build graph.
- Initial Vite/Vitest operations inside the restricted filesystem sandbox were denied
  when esbuild inspected a parent directory. The unchanged commands passed with the
  required execution permission.
- No live deployment, commit, push, generated external artwork, or audio was performed
  or claimed in Phase 4.

# Manual Review Required

- Compare Rock idle wobble, rolling speed, dash roll, and hit compression at normal zoom.
- Confirm Paper reads as a folded/fluttering sheet rather than a plain rectangle during
  idle, movement, dash stretch, hit crumple, and torn death.
- Confirm Scissors reads as handles plus two blades at every direction and that its
  open/closed motion does not resemble an X.
- Recruit several units and confirm the pulse ring, hop/spin, faction particles, and
  current-faction HUD pulse are noticeable but brief.
- Compare advantage and disadvantage impacts, especially flash intensity, particle
  volume, directional knockback, hit pause, and shake.
- Force large clashes and confirm the 240-particle cap prevents clutter or sustained
  slowdown.
- Walk and dash above, behind, and below trunks on all three maps; confirm occlusion and
  collision now agree and no edge appears to pass through.
- Confirm large-swarm zoom-out and dynamic camera lag improve awareness without causing
  discomfort.
- Hold movement toward every screen edge, especially the right edge, and confirm animated
  units remain fully visible without abrupt camera motion.
- Restart each map several times and confirm the three factions feel interspersed rather
  than grouped while still avoiding obstacles and unsafe immediate overlaps.
- Confirm the 215px perception, faster 225/110ms decisions, and 1.08x chase speed make
  predators and prey feel slightly more assertive without becoming oppressive.
- Later Settings work should manually verify screen-shake off, multiple particle
  intensities, reduced motion, and reduced flashes through player-facing controls.

# Next Phase

Await explicit direction for the next phase. The resequenced roadmap places match
options, scoring, difficulty, and game modes in Phase 5.

Do not begin Phase 5 until it is explicitly requested.
