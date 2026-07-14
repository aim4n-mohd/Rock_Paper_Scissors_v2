import type { Faction } from '../config/factions';
import { GAME_CONFIG } from '../config/gameConfig';
import {
  add,
  average,
  clampMagnitude,
  distance,
  normalize,
  scale,
  subtract,
  vec,
  type Vector,
} from '../math/vector';
import type { Particle } from '../model/particle';
import type { Unit } from '../model/unit';
import { decideIndependentMovement } from '../systems/ai';
import { resolveCombatPair } from '../systems/combat';
import { recruitNearbyRocks } from '../systems/recruitment';
import { createInitialUnits } from '../systems/spawn';

export type MatchStatus = 'active' | 'paused' | 'victory' | 'defeat';
export interface GameSnapshot {
  status: MatchStatus;
  counts: Record<Faction, number>;
  elapsedMs: number;
  recruitedCount: number;
  anchorId?: string;
  swarmCenter: Vector;
}

function idAngle(id: string, timeMs: number): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return (hash % 628) / 100 + Math.floor(timeMs / 1600) * 0.73;
}

export class Simulation {
  units: Unit[] = [];
  particles: Particle[] = [];
  elapsedMs = 0;
  status: MatchStatus = 'active';
  anchorId?: string;
  private seed: number;
  private emittedDeaths = new Set<string>();

  constructor(seed = 1) {
    this.seed = seed;
    this.restart(seed);
  }

  restart(seed = this.seed): void {
    this.seed = seed;
    this.units = createInitialUnits(seed);
    this.particles = [];
    this.elapsedMs = 0;
    this.status = 'active';
    this.anchorId = this.units.find((unit) => unit.recruited)?.id;
    this.emittedDeaths.clear();
  }

  setPaused(paused: boolean): void {
    if (this.status === 'active' && paused) this.status = 'paused';
    else if (this.status === 'paused' && !paused) this.status = 'active';
  }

  togglePaused(): void {
    this.setPaused(this.status !== 'paused');
  }

  update(deltaMs: number, input: Vector): void {
    if (this.status !== 'active') return;
    const stepMs = Math.min(Math.max(deltaMs, 0), 1000);
    this.elapsedMs += stepMs;
    recruitNearbyRocks(this.units);
    const swarm = this.units.filter((unit) => unit.alive && unit.recruited);
    const swarmCenter = average(swarm.map((unit) => unit.position));

    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.flashRemainingMs = Math.max(0, unit.flashRemainingMs - stepMs);
      let desired: Vector;
      if (unit.knockbackRemainingMs > 0) {
        unit.knockbackRemainingMs = Math.max(0, unit.knockbackRemainingMs - stepMs);
        desired = unit.knockback;
      } else if (unit.recruited) {
        unit.intent = 'player';
        const inputVelocity = scale(normalize(input), GAME_CONFIG.units.speed);
        const homePull =
          distance(unit.position, swarmCenter) > GAME_CONFIG.swarm.maxDistance
            ? scale(
                normalize(subtract(swarmCenter, unit.position)),
                GAME_CONFIG.units.speed * GAME_CONFIG.swarm.cohesion,
              )
            : vec();
        desired = add(inputVelocity, homePull);
      } else {
        const angle = idAngle(unit.id, this.elapsedMs);
        const decision = decideIndependentMovement(unit, this.units, {
          x: Math.cos(angle),
          y: Math.sin(angle),
        });
        unit.intent = decision.intent;
        unit.targetId = decision.targetId;
        const multiplier = decision.intent === 'flee' ? GAME_CONFIG.units.fleeMultiplier : 1;
        desired = scale(decision.direction, GAME_CONFIG.units.speed * multiplier);
      }
      desired = add(desired, this.separationFor(unit));
      desired = add(desired, this.treeAvoidanceFor(unit));
      unit.velocity = clampMagnitude(
        desired,
        GAME_CONFIG.units.speed *
          (unit.intent === 'flee' ? GAME_CONFIG.units.fleeMultiplier : 1.35),
      );
    }

