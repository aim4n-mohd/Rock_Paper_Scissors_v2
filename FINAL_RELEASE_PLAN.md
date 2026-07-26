# Rock Paper Scissors 2 Final Release Plan

Audit date: 2026-07-24

This plan starts a new final-release sequence at Phase 0. The older phases in
`BUILD_PLAN.md`, `TASKS.md`, and `IMPLEMENTATION_PROGRESS.md` describe the completed
single-map MVP and remain useful historical evidence. The user's final-release request is
authoritative where it expands that older scope.

## Phase 0 Baseline

- Repository: clean `main` branch at `5635986` (`Add Triad Shrine faction switching gameplay`)
  before the two Phase 0 documents were added.
- Runtime used for this audit: Node.js 24.17.0 and pnpm 11.9.0.
- Declared runtime policy: Node.js 20 or newer and pnpm 11.7.0.
- CI runtime: Node.js 22 and pnpm 11.7.0.
- Framework: React 18.2.0 and React DOM 18.2.0.
- Game engine: Phaser 3.80.1.
- Build and language: Vite 5.4.21 and TypeScript 5.7.2 in strict mode.
- Test stack: Vitest 2.1.8, Testing Library 16.1.0, happy-dom 15.11.7, and
  Playwright 1.49.1.
- Static deployment: GitHub Pages workflow in
  `.github/workflows/validate-and-deploy.yml`, with configurable Vite base path.

The frozen-lockfile install completed without changing dependencies. pnpm emitted a
non-blocking registry metadata warning while checking for a pnpm update; the install
itself reported that the checkout was already up to date.

## Existing Architecture

### Runtime ownership

| Layer                      | Current responsibility                                                                                                            | Main files                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| React shell                | Start screen, development map selector, HUD, shrine panel, pause/result overlays, DOM keyboard lifecycle, renderer error/retry UI | `src/App.tsx`, `src/styles.css`                                              |
| Canvas lifecycle           | Lazy Phaser startup, selected-map remount, Strict Mode-safe cancellation, teardown, test-only browser hook                        | `src/game/GameCanvas.tsx`, `src/game/createGame.ts`                          |
| Bridge                     | Held keys, action dispatch, active scene-controller stack, snapshot publication                                                   | `src/game/events/gameBridge.ts`                                              |
| Phaser scene               | Reusable arena loop, dynamic camera, depth-sorted obstacle/pixel-unit/effect rendering, minimap adapter                           | `src/game/scenes/ArenaScene.ts`                                              |
| Authoritative simulation   | Fixed-step map state, movement/terrain, collisions/combat, recruitment, dash, shrine, pooled effects, results                     | `src/game/simulation/Simulation.ts`                                          |
| Map definitions            | Validated handcrafted arena metadata, geometry, routes, palettes, seeded non-colliding decorations                                | `src/game/maps/maps.ts`                                                      |
| Pixel animation            | 16x16 manifest/frame contract, original faction frames, safe fallback, shared state/pose controller                               | `src/game/config/unitSpriteManifest.ts`, `src/game/systems/unitAnimation.ts` |
| Pure/deterministic systems | Relationships, AI/memory, steering, spawning, recruitment, combat, dash, shrine, terrain, game feel, particles, spatial queries   | `src/game/config`, `src/game/model`, `src/game/systems`, `src/game/math`     |
| Minimap                    | Layout/mapping, marker projection, cached static drawing, dynamic markers/viewport/dash cooldown                                  | `src/game/minimap`                                                           |
| Validation                 | Unit/UI tests, simulation integration tests, serial Chromium E2E, production smoke                                                | `src/**/*.test.*`, `e2e`, `vitest.config.ts`, `playwright*.config.ts`        |

### Startup and data flow

1. `src/main.tsx` mounts `App`.
2. The start button mounts `GameCanvas`.
3. `GameCanvas` dynamically imports `createGame`, which creates Phaser with the selected
   map ID and one reusable `ArenaScene`.
4. `ArenaScene.create()` resolves the validated `MapDefinition`, creates its
   map-configured `Simulation`, render layers, minimap, and bridge controller.
5. React keyboard handlers update held input or dispatch actions through `gameBridge`.
6. `ArenaScene.update()` passes bridge input to `Simulation.update()`.
7. The simulation advances in fixed `1000 / 60` ms steps and owns authoritative state.
8. The scene renders the selected map and simulation state, updates the camera/minimap,
   and publishes a throttled `GameSnapshot` containing the authoritative `mapId`.
