import { FACTIONS, type Faction } from '../config/factions';
import { GAME_CONFIG, type ShrineConfig } from '../config/gameConfig';
import { UNIT_FRAME_CONTRACT } from '../config/unitSpriteManifest';
import { getMapDefinition, type MapDefinition, type MapId } from '../maps/maps';
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
import {
  applyPlayerMotionPassives,
  applySwarmResponsePassive,
  applySwarmSpreadPassive,
} from '../systems/factionPassives';
import { recruitNearbyFaction } from '../systems/recruitment';
import { calculateRecruitmentRadius } from '../systems/recruitmentRadius';
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
import { terrainMovementModifiers } from '../systems/terrain';
import {
  hitEffectProfile,
  resolveVisualSettings,
  type HitEffectProfile,
  type VisualSettings,
} from '../systems/gameFeel';
import { ParticlePool } from '../systems/particlePool';

export type MatchStatus = 'active' | 'paused' | 'victory' | 'defeat';
export interface ShrineSnapshot {
  status: ShrineStatus;
  selectedFaction?: Faction;
  channelProgressMs: number;
  channelDurationMs: number;
  usesRemaining: number;
  movementPenaltyRemainingMs: number;
  transformationEffectRemainingMs: number;
  cancelledFeedbackRemainingMs: number;
  inRange: boolean;
  canActivate: boolean;
  sacrificePreview: number;
  minimumRecruitedUnits: number;
}

export interface GameSnapshot {
  status: MatchStatus;
  mapId: MapId;
  playerFaction: Faction;
  counts: Record<Faction, number>;
  elapsedMs: number;
  recruitedCount: number;
  anchorId?: string;
  swarmCenter: Vector;
  shrine: ShrineSnapshot;
  dash: DashSnapshot;
}

export type GameEffectEvent =
  | {
      id: string;
      kind: 'recruitment';
      faction: Faction;
      position: Vector;
      unitId: string;
      soundHook: 'unit-recruited';
    }
  | {
      id: string;
      kind: 'hit';
      faction: Faction;
      position: Vector;
      unitId: string;
      profile: 'advantage' | 'disadvantage';
      shakeStrength: number;
      soundHook: 'advantage-hit' | 'disadvantage-hit';
    }
  | {
      id: string;
      kind: 'clash';
      faction: Faction;
      position: Vector;
      shakeStrength: number;
    }
  | {
      id: string;
      kind: 'shrine-transformation';
      faction: Faction;
      position: Vector;
      soundHook: 'shrine-transformation';
    };
type GameEffectEventInput = GameEffectEvent extends infer Event
  ? Event extends GameEffectEvent
    ? Omit<Event, 'id'>
    : never
  : never;

export interface SimulationOptions {
  shrine?: Partial<ShrineConfig>;
  mapId?: MapId;
  visualSettings?: Partial<VisualSettings>;
}

function idAngle(id: string, timeMs: number): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return (hash % 628) / 100 + Math.floor(timeMs / 1600) * 0.73;
}

export class Simulation {
  units: Unit[] = [];
  elapsedMs = 0;
  status: MatchStatus = 'active';
  playerFaction: Faction = 'rock';
  anchorId?: string;
  shrine!: ShrineState;
  hitPauseRemainingMs = 0;
  private seed: number;
  private emittedDeaths = new Set<string>();
  private readonly particlePool = new ParticlePool(GAME_CONFIG.visuals.particles.maximumActive);
  private effectEvents: GameEffectEvent[] = [];
  private effectSequence = 0;
  private accumulatorMs = 0;
  private simulationMs = 0;
  private playerTarget = vec();
  private playerTargetAnchorId?: string;
  private readonly dash = new DashSystem(GAME_CONFIG.dash);
  private readonly shrineConfig: ShrineConfig;
  readonly visualSettings: VisualSettings;
  readonly map: MapDefinition;

  constructor(seed = 1, options: SimulationOptions = {}) {
    this.seed = seed;
    this.map = getMapDefinition(options.mapId ?? 'meadow');
    this.shrineConfig = { ...GAME_CONFIG.shrine, ...options.shrine };
    this.visualSettings = resolveVisualSettings(options.visualSettings);
    this.restart(seed);
  }

