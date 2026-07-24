# Rock, Paper, Scissors v2.2

A client-only, top-down arcade game built with React, TypeScript, Phaser, and Vite. Lead a loose swarm through a living faction ecosystem, recruit allies, and optionally make one costly faction switch at the central Triad Shrine.

## Requirements

- Node.js 20 or newer
- pnpm 11.7.0 (the repository pins the package-manager version)

## Local development

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite.

Controls:

- WASD or arrow keys: move the recruited Rock swarm
- Space: short dash when ready
- Q / E: select one of the two eligible shrine factions
- Hold F: channel the shrine while the entire recruited swarm is in range
- Escape: pause or resume
- R: restart the match

## Validation

Run the same checks used by CI:

```powershell
pnpm test
pnpm test:coverage
pnpm typecheck
pnpm lint
pnpm format:check
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
pnpm test:production
```

The Vitest suite covers framework-independent gameplay systems, the React shell, Phaser creation, and meadow-scene lifecycle. Playwright covers user-visible browser flows and the built static application.

## Architecture

- `src/game/config`: typed balance values and faction relationships
- `src/game/model`: framework-independent unit and particle state
- `src/game/systems`: AI selection/memory, arcade steering, swarm speed, dash, spawning, recruitment, combat, shrine, and spatial rules
- `src/game/simulation`: fixed-step match simulation and state transitions
- `src/game/minimap`: coordinate mapping, live marker projection, and cached Phaser minimap rendering
- `src/game/scenes`: Phaser rendering and lifecycle adapter
- `src/game/events`: bridge between Phaser state and React controls/UI
- `src/App.tsx`: start, HUD, pause, failure, and result overlays
- `e2e`: development and production browser tests

Phaser renders the meadow and units. Gameplay rules remain outside Phaser so they can be tested deterministically. React owns the accessible application shell and overlays.

## Balancing

All gameplay tuning lives in `src/game/config/gameConfig.ts`, including population, health, detection, damage, recruitment, fixed-step timing, and per-unit motion. Motion values cover maximum speed, acceleration, deceleration, drag, steering force, turn rate, decision interval, reaction delay, prediction time/error, flee speed, and obstacle avoidance. Swarm configuration controls compact offsets, separation, cohesion, return strength, the invisible player target, and the reduced idle-correction speed. `playerMovement` controls base player speed, per-recruit bonus, and the maximum bonus cap. `dash` controls enablement, multiplier, duration, cooldown, direction fallback, collision policy, and feedback particles. Minimap configuration also controls the thin `Dash - SPACE` cooldown indicator geometry.

The same file contains the display-only `minimap` block: enablement, maximum size, margin/padding, independently clamped background/terrain/border/unit/viewport alpha, border thicknesses, unit/recruited marker sizes, neutral-faction opacity, and tree/shrine visibility.

The `shrine` block owns its activation radius, two-second channel, minimum recruits, 20% rounded-up sacrifice, channel and post-transform speed multipliers, interruption threshold, one-use limit, particle effect, and circular platform geometry. The defaults intentionally use a wider round platform and a thin outer ring. Changing shrine balance does not require editing simulation or rendering systems.

`validateConfig` rejects unsafe values during startup. Keep `advantageDamage` greater than `disadvantageDamage`, retain at least one Rock for the initial anchor, and run the complete validation suite after any balance change.

## Production build and deployment

The application builds to `dist` and requires no backend, accounts, analytics, or cloud services.

For a root-hosted static site:

```powershell
pnpm build
pnpm test:production
```

For a subpath such as GitHub Pages, build and smoke-test the same base path:

```powershell
$env:VITE_PUBLIC_PATH = '/your-repository-name/'
pnpm build
$env:PRODUCTION_BASE_PATH = '/your-repository-name/'
pnpm test:production
```

The included GitHub Actions workflow performs tests, creates a repository-subpath build, smoke-tests that exact artifact, and then deploys it to GitHub Pages. A successful local build does not by itself prove that Pages is enabled or the remote deployment succeeded; confirm the workflow and public URL in GitHub.

## Project records

- `GAME_CONTEXT.md`: resolved product behavior and scope
- `BUILD_PLAN.md`: engineering phases and acceptance gates
- `TASKS.md`: ordered task checklist
- `IMPLEMENTATION_PROGRESS.md`: current completion and verification evidence
