import type { Faction } from '../config/factions';
import { GAME_CONFIG } from '../config/gameConfig';
import {
  add,
  average,
  distance,
  dot,
  magnitude,
  normalize,
  scale,
  subtract,
  vec,
  type Vector,
} from '../math/vector';
import { seededValue } from '../math/random';
import type { Particle } from '../model/particle';
import type { Unit } from '../model/unit';
import { updateAiSteering } from '../systems/aiMemory';
import { resolveCombatPair } from '../systems/combat';
import { recruitNearbyRocks } from '../systems/recruitment';
import { createInitialUnits } from '../systems/spawn';
import { steerVelocity } from '../systems/steering';

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
  private accumulatorMs = 0;
  private simulationMs = 0;
  private playerTarget = vec();

  constructor(seed = 1) {
    this.seed = seed;
    this.restart(seed);
  }

  restart(seed = this.seed): void {
    this.seed = seed;
    this.units = createInitialUnits(seed);
    this.particles = [];
    this.elapsedMs = 0;
    this.accumulatorMs = 0;
    this.simulationMs = 0;
    this.status = 'active';
    this.anchorId = this.units.find((unit) => unit.recruited)?.id;
    this.playerTarget = this.units.find((unit) => unit.id === this.anchorId)?.position ?? vec();
    for (const unit of this.units.filter((candidate) => candidate.recruited))
      this.assignSwarmOffset(unit);
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
    const acceptedMs = Math.min(Math.max(deltaMs, 0), GAME_CONFIG.simulation.maxFrameMs);
    this.elapsedMs += acceptedMs;
    this.accumulatorMs += acceptedMs;
    while (
      this.status === 'active' &&
      this.accumulatorMs + Number.EPSILON >= GAME_CONFIG.simulation.fixedStepMs
    ) {
      const stepMs = GAME_CONFIG.simulation.fixedStepMs;
      this.accumulatorMs -= stepMs;
      this.simulationMs += stepMs;
      this.step(stepMs, input);
    }
    this.updateParticles(acceptedMs);
    this.transferAnchorIfNeeded();
    this.evaluateResult();
  }

  private step(stepMs: number, input: Vector): void {
    const joined = recruitNearbyRocks(this.units);
    for (const id of joined) {
      const unit = this.units.find((candidate) => candidate.id === id);
      if (unit) this.assignSwarmOffset(unit);
    }
    const swarm = this.units.filter((unit) => unit.alive && unit.recruited);
    const swarmCenter = average(swarm.map((unit) => unit.position));
    this.updatePlayerTarget(input, swarmCenter, stepMs);

    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.flashRemainingMs = Math.max(0, unit.flashRemainingMs - stepMs);
      let desired: Vector;
      let maximumSpeed = unit.motion.maxSpeed;
      if (unit.knockbackRemainingMs > 0) {
        unit.knockbackRemainingMs = Math.max(0, unit.knockbackRemainingMs - stepMs);
        desired = normalize(unit.knockback);
        maximumSpeed = Math.max(maximumSpeed, magnitude(unit.knockback));
      } else if (unit.recruited) {
        if (!unit.swarmOffsetAssigned) this.assignSwarmOffset(unit);
        unit.intent = 'player';
        const slot = add(this.playerTarget, unit.swarmOffset);
        const toSlot = subtract(slot, unit.position);
        const slotPull =
          magnitude(toSlot) > GAME_CONFIG.swarm.arrivalRadius
            ? scale(normalize(toSlot), GAME_CONFIG.swarm.cohesion)
            : vec();
        desired = add(scale(normalize(input), GAME_CONFIG.swarm.maxInputSpeed), slotPull);
        if (distance(unit.position, swarmCenter) > GAME_CONFIG.swarm.maxDistance)
          desired = add(
            desired,
            scale(
              normalize(subtract(swarmCenter, unit.position)),
              GAME_CONFIG.swarm.returnStrength,
            ),
          );
      } else {
        const decision = updateAiSteering(unit, this.units, this.simulationMs, this.seed);
        unit.intent = decision.intent;
        unit.targetId = decision.targetId;
        desired = decision.direction;
        if (decision.intent === 'flee') maximumSpeed *= unit.motion.fleeSpeedMultiplier;
      }
      desired = add(desired, this.separationFor(unit));
      desired = add(desired, this.treeAvoidanceFor(unit, desired));
      unit.velocity = steerVelocity(unit.velocity, desired, maximumSpeed, stepMs, unit.motion);
    }

    const seconds = stepMs / 1000;
    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.position = add(unit.position, scale(unit.velocity, seconds));
      this.constrainUnit(unit);
    }
    this.resolveCollisions();
    this.emitNewDeaths();
    this.transferAnchorIfNeeded();
    this.evaluateResult();
  }

  private separationFor(unit: Unit): Vector {
    let force = vec();
    for (const ally of this.units) {
      if (ally === unit || !ally.alive || ally.faction !== unit.faction) continue;
      const gap = distance(unit.position, ally.position);
      if (gap > 0 && gap < GAME_CONFIG.swarm.separationRadius) {
        force = add(
          force,
          scale(
            normalize(subtract(unit.position, ally.position)),
            (1 - gap / GAME_CONFIG.swarm.separationRadius) * GAME_CONFIG.swarm.separation,
          ),
        );
      }
    }
    return force;
  }

  private treeAvoidanceFor(unit: Unit, preferredDirection: Vector): Vector {
    let force = vec();
    const heading =
      magnitude(unit.velocity) > 1 ? normalize(unit.velocity) : normalize(preferredDirection);
    if (magnitude(heading) === 0) return force;
    const lookAhead = add(unit.position, scale(heading, unit.motion.obstacleLookAhead));
    for (const [index, tree] of GAME_CONFIG.trees.positions.entries()) {
      const avoidDistance = GAME_CONFIG.trees.radius + unit.radius;
      const gap = distance(lookAhead, tree);
      if (gap < avoidDistance) {
        const proximity = 1 - gap / avoidDistance;
        const away = normalize(subtract(lookAhead, tree));
        const side = seededValue(this.seed, `${unit.id}:tree:${index}`) < 0.5 ? -1 : 1;
        const tangent = { x: -heading.y * side, y: heading.x * side };
        const avoidance = add(away, scale(tangent, unit.motion.obstacleSideBias));
        force = add(
          force,
          scale(normalize(avoidance), unit.motion.obstacleAvoidanceStrength * proximity),
        );
      }
    }
    return force;
  }

  private assignSwarmOffset(unit: Unit): void {
    if (unit.id === this.anchorId) {
      unit.swarmOffset = vec();
    } else {
      const angle = seededValue(this.seed, `${unit.id}:swarm-angle`) * Math.PI * 2;
      const radius =
        Math.sqrt(seededValue(this.seed, `${unit.id}:swarm-radius`)) *
        GAME_CONFIG.swarm.offsetRadius;
      unit.swarmOffset = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    }
    unit.swarmOffsetAssigned = true;
  }

  private updatePlayerTarget(input: Vector, swarmCenter: Vector, stepMs: number): void {
    const separation = distance(this.playerTarget, swarmCenter);
    if (separation > GAME_CONFIG.swarm.maxDistance)
      this.playerTarget = add(
        swarmCenter,
        scale(normalize(subtract(this.playerTarget, swarmCenter)), GAME_CONFIG.swarm.maxDistance),
      );
    this.playerTarget = add(
      this.playerTarget,
      scale(
        normalize(input),
        GAME_CONFIG.units.motion.maxSpeed * GAME_CONFIG.swarm.maxInputSpeed * (stepMs / 1000),
      ),
    );
    const min = GAME_CONFIG.world.padding + GAME_CONFIG.units.radius;
    this.playerTarget.x = Math.min(
      GAME_CONFIG.world.width - min,
      Math.max(min, this.playerTarget.x),
    );
    this.playerTarget.y = Math.min(
      GAME_CONFIG.world.height - min,
      Math.max(min, this.playerTarget.y),
    );
  }

  private constrainUnit(unit: Unit): void {
    const min = GAME_CONFIG.world.padding + unit.radius;
    const maxX = GAME_CONFIG.world.width - GAME_CONFIG.world.padding - unit.radius;
    const maxY = GAME_CONFIG.world.height - GAME_CONFIG.world.padding - unit.radius;
    const clampedX = Math.min(maxX, Math.max(min, unit.position.x));
    const clampedY = Math.min(maxY, Math.max(min, unit.position.y));
    if (clampedX !== unit.position.x) unit.velocity.x = 0;
    if (clampedY !== unit.position.y) unit.velocity.y = 0;
    unit.position.x = clampedX;
    unit.position.y = clampedY;
    for (const tree of GAME_CONFIG.trees.positions) {
      const minimum = GAME_CONFIG.trees.radius + unit.radius;
      const gap = distance(unit.position, tree);
      if (gap < minimum) {
        const away = gap === 0 ? { x: 1, y: 0 } : normalize(subtract(unit.position, tree));
        unit.position = add(tree, scale(away, minimum));
        const inwardSpeed = dot(unit.velocity, away);
        if (inwardSpeed < 0) unit.velocity = subtract(unit.velocity, scale(away, inwardSpeed));
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
          resolveCombatPair(a, b, this.simulationMs);
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
      particle.velocity = scale(
        particle.velocity,
        Math.pow(0.94, deltaMs / GAME_CONFIG.simulation.fixedStepMs),
      );
      particle.remainingMs = Math.max(0, particle.remainingMs - deltaMs);
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