  get particles(): Particle[] {
    return this.particlePool.active;
  }

  restart(seed = this.seed): void {
    this.seed = seed;
    this.units = createInitialUnits(seed, this.map);
    this.particlePool.clear();
    this.effectEvents = [];
    this.effectSequence = 0;
    this.hitPauseRemainingMs = 0;
    this.elapsedMs = 0;
    this.accumulatorMs = 0;
    this.simulationMs = 0;
    this.status = 'active';
    this.playerFaction = 'rock';
    this.shrine = createShrineState(this.shrineConfig);
    this.dash.reset();
    this.refreshDashCooldownModifiers();
    this.anchorId = this.units.find((unit) => unit.recruited)?.id;
    this.playerTarget = this.units.find((unit) => unit.id === this.anchorId)?.position ?? vec();
    this.playerTargetAnchorId = this.anchorId;
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
    const recruitedCount = this.units.filter(
      (unit) => unit.alive && unit.recruited && unit.faction === this.playerFaction,
    ).length;
    return calculateSwarmSpeedMultiplier(
      recruitedCount,
      GAME_CONFIG.playerMovement.speedBonusPerRecruitedUnit,
      GAME_CONFIG.playerMovement.maximumSwarmSpeedBonus,
    );
  }

  currentRecruitmentRadius(): number {
    const recruitedCount = this.units.filter(
      (unit) => unit.alive && unit.recruited && unit.faction === this.playerFaction,
    ).length;
    return calculateRecruitmentRadius(
      recruitedCount,
      GAME_CONFIG.recruitment.baseRadius,
      GAME_CONFIG.recruitment.radiusBonusPerUnit,
      GAME_CONFIG.recruitment.maximumRadiusBonus,
    );
  }

  currentEffectiveSwarmSpeed(): number {
    return (
      GAME_CONFIG.playerMovement.baseSpeed *
      this.currentSwarmSpeedMultiplier() *
      this.playerMovementMultiplier() *
      this.dash.movementMultiplier()
    );
  }

  requestDash(input: Vector): boolean {
    this.refreshDashCooldownModifiers();
    const started = this.dash.request(input, this.status === 'active');
    if (started) this.spawnDashParticles(this.dash.snapshot().direction);
    return started;
  }

  update(deltaMs: number, input: Vector, interactionHeld = false): void {
    if (this.status !== 'active') return;
    this.dash.observeInput(input);
    let acceptedMs = Math.min(Math.max(deltaMs, 0), GAME_CONFIG.simulation.maxFrameMs);
    if (this.hitPauseRemainingMs > 0) {
      const pausedMs = Math.min(acceptedMs, this.hitPauseRemainingMs);
      this.hitPauseRemainingMs -= pausedMs;
      acceptedMs -= pausedMs;
      if (acceptedMs <= 0) return;
    }
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
    this.updateVisualTimers(acceptedMs);
    this.transferAnchorIfNeeded();
    this.evaluateResult();
  }