9. React subscribes to snapshots and renders the HUD and overlays.

The test-only `window.__RPS_TEST__` API is created only in Vite test mode. The production
smoke test confirms it is absent from the built application.

## Existing Working Systems

### Factions and units

- Rock, Paper, and Scissors are represented by a strict `Faction` union.
- All nine faction relationships are covered by tests.
- Units have health, velocity, motion state, intent, AI memory, hit cooldown records,
  knockback state, recruitment state, and deterministic swarm offsets.
- Independent AI retains the shared base motion profile. Recruited units derive
  configuration-driven Rock, Paper, or Scissors player passives without changing the AI
  decision model.

### AI and steering

- Independent units prioritize fleeing predators, chasing prey, ally cohesion, then
  wandering.
- Decisions are remembered, delayed, and committed rather than tracking targets every
  frame.
- Seeded target prediction error and wander directions keep tests deterministic.
- Acceleration, deceleration, drag, steering-force limits, turn-rate limits, separation,
  and momentum-aware tree avoidance are implemented.

### Player swarm

- Player input moves an invisible target; recruited units steer toward deterministic
  loose formation offsets.
- Idle target recentering and quadratic correction damping prevent persistent drift.
- Player base speed is 120 with dedicated acceleration, deceleration, and steering
  responsiveness.
- Living recruited count adds 3% speed per unit after the first, capped at a 50% bonus.
- Only living recruited units of the current player faction affect player swarm speed.

### Recruitment

- Living neutral units matching the current player faction join when any recruited unit
  is within the effective recruitment radius.
- Recruitment updates after shrine transformation and anchor transfer.
- Recruitment starts at radius 55, adds 3 per living recruit after the first, caps at
  +75, and expands immediately during same-step recruitment.

### Combat and knockback

- Opposing contact resolves simultaneous two-way damage with per-attacker/target
  cooldowns.
- Advantage damage is greater than disadvantage damage.
- Death removes gameplay participation and emits deterministic particles.
- Knockback uses base force 180 for 180 ms, applies outgoing/incoming faction multipliers,
  remains collision constrained, and renders a short impact trail.
- Rock deals 1.25x outgoing knockback and receives 0.7x incoming knockback.

### Dash

- Space requests a dash in the current or most recent valid direction.
- The 1.9x dash eases in over 45 ms and out over 80 ms during a 220 ms duration.
- Cooldown uses composable faction, future difficulty, and temporary multipliers.
- Scissors has a 0.75x cooldown; the minimap reads the effective authoritative cooldown.
- Dash respects simulation pause, world boundaries, and tree collision.
- The minimap owns a small authoritative cooldown indicator.

### Triad Shrine

- The shrine is fully simulation-owned rather than partial.
- Q/E or explicit pointer buttons choose either non-current faction and hold-F channels
  while the whole recruited swarm is in range.
- Minimum population, cancellation, qualifying-hit interruption, rounded-up sacrifice,
  survivor transformation, one-use state, and movement penalties are implemented.
- Sacrifices have a distinct shrine-death effect; the UI and world renderer expose
  cancelled, transforming, fatigue, and permanently dormant states.
- Transformation clears independent-unit AI targets and immediately refreshes faction
  relationships, passives, dash cooldown, recruitment, anchor, minimap, HUD, and results.
- Restart restores the Rock faction and shrine state. A typed per-simulation override
  allows later tutorial scenes to disable or retune shrine rules without mutating global
  balance.

### World, minimap, and presentation

- Meadow, Forest, and Marsh are immutable validated `MapDefinition` objects consumed by
  the reusable arena scene; map-specific behavior is not hardcoded in the scene.
- Every map defines display/preview metadata, world and camera bounds, trunk-centered
  trees and prop obstacles, a central shrine, faction spawn regions, terrain and
  decoration regions, population recommendations, par time, route goals, and a minimap
  palette.
- Larger trees use visible trunks, layered canopies, shadows, and collision bodies
  centered on the trunk. Normal movement and dash share a three-unit visual safety skin,
  while depth sorting makes trunk occlusion agree with collision.
- Meadow is the open beginner arena; Forest uses dense clusters, clearings, and looped
  swarm-passable routes; Marsh uses dry islands/routes plus configured mud and water.
- Mud modifies speed and acceleration for player and independent units, gives Rock a
  small resistance, and does not disable dash.
