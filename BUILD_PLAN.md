# Rock, Paper, Scissors v2.2 — End-to-End Build Plan

## Completion rule

For every component: add the required test, run it and observe the expected failure, implement the smallest correct behavior, rerun the targeted test, run the full relevant suite, and update `IMPLEMENTATION_PROGRESS.md`. A phase is complete only when its acceptance checks pass.

## Phase 0 — Foundation

Create a strict Vite/React/TypeScript/Phaser project with Vitest, Testing Library, Playwright, ESLint, Prettier, deterministic scripts, static build support, and a testable app mount.

Gate: install, smoke test, typecheck, lint, and production build pass.

## Phase 1 — Domain and configuration

Implement typed factions/relationships, centralized validated configuration, vector helpers, unit state, registry, seeded random utilities, and spatial queries.

Tests: all nine faction pairings; configuration validation; vector edge cases; unique units; health invariants; nearest/radius queries excluding dead units.

## Phase 2 — Simulation systems

Implement deterministic spawn validation, AI decision priority, steering composition, swarm center/control, recruitment, simultaneous combat, per-target cooldowns, knockback, death particles, anchor transfer, and match state/timer/restart.

Tests: each system in isolation plus integration scenarios for advantage combat, group-overturn possibility, flee priority, recruitment, anchor fallback, victory, defeat, obstacle avoidance, pause, and clean restart.

## Phase 3 — Meadow and Phaser presentation

Mount one Phaser scene, draw a crisp pixel meadow, trees, faction-distinct units, damage flash/health indicators, particles, camera, and responsive canvas. Integrate the pure simulation at a fixed update cadence.

Tests: scene lifecycle, map invariants, visual-key mapping, tree collision/detection rules, event snapshot shape, and cleanup.

## Phase 4 — React match experience

Implement start, HUD, pause, victory, and defeat overlays; wire controls and authoritative game snapshots; support restart without reload; add accessible buttons/instructions and graceful errors.

Tests: each UI state, count/timer updates, start gating, pause/resume, result correctness, and restart.

## Phase 5 — Browser and stability validation

Add Playwright test hooks that are only available in test mode. Cover start, movement, pause timer, restart, forced victory, and forced defeat. Verify repeated restarts and listener/entity cleanup.

Gate: all regular browser tests pass headlessly.

## Phase 6 — Production readiness

Add README, balancing guide, exact commands, static-host notes, favicon/metadata, base-path-safe assets, responsive checks, and CI workflow.

Final gate: unit/integration/UI tests, browser tests, coverage, typecheck, lint, format check, production build, and static production smoke all pass. A public deployment is outside completion unless a remote/host is available and exercised.

## Phase 7 — Arcade movement and imperfect steering

Replace direct velocity assignment and frame-perfect target tracking with persistent per-unit motion and AI memory. Add config-driven maximum speed, acceleration, deceleration, drag, steering force, turn rate, decision interval, reaction delay, prediction time/error, flee multiplier, and obstacle avoidance. Independent AI must preserve flee, chase, cohesion, and wander priority while pursuing remembered predicted positions. Recruited Rocks must follow an invisible player-driven swarm target through deterministic loose offsets rather than synchronized velocity.

Tests: same-frame target turns do not alter active pursuit; decisions apply after reaction delay; acceleration and steering force limit velocity changes; turn rate is bounded; drag slows released movement; pursuit can overshoot; flee priority remains intact; seeded prediction is repeatable; player Rocks respond promptly but move differently; tree routing never grants live target tracking or enters solid colliders.

Gate: focused movement tests and the full existing suite pass before production/browser validation is rerun.

## Phase 8 — Display-only minimap

Add a compact bottom-left minimap that derives unit markers from the authoritative simulation and its viewport rectangle from the live Phaser camera. Keep coordinate mapping, marker projection, and Phaser rendering separated. Cache the background, border, trees, and visual shrine landmark on a static graphics layer; reuse one dynamic graphics layer for living-unit markers and the viewport. Preserve world aspect ratio, clamp all projected geometry, support camera zoom, redraw static content only after a canvas-size change, and destroy both layers with the scene.

Tests: nonzero-origin coordinate mapping; out-of-bounds clamping; aspect-preserving layout; camera zoom and edge clamping; all-faction living markers; dead-unit exclusion; recruited/neutral/anchor styling; live faction changes; static-render reuse; restart marker replacement; resize; disable configuration; and scene teardown.

