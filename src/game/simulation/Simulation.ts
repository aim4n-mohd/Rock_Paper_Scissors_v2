import { FACTIONS, type Faction } from '../config/factions';
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
import { DashSystem, type DashSnapshot } from '../systems/dash';
import { recruitNearbyFaction } from '../systems/recruitment';
import {
  advanceShrineChannel,
  calculateShrineSacrificeCount,
  canChannelShrine,
  createShrineState,
  selectShrineFaction as selectShrineFactionState,
  tickShrineEffects,
  type ShrineState,
  type ShrineStatus,
} from '../systems/shrine';
import { createInitialUnits } from '../systems/spawn';
import { steerVelocity } from '../systems/steering';
import { calculateSwarmSpeedMultiplier } from '../systems/swarmSpeed';

export type MatchStatus = 'active' | 'paused' | 'victory' | 'defeat';
export interface ShrineSnapshot {
  status: ShrineStatus;
  selectedFaction?: Faction;
  channelProgressMs: number;
  channelDurationMs: number;
  usesRemaining: number;
  movementPenaltyRemainingMs: number;
  transformationEffectRemainingMs: number;
  inRange: boolean;
  canActivate: boolean;
  sacrificePreview: number;
  minimumRecruitedUnits: number;
}

export interface GameSnapshot {
  status: MatchStatus;
  playerFaction: Faction;
  counts: Record<Faction, number>;
  elapsedMs: number;
  recruitedCount: number;
  anchorId?: string;
  swarmCenter: Vector;
  shrine: ShrineSnapshot;
  dash: DashSnapshot;
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
  playerFaction: Faction = 'rock';
  anchorId?: string;
  shrine: ShrineState = createShrineState(GAME_CONFIG.shrine);
  private seed: number;
  private emittedDeaths = new Set<string>();
  private accumulatorMs = 0;
  private simulationMs = 0;
  private playerTarget = vec();
  private readonly dash = new DashSystem(GAME_CONFIG.dash);

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
    this.playerFaction = 'rock';
    this.shrine = createShrineState(GAME_CONFIG.shrine);
    this.dash.reset();
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

  currentSwarmSpeedMultiplier(): number {
    const recruitedCount = this.units.filter((unit) => unit.alive && unit.recruited).length;
    return calculateSwarmSpeedMultiplier(
      recruitedCount,
      GAME_CONFIG.playerMovement.speedBonusPerUnit,
      GAME_CONFIG.playerMovement.maxSwarmSpeedBonus,
    );
  }

  currentEffectiveSwarmSpeed(): number {
    return (
      GAME_CONFIG.playerMovement.baseSwarmSpeed *
      this.currentSwarmSpeedMultiplier() *
      this.playerMovementMultiplier() *
      this.dash.movementMultiplier()
    );
  }

  requestDash(input: Vector): boolean {
    const started = this.dash.request(input, this.status === 'active');
    if (started) this.spawnDashParticles(this.dash.snapshot().direction);
    return started;
  }