  private step(stepMs: number, input: Vector, interactionHeld: boolean): void {
    if (this.anchorId !== this.playerTargetAnchorId) {
      const anchor = this.units.find((unit) => unit.alive && unit.id === this.anchorId);
      if (anchor) this.playerTarget = { ...anchor.position };
      this.playerTargetAnchorId = this.anchorId;
    }
    this.refreshDashCooldownModifiers();
    tickShrineEffects(this.shrine, stepMs);
    const joined = recruitNearbyFaction(this.units, this.playerFaction);
    for (const id of joined) {
      const unit = this.units.find((candidate) => candidate.id === id);
      if (unit) {
        this.assignSwarmOffset(unit);
        unit.recruitEffectRemainingMs = GAME_CONFIG.visuals.animation.recruitmentEffectMs;
        this.emitEffect({
          kind: 'recruitment',
          faction: unit.faction,
          position: { ...unit.position },
          unitId: unit.id,
          soundHook: 'unit-recruited',
        });
        this.spawnBurstParticles(
          unit.position,
          unit.faction,
          'recruitment',
          GAME_CONFIG.visuals.particles.recruitmentCount,
          58,
        );
      }
    }
    const swarm = this.units.filter((unit) => unit.alive && unit.recruited);
    const swarmCenter = average(swarm.map((unit) => unit.position));
    const preChannelContext = {
      interactionHeld,
      inRange: this.isSwarmInsideShrine(swarm),
      recruitedCount: swarm.length,
      playerFaction: this.playerFaction,
    };
    if (canChannelShrine(this.shrine, preChannelContext, this.shrineConfig)) {
      this.shrine.status = 'channeling';
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
      let movementMotion = unit.motion;
      let idleFormationCorrection = false;
      if (unit.knockbackRemainingMs > 0) {
        unit.knockbackRemainingMs = Math.max(0, unit.knockbackRemainingMs - stepMs);
        desired = normalize(unit.knockback);
        maximumSpeed = Math.max(maximumSpeed, magnitude(unit.knockback));
      } else if (unit.recruited) {
        if (!unit.swarmOffsetAssigned) this.assignSwarmOffset(unit);
        unit.intent = 'player';
        const passive = GAME_CONFIG.factionPassives[unit.faction];
        movementMotion = applyPlayerMotionPassives(
          unit.motion,
          GAME_CONFIG.playerMovement,
          passive,
        );
        maximumSpeed = effectiveSwarmSpeed;
        const slot = add(this.playerTarget, unit.swarmOffset);
        const toSlot = subtract(slot, unit.position);
        const slotPull =
          magnitude(toSlot) > GAME_CONFIG.swarm.arrivalRadius
            ? scale(
                normalize(toSlot),
                applySwarmResponsePassive(GAME_CONFIG.swarm.cohesion, passive),
              )
            : vec();
        desired = add(scale(playerDirection, GAME_CONFIG.swarm.maxInputSpeed), slotPull);
        if (distance(unit.position, swarmCenter) > GAME_CONFIG.swarm.maxDistance)
          desired = add(
            desired,
            scale(
              normalize(subtract(swarmCenter, unit.position)),
              applySwarmResponsePassive(GAME_CONFIG.swarm.returnStrength, passive),
            ),
          );
        idleFormationCorrection = !playerIsMoving;
      } else {
        const decision = updateAiSteering(unit, this.units, this.simulationMs, this.seed);
        unit.intent = decision.intent;
        unit.targetId = decision.targetId;
        desired = decision.direction;
        if (decision.intent === 'chase') maximumSpeed *= unit.motion.chaseSpeedMultiplier;
        if (decision.intent === 'flee') maximumSpeed *= unit.motion.fleeSpeedMultiplier;
      }
      desired = add(desired, this.separationFor(unit));
      desired = add(desired, this.treeAvoidanceFor(unit, desired));
      if (unit.knockbackRemainingMs <= 0) {
        const terrain = terrainMovementModifiers(this.map, unit.position, unit.faction);
        maximumSpeed *= terrain.speedMultiplier;
        movementMotion = {
          ...movementMotion,
          acceleration: movementMotion.acceleration * terrain.accelerationMultiplier,
        };
      }
      const correctionStrength = Math.min(1, magnitude(desired));
      const targetSpeedScale = idleFormationCorrection
        ? GAME_CONFIG.swarm.idleSpeedMultiplier * correctionStrength * correctionStrength
        : 1;
      unit.velocity = steerVelocity(
        unit.velocity,
        desired,
        maximumSpeed,
        stepMs,
        movementMotion,
        targetSpeedScale,
      );
      this.emitMovementParticles(unit, stepMs);
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
      this.shrineConfig,
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
    for (const [index, obstacle] of this.map.obstacles.entries()) {
      const avoidDistance =
        obstacle.collisionRadius + unit.radius + GAME_CONFIG.visuals.treeCollisionSkin;
      const gap = distance(lookAhead, obstacle.position);
      if (gap < avoidDistance) {
        const proximity = 1 - gap / avoidDistance;
        const away = normalize(subtract(lookAhead, obstacle.position));
        const side = seededValue(this.seed, `${unit.id}:obstacle:${index}`) < 0.5 ? -1 : 1;
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
        applySwarmSpreadPassive(
          GAME_CONFIG.swarm.offsetRadius,
          GAME_CONFIG.factionPassives[unit.faction],
        );
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
    const min =
      this.map.world.padding +
      Math.max(GAME_CONFIG.units.radius, UNIT_FRAME_CONTRACT.boundaryRadius);
    this.playerTarget.x = Math.min(this.map.world.width - min, Math.max(min, this.playerTarget.x));
    this.playerTarget.y = Math.min(this.map.world.height - min, Math.max(min, this.playerTarget.y));
  }

  private constrainUnit(unit: Unit): boolean {
    let collided = false;
    const boundaryRadius = Math.max(unit.radius, UNIT_FRAME_CONTRACT.boundaryRadius);
    const min = this.map.world.padding + boundaryRadius;
    const maxX = this.map.world.width - this.map.world.padding - boundaryRadius;
    const maxY = this.map.world.height - this.map.world.padding - boundaryRadius;
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
    for (const obstacle of this.map.obstacles) {
      const minimum =
        obstacle.collisionRadius + unit.radius + GAME_CONFIG.visuals.treeCollisionSkin;
      const gap = distance(unit.position, obstacle.position);
      if (gap < minimum) {
        collided = true;
        const away =
          gap === 0 ? { x: 1, y: 0 } : normalize(subtract(unit.position, obstacle.position));
        unit.position = add(obstacle.position, scale(away, minimum));
        const inwardSpeed = dot(unit.velocity, away);
        if (inwardSpeed < 0) unit.velocity = subtract(unit.velocity, scale(away, inwardSpeed));
      }
    }
    return collided;
  }

  private resolveCollisions(): boolean {
    let qualifyingPredatorHit = false;
    let frameHitCount = 0;
    let clashPosition = vec();
    let clashFaction: Faction = this.playerFaction;
    for (let i = 0; i < this.units.length; i += 1) {
      const a = this.units[i]!;
      if (!a.alive) continue;
      for (let j = i + 1; j < this.units.length; j += 1) {
        const b = this.units[j]!;
        if (!b.alive || a.faction === b.faction) continue;
        if (distance(a.position, b.position) <= a.radius + b.radius) {
          const result = resolveCombatPair(a, b, this.simulationMs);
          frameHitCount += result.hits.length;
          if (result.hits.length > 0) {
            clashPosition = scale(add(a.position, b.position), 0.5);
            clashFaction = a.faction;
          }
          for (const hit of result.hits) {
            const target = this.units.find((unit) => unit.id === hit.targetId);
            const attacker = this.units.find((unit) => unit.id === hit.attackerId);
            if (target && attacker) {
              const profile = hitEffectProfile(hit.advantaged, this.visualSettings);
              target.flashRemainingMs = profile.flashMs;
              this.hitPauseRemainingMs = Math.max(this.hitPauseRemainingMs, profile.hitPauseMs);
              this.emitEffect({
                kind: 'hit',
                faction: attacker.faction,
                position: { ...target.position },
                unitId: target.id,
                profile: profile.kind,
                shakeStrength: profile.shakeStrength,
                soundHook: hit.advantaged ? 'advantage-hit' : 'disadvantage-hit',
              });
              this.spawnDirectionalHitParticles(target, attacker, profile);
            }
            if (
              target?.recruited &&
              (hit.advantaged || this.shrineConfig.interruptOnDisadvantageDamage) &&
              hit.damage >= this.shrineConfig.highDamageInterruptThreshold
            )
              qualifyingPredatorHit = true;
          }
        }
      }
    }
    if (frameHitCount >= GAME_CONFIG.visuals.combat.largeClashHitCount) {
      this.emitEffect({
        kind: 'clash',
        faction: clashFaction,
        position: clashPosition,
        shakeStrength: this.visualSettings.screenShake
          ? GAME_CONFIG.camera.shakeIntensity * 1.35
          : 0,
      });
    }
    return qualifyingPredatorHit;
  }

  private emitNewDeaths(): void {
    for (const unit of this.units) {
      if (unit.alive || this.emittedDeaths.has(unit.id)) continue;
      this.emittedDeaths.add(unit.id);
      const particleCount = this.scaledParticleCount(GAME_CONFIG.particles.count);
      for (let i = 0; i < particleCount; i += 1) {
        const angle = (Math.PI * 2 * i) / GAME_CONFIG.particles.count + idAngle(unit.id, i * 97);
        this.particlePool.emit({
          id: `${unit.id}-particle-${i}`,
          faction: unit.faction,
          position: { ...unit.position },
          velocity: {
            x: unit.deathVelocity.x + Math.cos(angle) * GAME_CONFIG.particles.speed,
            y: unit.deathVelocity.y + Math.sin(angle) * GAME_CONFIG.particles.speed,
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
    this.particlePool.releaseExpired();
  }

  private transferAnchorIfNeeded(): void {
    const anchor = this.units.find((unit) => unit.id === this.anchorId);
    if (anchor?.alive && anchor.recruited) return;
    const origin = anchor?.position ?? {
      x: this.map.world.width / 2,
      y: this.map.world.height / 2,
    };
    const candidates = this.units.filter(
      (unit) => unit.alive && unit.faction === this.playerFaction,
    );
    const recruitedCandidates = candidates
      .filter((unit) => unit.recruited)
      .sort((a, b) => distance(origin, a.position) - distance(origin, b.position));
    const replacement = recruitedCandidates[0] ?? candidates[0];
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
        unit.deathVelocity = { ...unit.velocity };
        unit.deathTransitionRemainingMs = GAME_CONFIG.visuals.animation.deathTransitionMs;
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
    this.refreshDashCooldownModifiers();
    const recruitedCount = this.units.filter((unit) => unit.alive && unit.recruited).length;
    const inRange = this.isSwarmInsideShrine();
    return {
      status: this.status,
      mapId: this.map.id,
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
        channelDurationMs: this.shrineConfig.channelDurationMs,
        usesRemaining: this.shrine.usesRemaining,
        movementPenaltyRemainingMs: this.shrine.movementPenaltyRemainingMs,
        transformationEffectRemainingMs: this.shrine.transformationEffectRemainingMs,
        cancelledFeedbackRemainingMs: this.shrine.cancelledFeedbackRemainingMs,
        inRange,
        canActivate:
          this.shrine.status !== 'used' &&
          this.shrine.usesRemaining > 0 &&
          inRange &&
          recruitedCount >= this.shrineConfig.minimumRecruitedUnits,
        sacrificePreview:
          this.shrine.status === 'used'
            ? 0
            : calculateShrineSacrificeCount(recruitedCount, this.shrineConfig.sacrificeRatio),
        minimumRecruitedUnits: this.shrineConfig.minimumRecruitedUnits,
      },
      dash: this.dash.snapshot(),
    };
  }

  private isSwarmInsideShrine(recruitedUnits?: readonly Unit[]): boolean {
    const swarm = recruitedUnits ?? this.units.filter((unit) => unit.alive && unit.recruited);
    return (
      swarm.length > 0 &&
      swarm.every(
        (unit) => distance(unit.position, this.map.shrine) <= this.shrineConfig.activationRadius,
      )
    );
  }

  private playerMovementMultiplier(): number {
    if (this.shrine.status === 'channeling') return this.shrineConfig.channelMovementMultiplier;
    if (this.shrine.movementPenaltyRemainingMs > 0)
      return this.shrineConfig.postTransformMovementMultiplier;
    return 1;
  }

  private completeShrineTransformation(): void {
    const selectedFaction = this.shrine.selectedFaction;
    if (!selectedFaction || selectedFaction === this.playerFaction) return;
    const recruited = this.units.filter((unit) => unit.alive && unit.recruited);
    const sacrificeCount = calculateShrineSacrificeCount(
      recruited.length,
      this.shrineConfig.sacrificeRatio,
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
        unit.deathVelocity = { ...unit.velocity };
        unit.deathTransitionRemainingMs = GAME_CONFIG.visuals.animation.deathTransitionMs;
        unit.alive = false;
        unit.health = 0;
        unit.recruited = false;
        unit.intent = 'dead';
        unit.velocity = vec();
        unit.lastHits.clear();
        this.emittedDeaths.add(unit.id);
      } else {
        unit.faction = selectedFaction;
        unit.shrineTransformRemainingMs = GAME_CONFIG.visuals.animation.shrineTransformMs;
        unit.recruited = true;
        unit.intent = 'player';
        unit.targetId = undefined;
        unit.aiMemory = { nextDecisionAtMs: this.simulationMs, sequence: 0 };
        unit.lastHits.clear();
        unit.swarmOffsetAssigned = false;
      }
      this.spawnShrineParticles(unit, selectedFaction, sacrificed.has(unit.id));
    }

    this.playerFaction = selectedFaction;
    this.refreshDashCooldownModifiers();
    for (const unit of this.units) {
      if (!unit.alive || unit.recruited) continue;
      if (unit.intent === 'player') unit.intent = 'wander';
      unit.targetId = undefined;
      unit.aiMemory = { nextDecisionAtMs: this.simulationMs, sequence: 0 };
    }
    this.shrine.usesRemaining = Math.max(0, this.shrine.usesRemaining - 1);
    this.shrine.status = this.shrine.usesRemaining > 0 ? 'available' : 'used';
    this.shrine.channelProgressMs = 0;
    this.shrine.cancelledFeedbackRemainingMs = 0;
    this.shrine.movementPenaltyRemainingMs = this.shrineConfig.postTransformPenaltyMs;
    this.shrine.transformationEffectRemainingMs = this.shrineConfig.effectLifetimeMs;
    this.emitEffect({
      kind: 'shrine-transformation',
      faction: selectedFaction,
      position: { ...this.map.shrine },
      soundHook: 'shrine-transformation',
    });
    this.transferAnchorIfNeeded();
    for (const unit of this.units.filter((candidate) => candidate.alive && candidate.recruited))
      this.assignSwarmOffset(unit);
    this.playerTarget = this.swarmCenter();
  }

  private spawnShrineParticles(unit: Unit, faction: Faction, sacrificed: boolean): void {
    const count = this.scaledParticleCount(this.shrineConfig.effectParticleCount);
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / Math.max(1, count);
      this.particlePool.emit({
        id: `${unit.id}-shrine-${this.simulationMs}-${index}`,
        faction,
        position: { ...unit.position },
        velocity: {
          x: Math.cos(angle) * this.shrineConfig.effectParticleSpeed,
          y: Math.sin(angle) * this.shrineConfig.effectParticleSpeed,
        },
        remainingMs: this.shrineConfig.effectLifetimeMs,
        lifetimeMs: this.shrineConfig.effectLifetimeMs,
        effect: sacrificed ? 'shrine-death' : 'shrine',
      });
    }
  }

  private spawnDashParticles(direction: Vector): void {
    const center = this.swarmCenter();
    const baseAngle = Math.atan2(-direction.y, -direction.x);
    const count = this.scaledParticleCount(GAME_CONFIG.dash.particleCount);
    for (let index = 0; index < count; index += 1) {
      const spread = count === 1 ? 0 : (index / (count - 1) - 0.5) * 1.2;
      const angle = baseAngle + spread;
      this.particlePool.emit({
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

  drainEffectEvents(): GameEffectEvent[] {
    return this.effectEvents.splice(0);
  }

  private emitEffect(event: GameEffectEventInput): void {
    const id = `effect-${this.effectSequence}`;
    this.effectSequence += 1;
    this.effectEvents.push({ id, ...event } as GameEffectEvent);
    if (this.effectEvents.length > 128) this.effectEvents.splice(0, this.effectEvents.length - 128);
  }

  private scaledParticleCount(baseCount: number): number {
    return Math.max(0, Math.round(baseCount * this.visualSettings.particleIntensity));
  }

  private spawnBurstParticles(
    position: Vector,
    faction: Faction,
    effect: Particle['effect'],
    baseCount: number,
    speed: number,
  ): void {
    const count = this.scaledParticleCount(baseCount);
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / Math.max(1, count);
      this.particlePool.emit({
        id: `${effect}-${this.simulationMs}-${this.effectSequence}-${index}`,
        faction,
        position: { ...position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        remainingMs: effect === 'recruitment' ? 360 : 240,
        lifetimeMs: effect === 'recruitment' ? 360 : 240,
        effect,
      });
    }
  }

  private spawnDirectionalHitParticles(
    target: Unit,
    attacker: Unit,
    profile: HitEffectProfile,
  ): void {
    const direction = normalize(subtract(target.position, attacker.position));
    const baseDirection =
      magnitude(direction) > 0
        ? direction
        : magnitude(target.knockback) > 0
          ? normalize(target.knockback)
          : { x: 1, y: 0 };
    const speed = profile.kind === 'advantage' ? 125 : 72;
    for (let index = 0; index < profile.particleCount; index += 1) {
      const spread = (index / Math.max(1, profile.particleCount - 1) - 0.5) * 1.15;
      const angle = Math.atan2(baseDirection.y, baseDirection.x) + spread;
      this.particlePool.emit({
        id: `hit-${profile.kind}-${this.simulationMs}-${target.id}-${index}`,
        faction: attacker.faction,
        position: { ...target.position },
        velocity: {
          x: Math.cos(angle) * speed + target.velocity.x * 0.25,
          y: Math.sin(angle) * speed + target.velocity.y * 0.25,
        },
        remainingMs: profile.kind === 'advantage' ? 310 : 190,
        lifetimeMs: profile.kind === 'advantage' ? 310 : 190,
        effect: profile.kind === 'advantage' ? 'hit-advantage' : 'hit-disadvantage',
      });
    }
    if (attacker.faction === 'scissors' && this.visualSettings.particleIntensity > 0)
      this.particlePool.emit({
        id: `metal-${this.simulationMs}-${target.id}`,
        faction: 'scissors',
        position: { ...target.position },
        velocity: scale(baseDirection, 145),
        remainingMs: 180,
        lifetimeMs: 180,
        effect: 'metal',
      });
  }

  private emitMovementParticles(unit: Unit, stepMs: number): void {
    unit.movementParticleCooldownMs = Math.max(0, unit.movementParticleCooldownMs - stepMs);
    if (
      this.visualSettings.reducedMotion ||
      this.visualSettings.particleIntensity <= 0 ||
      magnitude(unit.velocity) < GAME_CONFIG.visuals.animation.movementThreshold ||
      unit.movementParticleCooldownMs > 0
    )
      return;
    unit.movementParticleCooldownMs = GAME_CONFIG.visuals.particles.movementIntervalMs;
    const count = this.scaledParticleCount(GAME_CONFIG.visuals.particles.movementCount);
    for (let index = 0; index < count; index += 1) {
      this.particlePool.emit({
        id: `movement-${this.simulationMs}-${unit.id}-${index}`,
        faction: unit.faction,
        position: { x: unit.position.x, y: unit.position.y + unit.radius * 0.7 },
        velocity: {
          x: -unit.velocity.x * 0.16 + (index - count / 2) * 5,
          y: -Math.abs(unit.velocity.y) * 0.08 - 8,
        },
        remainingMs: 220,
        lifetimeMs: 220,
        effect: 'movement',
      });
    }
  }

  private updateVisualTimers(deltaMs: number): void {
    for (const unit of this.units) {
      unit.deathTransitionRemainingMs = Math.max(0, unit.deathTransitionRemainingMs - deltaMs);
      unit.recruitEffectRemainingMs = Math.max(0, unit.recruitEffectRemainingMs - deltaMs);
      unit.shrineTransformRemainingMs = Math.max(0, unit.shrineTransformRemainingMs - deltaMs);
    }
  }

  private refreshDashCooldownModifiers(): void {
    this.dash.setCooldownModifiers({
      factionMultiplier: GAME_CONFIG.factionPassives[this.playerFaction].dashCooldownMultiplier,
      difficultyMultiplier: 1,
      temporaryMultiplier: 1,
    });
  }
}
