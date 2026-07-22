# Rock, Paper, Scissors v2.2 — Product Context

## Goal

Build a publishable, client-only, top-down pixel arcade game that proves the fun of steering a Rock swarm through a living Rock–Paper–Scissors ecosystem.

## Source priority

1. This file defines product scope and resolved design decisions.
2. `BUILD_PLAN.md` defines engineering phases and acceptance gates.
3. `TASKS.md` defines implementation order.
4. `IMPLEMENTATION_PROGRESS.md` records demonstrated completion.

When documents conflict, prefer the smallest interpretation that preserves this MVP. Do not add product scope without user approval.

## Core loop

- Start as one recruited Rock in a fixed meadow three to five viewports large.
- Move the recruited Rock swarm with WASD or arrow keys.
- Recruit every neutral Rock that enters the recruitment radius.
- Eliminate every Paper and Scissors unit.
- Use the universal faction loop: Rock beats Scissors, Scissors beats Paper, Paper beats Rock.
- Win when no Paper or Scissors units remain and at least one Rock survives.
- Lose only when no Rock remains anywhere in the arena.

## Faction behavior

Every independent unit prioritizes:

1. Flee its closest detected predator.
2. Chase its closest detected prey.
3. Maintain loose cohesion and separation with allies.
4. Wander.

Independent units sample this priority periodically rather than tracking live targets every frame. A decision is applied only after the configured reaction delay, then remains committed until a later decision is ready. Chase and flee steering use a remembered predicted position with deterministic seeded error, so targets can reverse, juke, hide movement behind trees, and cause overshoot.

All units accelerate toward desired movement, retain momentum, decelerate under drag, and obey steering-force and turn-rate limits. Recruited Rocks are different: player input advances an invisible swarm target, while individual Rocks accelerate toward deterministic loose offsets with separation, cohesion, and obstacle avoidance. Player input stays dominant, but Rocks do not share identical velocity.

## Combat

- All units begin with 100 health.
- On a valid opposing collision, both attacks resolve simultaneously.
- The predator deals 35 damage; the prey deals 8 damage.
- Each attacker-target pair has a 350 ms hit cooldown.
- Both participants receive a small separating knockback.
- Units never lock into combat.
- A dead unit immediately stops all gameplay participation and becomes faction-colored fading pixel particles.

Every balance value belongs in typed centralized configuration.

## Recruitment and anchor

- Neutral Rocks may spawn alone or in small roaming groups.
- Any living neutral Rock within recruitment range joins immediately, regardless of its current AI state.
- Recruitment is permanent until death.
- An internal recruited Rock anchor supports camera and recruitment calculations.
- If the anchor dies, choose the nearest living recruited Rock.
- If no recruited Rock survives, choose the nearest neutral Rock, recruit it, and continue.
- Anchor death never causes defeat while any Rock survives.

## World and match

- One deterministic meadow layout with grass, solid scattered trees, open paths, and world boundaries.
- Trees block movement but not detection and cannot take damage.
- Unit placement is seedable and valid: no tree or unit overlap at spawn.
- Fixed population; no respawning or reinforcements.
- Initial configurable population: 15 Rocks total, 12 Papers, 16 Scissors.
- Camera smoothly follows the recruited swarm/main cluster and remains within world bounds.
- A compact display-only minimap stays in the bottom-left, shows the complete world population, distinguishes the recruited swarm and neutral Rocks, and outlines the current camera viewport.
- Minimap terrain is intentionally abstract: meadow background, tree dots, and one central visual shrine landmark. The shrine has no collision, interaction, faction-switching, or other gameplay behavior.

## Controls and interface

- WASD / arrow keys: move.
- Escape: pause/resume.
- R: restart.
- Start overlay: title, objective, controls, start button.
- HUD: living counts and elapsed active time.
- Pause overlay.
- Victory/defeat overlay with time, final counts, and restart.

## MVP exclusions

No additional factions, playable Paper/Scissors, faction switching, levels, campaign, upgrades, bosses, interactive shrines, resources, abilities, dash, multiplayer, save system, mobile controls, procedural maps, monetization, analytics, accounts, backend, or cloud features.

## Technical direction

- React + TypeScript + Vite provide the application shell and overlays.
- Phaser owns live rendering and scene lifecycle.
- Framework-independent TypeScript systems own faction rules, AI decisions, steering, recruitment, combat, health, match state, and deterministic spawning so they can be unit tested.
- The fixed-step simulation owns persistent per-unit AI memory and motion state; seeded randomness makes prediction error, wandering, and swarm offsets repeatable in tests.
- Vitest covers unit/integration logic; React Testing Library covers UI; Playwright covers browser flows.
- Static production output must run without a backend.