  update(deltaMs: number, input: Vector, interactionHeld = false): void {
    if (this.status !== 'active') return;
    this.dash.observeInput(input);
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
      this.step(stepMs, input, interactionHeld);
    }
    this.updateParticles(acceptedMs);
    this.transferAnchorIfNeeded();
    this.evaluateResult();
  }

  private step(stepMs: number, input: Vector, interactionHeld: boolean): void {
    tickShrineEffects(this.shrine, stepMs);
    const joined = recruitNearbyFaction(this.units, this.playerFaction);
    for (const id of joined) {
      const unit = this.units.find((candidate) => candidate.id === id);
      if (unit) this.assignSwarmOffset(unit);
    }
    const swarm = this.units.filter((unit) => unit.alive && unit.recruited);
    const swarmCenter = average(swarm.map((unit) => unit.position));
    const preChannelContext = {
      interactionHeld,
      inRange: this.isSwarmInsideShrine(swarm),
      recruitedCount: swarm.length,
      playerFaction: this.playerFaction,
    };
    if (canChannelShrine(this.shrine, preChannelContext, GAME_CONFIG.shrine)) {
      this.shrine.status = 'channeling';
    } else if (this.shrine.status === 'channeling') {
      this.shrine.status = 'available';
      this.shrine.channelProgressMs = 0;
    }
    const playerDirection = this.dash.movementDirection(input);
    const playerIsMoving = magnitude(playerDirection) > 0;
    const effectiveSwarmSpeed = this.currentEffectiveSwarmSpeed();
    this.updatePlayerTarget(playerDirection, swarmCenter, stepMs, effectiveSwarmSpeed);

    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.flashRemainingMs = Math.max(0, unit.flashRemainingMs - stepMs);
      let desired: Vector;
      let maximumSpeed = unit.motion.maxSpeed;
      let idleFormationCorrection = false;
      if (unit.knockbackRemainingMs > 0) {
        unit.knockbackRemainingMs = Math.max(0, unit.knockbackRemainingMs - stepMs);
        desired = normalize(unit.knockback);
        maximumSpeed = Math.max(maximumSpeed, magnitude(unit.knockback));
      } else if (unit.recruited) {
        if (!unit.swarmOffsetAssigned) this.assignSwarmOffset(unit);
        unit.intent = 'player';
        maximumSpeed = effectiveSwarmSpeed;
        const slot = add(this.playerTarget, unit.swarmOffset);
        const toSlot = subtract(slot, unit.position);
        const slotPull =
          magnitude(toSlot) > GAME_CONFIG.swarm.arrivalRadius
            ? scale(normalize(toSlot), GAME_CONFIG.swarm.cohesion)
            : vec();
        desired = add(scale(playerDirection, GAME_CONFIG.swarm.maxInputSpeed), slotPull);
        if (distance(unit.position, swarmCenter) > GAME_CONFIG.swarm.maxDistance)
          desired = add(
            desired,
            scale(
              normalize(subtract(swarmCenter, unit.position)),
              GAME_CONFIG.swarm.returnStrength,
            ),
          );
        idleFormationCorrection = !playerIsMoving;
      } else {
        const decision = updateAiSteering(unit, this.units, this.simulationMs, this.seed);
        unit.intent = decision.intent;
        unit.targetId = decision.targetId;
        desired = decision.direction;
        if (decision.intent === 'flee') maximumSpeed *= unit.motion.fleeSpeedMultiplier;
      }
      desired = add(desired, this.separationFor(unit));
      desired = add(desired, this.treeAvoidanceFor(unit, desired));
      const correctionStrength = Math.min(1, magnitude(desired));
      const targetSpeedScale = idleFormationCorrection
        ? GAME_CONFIG.swarm.idleSpeedMultiplier * correctionStrength * correctionStrength
        : 1;
      unit.velocity = steerVelocity(
        unit.velocity,
        desired,
        maximumSpeed,
        stepMs,
        unit.motion,
        targetSpeedScale,
      );
    }

    const seconds = stepMs / 1000;
    let recruitedCollision = false;
    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.position = add(unit.position, scale(unit.velocity, seconds));
      if (this.constrainUnit(unit) && unit.recruited) recruitedCollision = true;
    }
    if (recruitedCollision) this.dash.handleCollision();
    const qualifyingPredatorHit = this.resolveCollisions();
    const postMovementSwarm = this.units.filter((unit) => unit.alive && unit.recruited);
    const completed = advanceShrineChannel(
      this.shrine,
      {
        deltaMs: stepMs,
        interactionHeld,
        inRange: this.isSwarmInsideShrine(postMovementSwarm),
        qualifyingPredatorHit,
        recruitedCount: postMovementSwarm.length,
        playerFaction: this.playerFaction,
      },
      GAME_CONFIG.shrine,
    );
    if (completed) this.completeShrineTransformation();
    this.dash.tick(stepMs, true);
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

  private updatePlayerTarget(
    movementDirection: Vector,
    swarmCenter: Vector,
    stepMs: number,
    effectiveSwarmSpeed: number,
  ): void {
    if (magnitude(movementDirection) === 0) {
      this.playerTarget = { ...swarmCenter };
      return;
    }
    const separation = distance(this.playerTarget, swarmCenter);
    if (separation > GAME_CONFIG.swarm.maxDistance)
      this.playerTarget = add(
        swarmCenter,
        scale(normalize(subtract(this.playerTarget, swarmCenter)), GAME_CONFIG.swarm.maxDistance),
      );
    this.playerTarget = add(
      this.playerTarget,
      scale(
        movementDirection,
        effectiveSwarmSpeed * GAME_CONFIG.swarm.maxInputSpeed * (stepMs / 1000),
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

  private constrainUnit(unit: Unit): boolean {
    let collided = false;
    const min = GAME_CONFIG.world.padding + unit.radius;
    const maxX = GAME_CONFIG.world.width - GAME_CONFIG.world.padding - unit.radius;
    const maxY = GAME_CONFIG.world.height - GAME_CONFIG.world.padding - unit.radius;
    const clampedX = Math.min(maxX, Math.max(min, unit.position.x));
    const clampedY = Math.min(maxY, Math.max(min, unit.position.y));
    if (clampedX !== unit.position.x) {
      unit.velocity.x = 0;
      collided = true;
    }
    if (clampedY !== unit.position.y) {
      unit.velocity.y = 0;
      collided = true;
    }
    unit.position.x = clampedX;
    unit.position.y = clampedY;
    for (const tree of GAME_CONFIG.trees.positions) {
      const minimum = GAME_CONFIG.trees.radius + unit.radius;
      const gap = distance(unit.position, tree);
      if (gap < minimum) {
        collided = true;
        const away = gap === 0 ? { x: 1, y: 0 } : normalize(subtract(unit.position, tree));
        unit.position = add(tree, scale(away, minimum));
        const inwardSpeed = dot(unit.velocity, away);
        if (inwardSpeed < 0) unit.velocity = subtract(unit.velocity, scale(away, inwardSpeed));
      }
    }
    return collided;
  }

  private resolveCollisions(): boolean {
    let qualifyingPredatorHit = false;
    for (let i = 0; i < this.units.length; i += 1) {
      const a = this.units[i]!;
      if (!a.alive) continue;
      for (let j = i + 1; j < this.units.length; j += 1) {
        const b = this.units[j]!;
        if (!b.alive || a.faction === b.faction) continue;
        if (distance(a.position, b.position) <= a.radius + b.radius) {
          const result = resolveCombatPair(a, b, this.simulationMs);
          for (const hit of result.hits) {
            const target = this.units.find((unit) => unit.id === hit.targetId);
            if (
              target?.recruited &&
              hit.advantaged &&
              hit.damage >= GAME_CONFIG.shrine.highDamageInterruptThreshold
            )
              qualifyingPredatorHit = true;
          }
        }
      }
    }
    return qualifyingPredatorHit;
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
          effect: 'death',
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
    const candidates = this.units.filter(
      (unit) => unit.alive && unit.faction === this.playerFaction,
    );
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
    if (counts[this.playerFaction] === 0) {
      this.status = 'defeat';
      return;
    }
    if (
      FACTIONS.filter((faction) => faction !== this.playerFaction).every(
        (faction) => counts[faction] === 0,
      )
    )
      this.status = 'victory';
  }

  selectShrineFaction(faction: Faction): boolean {
    return selectShrineFactionState(this.shrine, this.playerFaction, faction);
  }

  cycleShrineSelection(direction: -1 | 1): void {
    if (this.shrine.status === 'used') return;
    const eligible = FACTIONS.filter((faction) => faction !== this.playerFaction);
    const currentIndex = this.shrine.selectedFaction
      ? eligible.indexOf(this.shrine.selectedFaction)
      : direction > 0
        ? -1
        : 0;
    const nextIndex = (currentIndex + direction + eligible.length) % eligible.length;
    const next = eligible[nextIndex];
    if (next) this.selectShrineFaction(next);
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
    const recruitedCount = this.units.filter((unit) => unit.alive && unit.recruited).length;
    const inRange = this.isSwarmInsideShrine();
    return {
      status: this.status,
      playerFaction: this.playerFaction,
      counts: this.counts(),
      elapsedMs: this.elapsedMs,
      recruitedCount,
      anchorId: this.anchorId,
      swarmCenter: this.swarmCenter(),
      shrine: {
        status: this.shrine.status,
        selectedFaction: this.shrine.selectedFaction,
        channelProgressMs: this.shrine.channelProgressMs,
        channelDurationMs: GAME_CONFIG.shrine.channelDurationMs,
        usesRemaining: this.shrine.usesRemaining,
        movementPenaltyRemainingMs: this.shrine.movementPenaltyRemainingMs,
        transformationEffectRemainingMs: this.shrine.transformationEffectRemainingMs,
        inRange,
        canActivate:
          this.shrine.status !== 'used' &&
          this.shrine.usesRemaining > 0 &&
          inRange &&
          recruitedCount >= GAME_CONFIG.shrine.minimumRecruitedUnits,
        sacrificePreview:
          this.shrine.status === 'used'
            ? 0
            : calculateShrineSacrificeCount(recruitedCount, GAME_CONFIG.shrine.sacrificeRatio),
        minimumRecruitedUnits: GAME_CONFIG.shrine.minimumRecruitedUnits,
      },
      dash: this.dash.snapshot(),
    };
  }

  private isSwarmInsideShrine(recruitedUnits?: readonly Unit[]): boolean {
    const swarm = recruitedUnits ?? this.units.filter((unit) => unit.alive && unit.recruited);
    return (
      swarm.length > 0 &&
      swarm.every(
        (unit) =>
          distance(unit.position, GAME_CONFIG.landmarks.shrine) <=
          GAME_CONFIG.shrine.activationRadius,
      )
    );
  }

  private playerMovementMultiplier(): number {
    if (this.shrine.status === 'channeling') return GAME_CONFIG.shrine.channelSpeedMultiplier;
    if (this.shrine.movementPenaltyRemainingMs > 0)
      return GAME_CONFIG.shrine.postTransformSpeedMultiplier;
    return 1;
  }

  private completeShrineTransformation(): void {
    const selectedFaction = this.shrine.selectedFaction;
    if (!selectedFaction || selectedFaction === this.playerFaction) return;
    const recruited = this.units.filter((unit) => unit.alive && unit.recruited);
    const sacrificeCount = calculateShrineSacrificeCount(
      recruited.length,
      GAME_CONFIG.shrine.sacrificeRatio,
    );
    const sacrificeOrder = [...recruited].sort(
      (a, b) =>
        Number(a.id === this.anchorId) - Number(b.id === this.anchorId) ||
        a.health - b.health ||
        a.id.localeCompare(b.id),
    );
    const sacrificed = new Set(sacrificeOrder.slice(0, sacrificeCount).map((unit) => unit.id));

    for (const unit of recruited) {
      if (sacrificed.has(unit.id)) {
        unit.alive = false;
        unit.health = 0;
        unit.recruited = false;
        unit.intent = 'dead';
        unit.velocity = vec();
        unit.lastHits.clear();
        this.emittedDeaths.add(unit.id);
      } else {
        unit.faction = selectedFaction;
        unit.recruited = true;
        unit.intent = 'player';
        unit.targetId = undefined;
        unit.aiMemory = { nextDecisionAtMs: this.simulationMs, sequence: 0 };
        unit.lastHits.clear();
        unit.swarmOffsetAssigned = false;
      }
      this.spawnShrineParticles(unit, selectedFaction);
    }

    this.playerFaction = selectedFaction;
    for (const unit of this.units) {
      if (!unit.alive || unit.faction === selectedFaction) continue;
      unit.recruited = false;
      if (unit.intent === 'player') unit.intent = 'wander';
      unit.targetId = undefined;
      unit.aiMemory = { nextDecisionAtMs: this.simulationMs, sequence: 0 };
    }
    this.shrine.usesRemaining = Math.max(0, this.shrine.usesRemaining - 1);
    this.shrine.status = this.shrine.usesRemaining > 0 ? 'available' : 'used';
    this.shrine.channelProgressMs = 0;
    this.shrine.movementPenaltyRemainingMs = GAME_CONFIG.shrine.postTransformPenaltyMs;
    this.shrine.transformationEffectRemainingMs = GAME_CONFIG.shrine.effectLifetimeMs;
    this.transferAnchorIfNeeded();
    for (const unit of this.units.filter((candidate) => candidate.alive && candidate.recruited))
      this.assignSwarmOffset(unit);
    this.playerTarget = this.swarmCenter();
  }

  private spawnShrineParticles(unit: Unit, faction: Faction): void {
    for (let index = 0; index < GAME_CONFIG.shrine.effectParticleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / GAME_CONFIG.shrine.effectParticleCount;
      this.particles.push({
        id: `${unit.id}-shrine-${this.simulationMs}-${index}`,
        faction,
        position: { ...unit.position },
        velocity: {
          x: Math.cos(angle) * GAME_CONFIG.shrine.effectParticleSpeed,
          y: Math.sin(angle) * GAME_CONFIG.shrine.effectParticleSpeed,
        },
        remainingMs: GAME_CONFIG.shrine.effectLifetimeMs,
        lifetimeMs: GAME_CONFIG.shrine.effectLifetimeMs,
        effect: 'shrine',
      });
    }
  }

  private spawnDashParticles(direction: Vector): void {
    const center = this.swarmCenter();
    const baseAngle = Math.atan2(-direction.y, -direction.x);
    for (let index = 0; index < GAME_CONFIG.dash.particleCount; index += 1) {
      const spread =
        GAME_CONFIG.dash.particleCount === 1
          ? 0
          : (index / (GAME_CONFIG.dash.particleCount - 1) - 0.5) * 1.2;
      const angle = baseAngle + spread;
      this.particles.push({
        id: `dash-${this.simulationMs}-${index}`,
        faction: this.playerFaction,
        position: { ...center },
        velocity: {
          x: Math.cos(angle) * GAME_CONFIG.dash.particleSpeed,
          y: Math.sin(angle) * GAME_CONFIG.dash.particleSpeed,
        },
        remainingMs: GAME_CONFIG.dash.particleLifetimeMs,
        lifetimeMs: GAME_CONFIG.dash.particleLifetimeMs,
        effect: 'dash',
      });
    }
  }
}
