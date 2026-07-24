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
- Move the recruited swarm with WASD or arrow keys.
- Recruit neutral units that match the player's current faction.
- Optionally channel the once-per-match Triad Shrine to become Paper or Scissors at a cost.
- Eliminate both factions opposing the player's current faction.
- Use the universal faction loop: Rock beats Scissors, Scissors beats Paper, Paper beats Rock.
- Win when neither opposing faction remains and at least one unit of the player's faction survives.
- Lose only when no unit of the player's current faction remains anywhere in the arena.

## Faction behavior

Every independent unit prioritizes:

1. Flee its closest detected predator.
2. Chase its closest detected prey.
3. Maintain loose cohesion and separation with allies.
4. Wander.

Independent units sample this priority periodically rather than tracking live targets every frame. A decision is applied only after the configured reaction delay, then remains committed until a later decision is ready. Chase and flee steering use a remembered predicted position with deterministic seeded error, so targets can reverse, juke, hide movement behind trees, and cause overshoot.

All units accelerate toward desired movement, retain momentum, decelerate under drag, and obey steering-force and turn-rate limits. Recruited units are different: player input advances an invisible swarm target, while individuals accelerate toward deterministic compact offsets with separation, cohesion, and obstacle avoidance. Player input stays dominant, but recruits do not share identical velocity. When input stops, the invisible target recenters on the swarm and small formation corrections use heavily damped speeds, allowing the group to settle instead of oscillating. The player target gains a capped, config-driven speed bonus from living recruited units only.

Space requests a config-driven dash in the current or most recently valid movement direction. The dash multiplies the already calculated living-swarm speed, preserves acceleration and individual steering, respects trees and boundaries, emits a small dust burst, and enters a cooldown that freezes with the match while paused. A thin `Dash - SPACE` indicator above the minimap stays empty during the dash and fills from empty to full over the authoritative cooldown.

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

- Neutral units may spawn alone or in small roaming groups.
- Any living neutral unit matching the player's current faction joins immediately, regardless of its current AI state.
- Recruitment is permanent until death.
- An internal recruited anchor supports camera and recruitment calculations.
- If the anchor dies, choose the nearest living recruited unit of the player's faction.
- If no recruited unit survives, choose the nearest neutral unit of the player's faction, recruit it, and continue.
- Anchor death never causes defeat while any unit of the current player faction survives.

## Triad Shrine

- One round shrine sits near the meadow center. Its low platform is wider than the original landmark and its outer circle is deliberately thin.
- The player selects one of the two eligible factions with Q/E and holds F while the entire recruited swarm remains inside the activation radius.
- Channeling takes two seconds, requires at least four recruited units, greatly slows the swarm, and is cancelled by leaving the radius, releasing F, or taking a qualifying advantaged predator hit.
- Activation is limited to once per match. It sacrifices 20% of recruited units, rounded up, through a distinct shrine-particle effect.
- Every survivor transforms into the selected faction and remains recruited. Former-faction units outside the swarm become ordinary independent AI units.
- The transformed swarm has a three-second movement penalty. Faction relationships, recruitment, combat, HUD, anchor, camera, and result checks use the new player faction immediately.
- Restart restores the available shrine, Rock player faction, and all shrine timers.
- Shrine radii, channel timing, costs, penalties, interruption threshold, particles, and geometry are centralized in configuration.

## World and match

- One deterministic meadow layout with grass, solid scattered trees, open paths, and world boundaries.
- Trees block movement but not detection and cannot take damage.
- Unit placement is seedable and valid: no tree or unit overlap at spawn.
- Fixed population; no respawning or reinforcements.
- Initial configurable population: 15 Rocks total, 12 Papers, 16 Scissors.
- Camera smoothly follows the recruited swarm/main cluster and remains within world bounds.
- A compact, partially transparent display-only minimap stays in the bottom-left, shows the complete world population, distinguishes the recruited swarm and neutral units, and outlines the current camera viewport.
- Minimap terrain is intentionally abstract: meadow background, tree dots, and the central Triad Shrine landmark. Shrine gameplay remains authoritative in the simulation rather than the minimap renderer.
- Minimap background, terrain, unit-marker, border, and viewport alpha values are independently configurable and clamped for rendering.

## Controls and interface

- WASD / arrow keys: move.
- Space: dash when ready.
- Q / E: cycle the shrine's eligible faction selection.
- Hold F: channel the shrine while eligible and in range.
- Escape: pause/resume.
- R: restart.
- Start overlay: title, objective, controls, start button.
- HUD: living counts and elapsed active time.
- Pause overlay.
- Victory/defeat overlay with time, final counts, and restart.

## MVP exclusions

No additional factions, unrestricted or repeatable faction switching, levels, campaign, upgrades, bosses, additional shrines, resources, additional abilities, multiplayer, save system, mobile controls, procedural maps, monetization, analytics, accounts, backend, or cloud features.

## Technical direction

- React + TypeScript + Vite provide the application shell and overlays.
- Phaser owns live rendering and scene lifecycle.
- Framework-independent TypeScript systems own faction rules, AI decisions, steering, recruitment, combat, health, match state, and deterministic spawning so they can be unit tested.
- The fixed-step simulation owns persistent per-unit AI memory and motion state; seeded randomness makes prediction error, wandering, and swarm offsets repeatable in tests.
- Pure swarm-speed and dash systems own their calculations and timing; the simulation composes them with existing steering and collision handling.
- Vitest covers unit/integration logic; React Testing Library covers UI; Playwright covers browser flows.
- Static production output must run without a backend.