    const seconds = stepMs / 1000;
    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.position = add(unit.position, scale(unit.velocity, seconds));
      this.constrainUnit(unit);
    }
    this.resolveCollisions();
    this.emitNewDeaths();
    this.updateParticles(stepMs);
    this.transferAnchorIfNeeded();
    this.evaluateResult();
  }

  private separationFor(unit: Unit): Vector {
    let force = vec();
    for (const ally of this.units) {
      if (ally === unit || !ally.alive || ally.faction !== unit.faction) continue;
      const gap = distance(unit.position, ally.position);
      if (gap > 0 && gap < unit.radius * 3.2) {
        force = add(
          force,
          scale(
            normalize(subtract(unit.position, ally.position)),
            (unit.radius * 3.2 - gap) * GAME_CONFIG.swarm.separation,
          ),
        );
      }
    }
    return force;
  }

  private treeAvoidanceFor(unit: Unit): Vector {
    let force = vec();
    for (const tree of GAME_CONFIG.trees.positions) {
      const gap = distance(unit.position, tree);
      const avoidDistance = GAME_CONFIG.trees.radius + unit.radius + 28;
      if (gap < avoidDistance)
        force = add(
          force,
          scale(normalize(subtract(unit.position, tree)), (avoidDistance - gap) * 7),
        );
    }
    return force;
  }

  private constrainUnit(unit: Unit): void {
    const min = GAME_CONFIG.world.padding + unit.radius;
    const maxX = GAME_CONFIG.world.width - GAME_CONFIG.world.padding - unit.radius;
    const maxY = GAME_CONFIG.world.height - GAME_CONFIG.world.padding - unit.radius;
    unit.position.x = Math.min(maxX, Math.max(min, unit.position.x));
    unit.position.y = Math.min(maxY, Math.max(min, unit.position.y));
    for (const tree of GAME_CONFIG.trees.positions) {
      const minimum = GAME_CONFIG.trees.radius + unit.radius;
      const gap = distance(unit.position, tree);
      if (gap < minimum) {
        const away = gap === 0 ? { x: 1, y: 0 } : normalize(subtract(unit.position, tree));
        unit.position = add(tree, scale(away, minimum));
      }
    }
  }

  private resolveCollisions(): void {
    for (let i = 0; i < this.units.length; i += 1) {
      const a = this.units[i]!;
      if (!a.alive) continue;
      for (let j = i + 1; j < this.units.length; j += 1) {
        const b = this.units[j]!;
        if (!b.alive || a.faction === b.faction) continue;
        if (distance(a.position, b.position) <= a.radius + b.radius)
          resolveCombatPair(a, b, this.elapsedMs);
      }
    }
  }

  private emitNewDeaths(): void {
    for (const unit of this.units) {
      if (unit.alive || this.emittedDeaths.has(unit.id)) continue;
      this.emittedDeaths.add(unit.id);
      for (let i = 0; i < GAME_CONFIG.particles.count; i += 1) {
        const angle = (Math.PI * 2 * i) / GAME_CONFIG.particles.count + idAngle(unit.id, i * 97);
        this.particles.push({
          id: `${unit.id}-particle-${i}`,
          faction: unit.faction,
          position: { ...unit.position },
          velocity: {
            x: Math.cos(angle) * GAME_CONFIG.particles.speed,
            y: Math.sin(angle) * GAME_CONFIG.particles.speed,
          },
          remainingMs: GAME_CONFIG.particles.lifetimeMs,
          lifetimeMs: GAME_CONFIG.particles.lifetimeMs,
        });
      }
    }
  }

  private updateParticles(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    for (const particle of this.particles) {
      particle.position = add(particle.position, scale(particle.velocity, seconds));
      particle.velocity = scale(particle.velocity, 0.94);
      particle.remainingMs -= deltaMs;
    }
    this.particles = this.particles.filter((particle) => particle.remainingMs > 0);
  }

  private transferAnchorIfNeeded(): void {
    const anchor = this.units.find((unit) => unit.id === this.anchorId);
    if (anchor?.alive && anchor.recruited) return;
    const origin = anchor?.position ?? {
      x: GAME_CONFIG.world.width / 2,
      y: GAME_CONFIG.world.height / 2,
    };
    const candidates = this.units.filter((unit) => unit.alive && unit.faction === 'rock');
    candidates.sort(
      (a, b) =>
        Number(b.recruited) - Number(a.recruited) ||
        distance(origin, a.position) - distance(origin, b.position),
    );
    const replacement = candidates[0];
    if (!replacement) {
      this.anchorId = undefined;
      return;
    }
    replacement.recruited = true;
    replacement.intent = 'player';
    this.anchorId = replacement.id;
  }

  private evaluateResult(): void {
    const counts = this.counts();
    if (counts.rock === 0) this.status = 'defeat';
    else if (counts.paper === 0 && counts.scissors === 0) this.status = 'victory';
  }

  killFaction(faction: Faction): void {
    for (const unit of this.units) {
      if (unit.faction === faction && unit.alive) {
        unit.alive = false;
        unit.health = 0;
        unit.intent = 'dead';
      }
    }
    this.emitNewDeaths();
    this.transferAnchorIfNeeded();
    this.evaluateResult();
  }

  counts(): Record<Faction, number> {
    return {
      rock: this.units.filter((unit) => unit.alive && unit.faction === 'rock').length,
      paper: this.units.filter((unit) => unit.alive && unit.faction === 'paper').length,
      scissors: this.units.filter((unit) => unit.alive && unit.faction === 'scissors').length,
    };
  }

  swarmCenter(): Vector {
    return average(
      this.units.filter((unit) => unit.alive && unit.recruited).map((unit) => unit.position),
    );
  }

  snapshot(): GameSnapshot {
    return {
      status: this.status,
      counts: this.counts(),
      elapsedMs: this.elapsedMs,
      recruitedCount: this.units.filter((unit) => unit.alive && unit.recruited).length,
      anchorId: this.anchorId,
      swarmCenter: this.swarmCenter(),
    };
  }
}