Gate: focused minimap tests, the complete suite, coverage, typecheck, lint, format, root/subpath builds, regular browser flows, and production smoke all pass.

## Phase 9 — Limited-use Triad Shrine

Promote the central landmark into a simulation-owned, once-per-match faction switch. Add config-driven eligibility, faction selection, whole-swarm radius checks, a cancellable two-second channel, channel movement slowdown, advantaged-hit interruption, rounded-up sacrifice, recruited survivor transformation, former-faction independence, dynamic recruitment and result logic, and a timed post-transform movement penalty. Render a wide circular platform with a thin outer ring, faction glyphs, selection/sacrifice feedback, progress, transformation particles, and a used state.

Tests: outside-radius rejection; in-radius progress; leave, input-release, and high-hit interruption; minimum population and current-faction guards; rounded sacrifice; survivor faction/recruited state; immediate relationship/recruitment/former-ally/HUD updates; single-use enforcement; penalty expiry; dynamic victory/defeat; and restart reset. Browser coverage must confirm requirements, selection, and input gating.

Gate: focused shrine tests and the complete unit/integration/UI/browser suite pass, followed by coverage, typecheck, lint, format, root/subpath builds, and production smoke.

## Phase 10 — Minimap transparency, living-swarm speed, and dash

Split minimap opacity into independently configurable background, terrain, border, unit-marker, and camera-viewport alpha values, clamped at the renderer boundary. Add a pure capped speed multiplier based only on living recruited units. Add a pure dash state machine with current/remembered direction, duration, cooldown, pause/restart semantics, optional collision cancellation, and config-driven feedback particles. Compose normal swarm speed first and dash second through the existing accelerated player-target and loose steering path. Match solo player speed to the independent AI base, lengthen and strengthen the dash, and render a small `Dash - SPACE` indicator above the minimap whose fill is derived from authoritative dash state.

Tests: distinct and clamped minimap layer alpha without mapping changes; deterministic/capped swarm-speed calculation; solo/AI base-speed parity; same-step recruitment and death updates; neutral/enemy exclusion; unchanged independent AI limits; dash activation/direction/timing/cooldown/pause/restart; recruited-only movement; tree/boundary safety; feedback cleanup; fresh Space input; authoritative cooldown fill; label/bar placement above the minimap; absence of persistent top-HUD labels; scene teardown; and Chromium keyboard flow.

Gate: focused tests and the full existing suite pass, followed by coverage, typecheck, lint, format, browser validation, production build, and production smoke.

## Phase 11 — Idle swarm stability and tighter cohesion

Recenter the invisible player target on the living recruited swarm whenever movement input is absent. Add an optional steering target-speed scale so small idle formation corrections decelerate instead of becoming full-speed commands. Apply quadratic correction falloff only to idle recruited units, preserving normal independent AI, active player movement, dash, knockback, separation, and obstacle avoidance. Reduce formation offset and maximum-return radii while strengthening cohesion and return force.

Tests: gentle target-speed scaling; no-input settling after active movement; bounded idle center drift and velocity; tighter compact formation radius; config validation; active loose steering; independent AI limits; tree safety; dash behavior; and shrine movement penalties.

Gate: focused movement tests and the full validation matrix pass, followed by browser visual inspection.

## Architecture boundaries

- `src/game/config`: all tunable values and faction tables.
- `src/game/model`: framework-independent state.
- `src/game/systems`: pure or deterministic simulation behavior.
- `src/game/systems/shrine.ts`: pure shrine selection, eligibility, channel, cost, and timer rules.
- `src/game/systems/swarmSpeed.ts`: pure living-recruit speed multiplier.
- `src/game/systems/dash.ts`: pure dash request, direction, duration, cooldown, collision, and reset state.
- `src/game/scenes`: Phaser adapter and rendering only.
- `src/game/minimap`: pure projection/model logic plus the fixed-screen Phaser minimap adapter.
- `src/game/events`: typed bridge snapshots/events.
- `src/ui`: React overlays and HUD.
- `src/test`: fixtures and deterministic test helpers.
- `e2e`: user-visible browser behavior.

## Quality constraints

- No gameplay magic numbers outside configuration.
- No frame-rate-dependent damage.
- No processing-order advantage in combat.
- No ghost participation after death.
- No production-only debug or test hooks.
- No unseeded randomness in deterministic tests.
- No skipped or weakened tests accepted as completion.