- Repeated non-colliding detail is generated deterministically from the selected map seed.
- The camera follows the recruited swarm inside selected bounds, adds configurable
  velocity-sensitive lag, and zooms out from 1.0x to at most 0.82x for large swarms.
- The display-only minimap consumes the selected map's bounds, palette, terrain,
  obstacles, shrine, living units, viewport, recruited/anchor emphasis, and dash cooldown.
- Units are original 16x16 code-authored pixel characters rendered through batched Phaser
  `Graphics` with nearest-neighbour settings. The typed controller covers idle, move,
  dash, hit, death, and shrine transformation states for every faction.
- Movement, recruitment, combat, death, and shrine effects use bounded pooled particles,
  one-shot typed events, configurable hit pause/shake/flash profiles, and reduced-motion
  compatibility.

### HUD and menus

- Current UI includes a start overlay, population/time HUD, shrine status panel, pause
  overlay, renderer retry state, and simple victory/defeat results.
- There is no screen/navigation model for landing, match setup, How to Play, Settings,
  tutorial, or expanded results.

### Assets and persistence

- The repository bitmap asset set is still empty; `public/favicon.svg` remains the only
  public file asset.
- Unit visuals use a typed code-authored pixel-frame manifest with safe per-faction
  fallbacks and development warnings. Its exact 16x16 contract is ready for later
  replacement artwork without changing animation-state consumers.
- There is no external sprite sheet/atlas loader, music, sound asset, or playback system.
  Typed recruitment/hit/shrine events expose future sound hooks only.
- There are no calls to `localStorage`, `sessionStorage`, IndexedDB, or another save
  mechanism.
- All settings, results, and high scores are currently in memory and are lost on reload.

## Current Configuration Values

All current gameplay tuning is centralized in the typed `GAME_CONFIG` object in
`src/game/config/gameConfig.ts` and validated at module load.

