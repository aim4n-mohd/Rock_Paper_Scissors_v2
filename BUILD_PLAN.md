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

## Architecture boundaries

- `src/game/config`: all tunable values and faction tables.
- `src/game/model`: framework-independent state.
- `src/game/systems`: pure or deterministic simulation behavior.
- `src/game/scenes`: Phaser adapter and rendering only.
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