| Area                   | Current values                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Viewport               | 960 x 540                                                                                       |
| Default map/world      | Meadow, 2880 x 1620, padding 48                                                                 |
| Map worlds             | Meadow 2880 x 1620; Forest 3000 x 1800; Marsh 2880 x 1700                                       |
| Population             | Meadow 15/12/16; Forest 16/14/17; Marsh 15/13/16 (Rock/Paper/Scissors)                          |
| Par completion         | Meadow 180 seconds; Forest 240 seconds; Marsh 210 seconds                                       |
| Unit                   | 100 health, radius 10, detection 190, ally radius 105                                           |
| Motion                 | max speed 112, acceleration 460, deceleration 320, drag 0.55, steering force 520, turn rate 3.4 |
| AI timing              | decision 260 ms, reaction 140 ms, prediction 240 ms, prediction error 38                        |
| AI modifiers           | flee speed 1.12, obstacle strength 4.6, look-ahead 62, side bias 0.72                           |
| Combat                 | advantage 35, disadvantage 8, hit cooldown 350 ms, base knockback 180 for 180 ms                |
| Recruitment            | base radius 55, +3 per living recruit after the first, +75 cap                                  |
| Swarm                  | cohesion 0.46, separation 1.1, separation radius 30, max distance 170                           |
| Formation              | offset radius 38, arrival radius 10, return strength 2.8, idle speed multiplier 0.45            |
| Player movement        | base 120, acceleration 720, deceleration 820, steering responsiveness 1.2                       |
| Swarm speed            | +3% per living recruit after the first, +50% cap                                                |
| Dash                   | enabled, 1.9x, 220 ms, 45 ms ease-in, 80 ms ease-out, base cooldown 1200 ms                     |
| Dash policy            | disabled while paused, keeps last direction, does not cancel on collision                       |
| Dash particles         | 5 particles, 240 ms lifetime, speed 45                                                          |
| Rock passive           | acceleration 0.9x, deceleration 0.82x, outgoing knockback 1.25x, incoming knockback 0.7x        |
| Paper passive          | acceleration 1.2x, swarm spread 1.15x                                                           |
| Scissors passive       | turn rate 1.25x, swarm response 1.1x, spread 0.9x, dash cooldown 0.75x                          |
| Marsh mud              | speed 0.62x, acceleration 0.55x, Rock resistance 0.18                                           |
| Simulation             | fixed step `1000 / 60` ms, maximum accepted frame 1000 ms                                       |
| Pixel frame contract   | 16 x 16, origin 8/8, 1.5x display scale, nearest filtering                                      |
| Animation timing       | movement threshold 8; death 260 ms; recruitment 420 ms; shrine transform 900 ms                 |
| Particle pool          | maximum 240 active; intensity scales emission count                                             |
| Movement/recruitment   | movement every 110 ms; 1 base dust particle; 6 base recruitment particles                       |
| Hit visuals            | disadvantage 3 particles/80 ms flash/0 pause; advantage 8/135 ms/28 ms pause                    |
| Death particles        | 8 base particles, 650 ms lifetime, speed 55, inherited prior velocity                           |
| Camera                 | smoothing 0.09 to 0.045; velocity lag 0.36; zoom 1.0 to 0.82 for 8-28 recruits                  |
| Camera shake           | 90 ms, intensity 0.0025; configurable off                                                       |
| Tree safety skin       | 3 units outside obstacle collision radius                                                       |
| Map obstacles          | Handcrafted trunk-centered trees plus circular log/stone collision bodies                       |
| Shrine locations       | Meadow (1440, 810); Forest (1500, 900); Marsh (1440, 850)                                       |
| Shrine rules           | enabled, radius 90, channel 2000 ms, minimum 4, sacrifice 20% rounded up, one use               |
| Shrine movement        | channel multiplier 0.2, post-transform 0.65 for 3000 ms                                         |
| Shrine interruption    | advantaged hit threshold 35; disadvantage interruption disabled by default; cancel UI 900 ms    |
| Shrine effects         | 8 particles, 900 ms lifetime, speed 90                                                          |
| Shrine geometry        | platform 38, outer ring 52, ring 2, symbol orbit 27, symbol size 6                              |
| Minimap                | enabled, width 180, max height 130, margin 12, padding 5                                        |
| Minimap alpha          | background 0.45, border 0.8, terrain 0.5, markers 0.9, viewport 0.9, neutral 0.55               |
| Minimap dash indicator | bar height 4, gap 6, label gap 2, label font 9                                                  |
| Difficulty scores      | Casual 0.75x, Normal 1x, Chaos 1.5x                                                             |
| Difficulty shrine      | Casual 15%, Normal 20%, Chaos 25% sacrifice                                                     |
| Game modes             | Last Faction Standing untimed; Blitz 180 s, movement 1.08x, score 1.25x, completion 500         |
| Scoring                | prey 100, predator 300, victory 1000, survivor 50, full second under par 10                     |
| Local records          | schema 1, keyed by map/starting faction/difficulty/mode                                         |

## Incomplete Final-Release Systems

- Player-facing match setup carrying faction, map, mode, and difficulty into the
  simulation. A complete temporary development selector exists, but final setup UI does
  not.
- Music and sound effects.
- Landing page with a non-interactive autoplaying background simulation.
- First-time interactive tutorial.
- Dedicated How to Play, Settings, match setup, and expanded Results screens.
- Player-facing controls for the already-supported screen shake, particle intensity,
  reduced motion, and reduced flashes settings.
- Local settings and tutorial-completion persistence. Versioned local match records are
  complete.
- Final responsive/accessibility/manual-browser QA across all new screens and maps.

## Requested Scope Conflicts

1. `GAME_CONTEXT.md` currently declares one Meadow map and explicitly excludes levels,
   save systems, and additional product scope. The final-release request requires three
   maps, settings/high-score persistence, modes, tutorials, audio, and multiple screens.
2. `BUILD_PLAN.md` and `TASKS.md` stop at the completed old MVP. They do not describe the
   new release sequence.
3. `IMPLEMENTATION_PROGRESS.md` says the one-map MVP is complete. It remains historical;
   `RELEASE_PROGRESS.md` is the new final-release status record.
4. Phase 5 removed the Rock-start, single-difficulty, and single-mode assumptions through
   immutable match-rule resolution and explicit starting-faction spawning.
5. Phase 4 added the typed pixel manifest/controller and effect-event hooks. The renderer
   still has no external sprite/audio preload lifecycle, music, or sound playback.
6. Phase 6 replaced the single match-oriented shell with an explicit landing, setup,
   tutorial, match, nested-panel, pause, and results flow. React owns navigation while
   the active `Simulation` remains authoritative for match state.
7. `GameSnapshot` contains map, starting/current faction, mode, difficulty, remaining
   time, and current/final score data. Future product screens should consume this
   additive contract rather than duplicating result logic.

The new request does not require a backend. All requested persistence can remain local,
and the final application can remain a static client build.

## Minimum Necessary Refactors

These refactors should be introduced only in the phase that first needs them:

1. `MapDefinition`, typed difficulties/modes, match options, and immutable rule
   resolution are complete. Continue deriving per-match values from validated defaults
   instead of duplicating constants.
2. Continue the incremental runtime-configuration injection used by the shrine override
   and selected map ID. Inject mode/difficulty values only when required, preserving
   current defaults.
3. The necessary map refactor is complete: world, obstacle, terrain, spawn, shrine,
   preview, route, and minimap data are in validated definitions consumed by one
   `ArenaScene`. Do not split them back into copied map-specific scenes.
4. Initial player faction and match rules are explicit; keep starting faction immutable
   for record identity while current player faction remains shrine-driven.
5. Extend `GameSnapshot` additively and update `e2e/global.d.ts` in the same phase whenever
   the snapshot contract changes.
6. The Phase 6 React screen split and typed client-side state are complete. Keep the
   router-free static flow and do not create a second gameplay state store.
7. The small unit manifest and exact frame contract are complete. Add an audio service
   and external-asset preload adapter only when audio or replacement artwork is
   explicitly requested; do not introduce a general-purpose content framework.
8. The versioned local-record and separate player-preference adapters are complete.
   Preserve their independent schema/storage keys when audio settings are connected.
   only in their requested phases rather than weakening its current schema validation.

A rewrite, ECS migration, state-management library, database, backend, or procedural map
system is not necessary.

## System Dependencies

| Producer              | Consumers and migration impact                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GAME_CONFIG`         | Unit creation, AI, movement, recruitment, combat, spawn, simulation, scene, minimap, React initial snapshot, tests |
| `GameSnapshot`        | `ArenaScene`, `gameBridge`, `App`, `GameCanvas` test hook, E2E global declaration and tests                        |
| `Simulation`          | `ArenaScene`, all simulation integration suites, browser test hook behavior                                        |
| `MapDefinition`       | Spawn validation, collision/dash constraints, terrain, camera, rendering, minimap, shrine, restart, selector       |
| Unit sprite manifest  | `UnitAnimationController`, `ArenaScene`, fallback warnings, future replacement-art frame dimensions                |
| Effect events         | `Simulation`, `ArenaScene`, camera shake, HUD recruitment pulse, future audio hooks                                |
| Visual settings       | Effect profiles, particle emission, animation controller, camera, future Settings UI                               |
| Player faction        | Recruitment, AI relationships, combat, spawn anchor, shrine options, result evaluation, HUD/results                |
| Mode/difficulty       | Runtime config, timer/result rules, scoring, setup UI, results, high-score key                                     |
| App screen state      | Live Phaser mount count, keyboard listeners, pause behavior, landing background simulation, tutorial               |
| Asset/audio lifecycle | Phaser preload/create/shutdown, settings, browser autoplay policy, production base path                            |
| Persistence schema    | Settings defaults, tutorial first-run state, results/high-score recording, tests                                   |

## Planned Final-Release Phase Order

Each phase follows the required red/green workflow, runs targeted and complete validation,
updates `RELEASE_PROGRESS.md`, and stops for review.

### Phase 0 - Audit and baseline

Status: complete when this plan and `RELEASE_PROGRESS.md` exist and the baseline is
recorded. No gameplay code or feature tests are changed.

Files: documentation only.

### Phase 1 - Core movement, recruitment, dash, and knockback polish

Status: complete on 2026-07-24; awaiting manual gameplay review.

Scope:

- Add typed faction-specific passive motion profiles.
- Refine sharper/faster swarm response without breaking idle stability.
- Preserve and validate living-swarm speed scaling.
- Add capped swarm-size recruitment-radius scaling.
- Strengthen knockback and add readable impact feedback.
- Revalidate dash composition against the new movement profiles.

Expected files:

- `src/game/config/gameConfig.ts`, faction configuration, and their tests.
- `src/game/model/unit.ts`.
- `src/game/systems/steering.ts`, `recruitment.ts`, `combat.ts`,
  `swarmSpeed.ts`, and focused tests.
- `src/game/simulation/Simulation.ts` and movement/combat/recruitment integration tests.
- The scene renderer only for minimal impact readability; this file is now
  `src/game/scenes/ArenaScene.ts` after Phase 3.

### Phase 2 - Shrine faction switching

Status: complete on 2026-07-24; awaiting manual gameplay review.

Scope:

- Finalize the central one-use Triad Shrine with the requested release tuning.
- Support keyboard and pointer target selection with the current faction disabled.
- Publish cancellation, transformation, sacrifice preview, fatigue, and dormant UI states.
- Refresh every faction-dependent simulation and presentation consumer immediately.
- Add a tutorial-safe per-match shrine override/reset seam.

Affected files/systems:

- Typed shrine configuration and pure shrine state rules.
- `Simulation`, particles, bridge, the current `ArenaScene` renderer, minimap contract,
  React shrine panel,
  focused tests, and E2E.
- No maps, scoring, general menu work, unit graphics, or audio.

### Phase 3 - Reusable arena architecture and three handcrafted maps

Status: complete on 2026-07-24; awaiting manual map review.

Delivered scope:

- Added validated typed definitions for handcrafted Meadow, Forest, and Marsh arenas.
- Made spawn, simulation, collision/dash, mud, camera, shrine, restart, deterministic
  decoration, rendering, and minimap consume the selected definition.
- Replaced `MeadowScene` with one reusable `ArenaScene`.
- Added a development-only selector with deterministic Phaser cleanup/remount.
- Kept procedural maps, final menus, scoring, sprite work, and audio out of scope.

Affected files/systems:

- New `src/game/maps` definitions and tests.
- New terrain modifier system and map integration tests.
- `gameConfig.ts`, spawn, simulation, minimap, `ArenaScene`, createGame/canvas lifecycle,
  snapshot/bridge, React development selector, focused tests, and E2E.

### Phase 4 - Unit graphics, animation, tree readability, and game feel

Status: complete on 2026-07-24; awaiting manual visual review.

Delivered scope:

- Added a validated 16x16 nearest-neighbour frame contract and original code-authored
  Rock, Paper, and Scissors manifests for all six required states.
- Added safe faction fallbacks, development warnings, one shared animation controller,
  velocity response, reduced-motion handling, and transient cleanup.
- Replaced abstract glyphs with batched pixel-frame rendering and added movement,
  recruitment, hit, death, camera, particle, and shrine feedback.
- Added configurable visual settings seams, typed future sound hooks, pooled particles,
  and a 240-particle hard maximum.
- Corrected tree pass-through appearance and edge overlap with depth sorting plus a
  three-unit collision safety skin for normal movement and dash.
- Added no external copyrighted artwork, audio playback, final Settings UI, scoring,
  modes, or menus.

Affected files/systems:

- New `unitSpriteManifest.ts`, `unitAnimation.ts`, `gameFeel.ts`, `particlePool.ts`, and
  their focused tests.
- `gameConfig.ts`, unit/particle models, `Simulation`, map collision integration,
  `ArenaScene`, createGame render settings, HUD/CSS feedback, full regression, and E2E.

### Phase 5 - Match options, scoring, difficulty, and modes

Status: complete on 2026-07-26; awaiting balance review.

Delivered scope:

- Added typed starting faction, Casual/Normal/Chaos difficulties, and Last Faction
  Standing/Blitz definitions with immutable per-match resolution.
- Made all three factions valid deterministic starting factions.
- Added authoritative deduplicated combat scoring, idempotent result bonuses, par-time
  scoring, mode/difficulty multipliers, and HUD/results snapshots.
- Added untimed Last Faction Standing and pausable three-minute Blitz timeout rules.
- Added versioned safe local records keyed by map, starting faction, difficulty, and
  mode.
- Added a complete temporary development selector and passed options through React,
  Phaser scene creation, simulation, and restart.

Affected files/systems:

- `gameConfig.ts`, new `matchRules.ts`, `scoring.ts`, and `localRecords.ts`.
- Spawn, AI, simulation, snapshot, scene/canvas factory, React shell, CSS, focused tests,
  E2E, and release documentation.
- No final menu shell, audio, or tutorial work was added.

### Phase 6 - Product shell, landing simulation, match setup, and screens

Status: complete on 2026-07-26; awaiting UI review.

Delivered scope:

- Added the minimal landing page and deterministic reduced autoplay simulation with
  visibility pausing and lifecycle cleanup.
- Added persistent card-based faction, difficulty, mode, and map selection.
- Added the deterministic eight-stage first-run tutorial, skip/replay behavior, and
  isolated tutorial completion state.
- Added How to Play, immediately persisted Settings, nested Pause, and authoritative
  Results screens.
- Added explicit idempotent pause control and live visual-setting propagation so nested
  screens never resume or recreate the match.
- Added complete component and serial E2E flow coverage.

Affected files/systems:

- `App.tsx`, `styles.css`, and focused components under `src/ui/`.
- New deterministic tutorial controller and versioned player-preference adapter.
- Game canvas/bridge, arena visual settings, minimap opacity, lifecycle tests, and E2E.
- No graphics, gameplay balance, maps, scoring formulas, or audio playback were added.

### Phase 7 - Audio and remaining local persistence

Scope:

- Add music and sound effects with browser gesture-safe startup.
- Consume the typed recruitment, advantage/disadvantage hit, and shrine sound hooks
  established in Phase 4.
- Connect the already persisted master/music/SFX settings to playback.
- Add graceful audio startup and playback failure behavior.

Expected files/systems:

- Audio assets, manifest, and audio service.
- Extend the versioned storage architecture without changing the existing local-record
  schema contract.
- Settings/UI integration and E2E persistence coverage.

### Phase 8 - Tutorial follow-up (scope already delivered)

Status: core scope completed early in Phase 6 because the explicit Phase 6 request
included the full first-time tutorial.

No additional Phase 8 work should begin unless review identifies a tutorial-specific
polish issue.

### Phase 9 - Final production readiness and static deployment

Scope:

- Full regression, coverage, accessibility, responsive, performance, and manual play QA.
- Root and repository-subpath artifact smoke tests.
- Documentation/metadata finalization and verified static deployment.
- No new product features.

Expected files/systems:

- E2E/production tests, CI workflow, README, metadata/assets, and release documents.
- Deployment proof only after the hosted URL and deployed artifact are verified.

## Risks and Migration Concerns

- **Global configuration coupling:** changing all systems at once would create a broad
  regression surface. Inject configuration incrementally while retaining default
  behavior.
- **Snapshot contract drift:** every added field affects React and browser tests. Keep the
  source type and E2E declaration synchronized.
- **Determinism:** map selection, difficulty, modes, scoring, and tutorial fixtures must
  retain explicit seeds and fixed-step timing.
- **Scene lifecycle:** a landing background simulation plus a live match can recreate the
  previous Strict Mode controller race if bridge ownership is not explicit.
- **Map contract:** world size, obstacles, terrain, spawn zones, camera, minimap, shrine,
  and restart now change through one validated definition. New maps must pass the same
  geometry, connectivity, swarm-clearance, deterministic-load, and obstacle-safe spawn
  tests before being registered.
- **Pathing feel:** grid connectivity and collision tests prevent common traps but cannot
  prove that a large live swarm feels smooth in every Forest/Marsh corridor. Manual map
  review remains required.
- **Starting faction migration:** spawn IDs, anchor selection, recruitment, shrine choices,
  results, and existing Rock-oriented tests all depend on the current default.
- **Animation performance:** Phase 4 deliberately kept one batched graphics pass and a
  240-particle cap. Later replacement artwork must preserve shared manifests/textures
  rather than introducing one independently managed asset pipeline per unit.
- **Visual accessibility:** reduced-motion/reduced-flash/shake/particle settings are
  accepted by the systems but do not yet have player-facing controls or persistence.
- **Audio policy:** browsers block autoplay audio. The background simulation must remain
  silent until a user gesture; music/SFX should unlock from an intentional interaction.
- **Persistence corruption:** storage values require schema/version validation and safe
  defaults so malformed data cannot prevent startup.
- **Static base paths:** every new asset URL must work at `/` and
  `/Rock_Paper_Scissors_v2/`.
- **Balance:** automated tests can prove rules and bounds, not that the game feels good.
  Movement, knockback, Blitz duration, scores, difficulty, maps, audio, and tutorial flow
  require manual play review.

## Phase Completion Policy

For every implementation phase:

1. Inspect current implementation and record the baseline.
2. Add or update tests first and capture the expected failure.
3. Implement the smallest maintainable solution.
4. Run targeted tests, the complete test suite, type checking, linting, formatting,
   browser tests, and production build/smoke in proportion to the phase.
5. Keep all balance values in typed centralized configuration.
6. Record exact results and deviations in `RELEASE_PROGRESS.md`.
7. Stop after the requested phase. Do not start the next phase automatically.
