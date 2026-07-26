import { FACTIONS, type Faction } from './factions';
import { getMapDefinition } from '../maps/maps';

export interface UnitMotionConfig {
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  drag: number;
  maxSteeringForce: number;
  maxTurnRate: number;
  decisionIntervalMs: number;
  reactionDelayMs: number;
  predictionTimeMs: number;
  predictionError: number;
  chaseSpeedMultiplier: number;
  fleeSpeedMultiplier: number;
  obstacleAvoidanceStrength: number;
  obstacleLookAhead: number;
  obstacleSideBias: number;
}

export interface MinimapConfig {
  enabled: boolean;
  width: number;
  maxHeight: number;
  margin: number;
  padding: number;
  backgroundAlpha: number;
  borderAlpha: number;
  terrainAlpha: number;
  unitMarkerAlpha: number;
  viewportAlpha: number;
  borderThickness: number;
  unitMarkerSize: number;
  playerMarkerSize: number;
  neutralMarkerAlpha: number;
  viewportBorderThickness: number;
  dashBarHeight: number;
  dashBarGap: number;
  dashLabelGap: number;
  dashLabelFontSize: number;
  showTrees: boolean;
  showShrine: boolean;
}

export interface PlayerMovementConfig {
  baseSpeed: number;
  acceleration: number;
  deceleration: number;
  steeringResponsiveness: number;
  speedBonusPerRecruitedUnit: number;
  maximumSwarmSpeedBonus: number;
}

export interface FactionPassiveConfig {
  accelerationMultiplier: number;
  decelerationMultiplier: number;
  turnRateMultiplier: number;
  swarmSpreadMultiplier: number;
  swarmResponseMultiplier: number;
  dashCooldownMultiplier: number;
  outgoingKnockbackMultiplier: number;
  incomingKnockbackMultiplier: number;
}

export interface DashConfig {
  enabled: boolean;
  speedMultiplier: number;
  durationMs: number;
  accelerationInMs: number;
  decelerationOutMs: number;
  baseCooldownMs: number;
  minimumInputMagnitude: number;
  allowWhilePaused: boolean;
  cancelOnCollision: boolean;
  useLastDirection: boolean;
  particleCount: number;
  particleLifetimeMs: number;
  particleSpeed: number;
}

export interface ShrineConfig {
  enabled: boolean;
  activationRadius: number;
  channelDurationMs: number;
  minimumRecruitedUnits: number;
  sacrificeRatio: number;
  channelMovementMultiplier: number;
  postTransformPenaltyMs: number;
  postTransformMovementMultiplier: number;
  highDamageInterruptThreshold: number;
  interruptOnDisadvantageDamage: boolean;
  usesPerMatch: number;
  cancelledFeedbackMs: number;
  effectLifetimeMs: number;
  effectParticleCount: number;
  effectParticleSpeed: number;
  platformRadius: number;
  outerRingRadius: number;
  ringThickness: number;
  symbolOrbitRadius: number;
  symbolSize: number;
}

export interface VisualsConfig {
  treeCollisionSkin: number;
  animation: {
    movementThreshold: number;
    deathTransitionMs: number;
    recruitmentEffectMs: number;
    shrineTransformMs: number;
  };
  particles: {
    maximumActive: number;
    movementIntervalMs: number;
    movementCount: number;
    recruitmentCount: number;
    disadvantageHitCount: number;
    advantageHitCount: number;
  };
  combat: {
    disadvantageFlashMs: number;
    advantageFlashMs: number;
    disadvantageHitPauseMs: number;
    advantageHitPauseMs: number;
    largeClashHitCount: number;
  };
}

export interface GameConfig {
  viewport: { width: number; height: number };
  world: { width: number; height: number; padding: number };
  population: { rock: number; paper: number; scissors: number };
  units: {
    maxHealth: number;
    radius: number;
    detectionRadius: number;
    allyRadius: number;
    motion: UnitMotionConfig;
  };
  combat: {
    advantageDamage: number;
    disadvantageDamage: number;
    hitCooldownMs: number;
    baseKnockbackForce: number;
    knockbackDurationMs: number;
  };
  recruitment: {
    baseRadius: number;
    radiusBonusPerUnit: number;
    maximumRadiusBonus: number;
  };
  swarm: {
    cohesion: number;
    separation: number;
    separationRadius: number;
    maxDistance: number;
    maxInputSpeed: number;
    offsetRadius: number;
    arrivalRadius: number;
    returnStrength: number;
    idleSpeedMultiplier: number;
  };
  playerMovement: PlayerMovementConfig;
  terrain: {
    mud: {
      speedMultiplier: number;
      accelerationMultiplier: number;
      rockResistance: number;
    };
  };
  factionPassives: Record<Faction, FactionPassiveConfig>;
  dash: DashConfig;
  simulation: { fixedStepMs: number; maxFrameMs: number };
  particles: { count: number; lifetimeMs: number; speed: number };
  camera: {
    smoothing: number;
    minimumSmoothing: number;
    velocityLagStrength: number;
    screenMargin: number;
    zoomOutStartCount: number;
    zoomOutFullCount: number;
    minimumZoom: number;
    zoomSmoothing: number;
    shakeDurationMs: number;
    shakeIntensity: number;
  };
  visuals: VisualsConfig;
  trees: { radius: number; positions: readonly { x: number; y: number }[] };
  landmarks: { shrine: { x: number; y: number } };
  shrine: ShrineConfig;
  minimap: MinimapConfig;
}

const DEFAULT_MAP = getMapDefinition('meadow');
const DEFAULT_TREES = DEFAULT_MAP.obstacles.filter((obstacle) => obstacle.kind === 'tree');

export const GAME_CONFIG: GameConfig = {
  viewport: { width: 960, height: 540 },
  world: { ...DEFAULT_MAP.world },
  population: { rock: 15, paper: 12, scissors: 16 },
  units: {
    maxHealth: 100,
    radius: 10,
    detectionRadius: 215,
    allyRadius: 105,
    motion: {
      maxSpeed: 112,
      acceleration: 460,
      deceleration: 320,
      drag: 0.55,
      maxSteeringForce: 520,
      maxTurnRate: 3.4,
      decisionIntervalMs: 225,
      reactionDelayMs: 110,
      predictionTimeMs: 240,
      predictionError: 38,
      chaseSpeedMultiplier: 1.08,
      fleeSpeedMultiplier: 1.12,
      obstacleAvoidanceStrength: 4.6,
      obstacleLookAhead: 62,
      obstacleSideBias: 0.72,
    },
  },
  combat: {
    advantageDamage: 35,
    disadvantageDamage: 8,
    hitCooldownMs: 350,
    baseKnockbackForce: 180,
    knockbackDurationMs: 180,
  },
  recruitment: {
    baseRadius: 55,
    radiusBonusPerUnit: 3,
    maximumRadiusBonus: 75,
  },
  swarm: {
    cohesion: 0.46,
    separation: 1.1,
    separationRadius: 30,
    maxDistance: 170,
    maxInputSpeed: 1,
    offsetRadius: 38,
    arrivalRadius: 10,
    returnStrength: 2.8,
    idleSpeedMultiplier: 0.45,
  },
  playerMovement: {
    baseSpeed: 120,
    acceleration: 720,
    deceleration: 820,
    steeringResponsiveness: 1.2,
    speedBonusPerRecruitedUnit: 0.03,
    maximumSwarmSpeedBonus: 0.5,
  },
  terrain: {
    mud: {
      speedMultiplier: 0.62,
      accelerationMultiplier: 0.55,
      rockResistance: 0.18,
    },
  },
  factionPassives: {
    rock: {
      accelerationMultiplier: 0.9,
      decelerationMultiplier: 0.82,
      turnRateMultiplier: 1,
      swarmSpreadMultiplier: 1,
      swarmResponseMultiplier: 1,
      dashCooldownMultiplier: 1,
      outgoingKnockbackMultiplier: 1.25,
      incomingKnockbackMultiplier: 0.7,
    },
    paper: {
      accelerationMultiplier: 1.2,
      decelerationMultiplier: 1,
      turnRateMultiplier: 1,
      swarmSpreadMultiplier: 1.15,
      swarmResponseMultiplier: 1,
      dashCooldownMultiplier: 1,
      outgoingKnockbackMultiplier: 1,
      incomingKnockbackMultiplier: 1,
    },
    scissors: {
      accelerationMultiplier: 1,
      decelerationMultiplier: 1,
      turnRateMultiplier: 1.25,
      swarmSpreadMultiplier: 0.9,
      swarmResponseMultiplier: 1.1,
      dashCooldownMultiplier: 0.75,
      outgoingKnockbackMultiplier: 1,
      incomingKnockbackMultiplier: 1,
    },
  },
  dash: {
    enabled: true,
    speedMultiplier: 1.9,
    durationMs: 220,
    accelerationInMs: 45,
    decelerationOutMs: 80,
    baseCooldownMs: 1200,
    minimumInputMagnitude: 0.1,
    allowWhilePaused: false,
    cancelOnCollision: false,
    useLastDirection: true,
    particleCount: 5,
    particleLifetimeMs: 240,
    particleSpeed: 45,
  },
  simulation: { fixedStepMs: 1000 / 60, maxFrameMs: 1000 },
  particles: { count: 8, lifetimeMs: 650, speed: 55 },
  camera: {
    smoothing: 0.09,
    minimumSmoothing: 0.045,
    velocityLagStrength: 0.36,
    screenMargin: 24,
    zoomOutStartCount: 8,
    zoomOutFullCount: 28,
    minimumZoom: 0.82,
    zoomSmoothing: 0.035,
    shakeDurationMs: 90,
    shakeIntensity: 0.0025,
  },
  visuals: {
    treeCollisionSkin: 3,
    animation: {
      movementThreshold: 8,
      deathTransitionMs: 260,
      recruitmentEffectMs: 420,
      shrineTransformMs: 900,
    },
    particles: {
      maximumActive: 240,
      movementIntervalMs: 110,
      movementCount: 1,
      recruitmentCount: 6,
      disadvantageHitCount: 3,
      advantageHitCount: 8,
    },
    combat: {
      disadvantageFlashMs: 80,
      advantageFlashMs: 135,
      disadvantageHitPauseMs: 0,
      advantageHitPauseMs: 28,
      largeClashHitCount: 4,
    },
  },
  trees: {
    radius: DEFAULT_TREES[0]?.collisionRadius ?? 42,
    positions: DEFAULT_TREES.map((tree) => tree.position),
  },
  landmarks: { shrine: { ...DEFAULT_MAP.shrine } },
  shrine: {
    enabled: true,
    activationRadius: 90,
    channelDurationMs: 2000,
    minimumRecruitedUnits: 4,
    sacrificeRatio: 0.2,
    channelMovementMultiplier: 0.2,
    postTransformPenaltyMs: 3000,
    postTransformMovementMultiplier: 0.65,
    highDamageInterruptThreshold: 35,
    interruptOnDisadvantageDamage: false,
    usesPerMatch: 1,
    cancelledFeedbackMs: 900,
    effectLifetimeMs: 900,
    effectParticleCount: 8,
    effectParticleSpeed: 90,
    platformRadius: 38,
    outerRingRadius: 52,
    ringThickness: 2,
    symbolOrbitRadius: 27,
    symbolSize: 6,
  },
  minimap: {
    enabled: true,
    width: 180,
    maxHeight: 130,
    margin: 12,
    padding: 5,
    backgroundAlpha: 0.45,
    borderAlpha: 0.8,
    terrainAlpha: 0.5,
    unitMarkerAlpha: 0.9,
    viewportAlpha: 0.9,
    borderThickness: 2,
    unitMarkerSize: 3,
    playerMarkerSize: 5,
    neutralMarkerAlpha: 0.55,
    viewportBorderThickness: 1,
    dashBarHeight: 4,
    dashBarGap: 6,
    dashLabelGap: 2,
    dashLabelFontSize: 9,
    showTrees: true,
    showShrine: true,
  },
};

export function validateConfig(config: GameConfig): void {
  const positives: [string, number][] = [
    ['viewport.width', config.viewport.width],
    ['viewport.height', config.viewport.height],
    ['units.maxHealth', config.units.maxHealth],
    ['units.radius', config.units.radius],
    ['units.detectionRadius', config.units.detectionRadius],
    ['units.allyRadius', config.units.allyRadius],
    ['units.motion.maxSpeed', config.units.motion.maxSpeed],
    ['units.motion.acceleration', config.units.motion.acceleration],
    ['units.motion.deceleration', config.units.motion.deceleration],
    ['units.motion.maxSteeringForce', config.units.motion.maxSteeringForce],
    ['units.motion.maxTurnRate', config.units.motion.maxTurnRate],
    ['units.motion.decisionIntervalMs', config.units.motion.decisionIntervalMs],
    ['units.motion.chaseSpeedMultiplier', config.units.motion.chaseSpeedMultiplier],
    ['units.motion.fleeSpeedMultiplier', config.units.motion.fleeSpeedMultiplier],
    ['units.motion.obstacleAvoidanceStrength', config.units.motion.obstacleAvoidanceStrength],
    ['units.motion.obstacleLookAhead', config.units.motion.obstacleLookAhead],
    ['units.motion.obstacleSideBias', config.units.motion.obstacleSideBias],
    ['combat.advantageDamage', config.combat.advantageDamage],
    ['combat.disadvantageDamage', config.combat.disadvantageDamage],
    ['combat.hitCooldownMs', config.combat.hitCooldownMs],
    ['combat.baseKnockbackForce', config.combat.baseKnockbackForce],
    ['combat.knockbackDurationMs', config.combat.knockbackDurationMs],
    ['recruitment.baseRadius', config.recruitment.baseRadius],
    ['swarm.cohesion', config.swarm.cohesion],
    ['swarm.separation', config.swarm.separation],
    ['swarm.separationRadius', config.swarm.separationRadius],
    ['swarm.maxDistance', config.swarm.maxDistance],
    ['swarm.maxInputSpeed', config.swarm.maxInputSpeed],
    ['swarm.offsetRadius', config.swarm.offsetRadius],
    ['swarm.arrivalRadius', config.swarm.arrivalRadius],
    ['swarm.returnStrength', config.swarm.returnStrength],
    ['swarm.idleSpeedMultiplier', config.swarm.idleSpeedMultiplier],
    ['playerMovement.baseSpeed', config.playerMovement.baseSpeed],
    ['playerMovement.acceleration', config.playerMovement.acceleration],
    ['playerMovement.deceleration', config.playerMovement.deceleration],
    ['playerMovement.steeringResponsiveness', config.playerMovement.steeringResponsiveness],
    ['terrain.mud.speedMultiplier', config.terrain.mud.speedMultiplier],
    ['terrain.mud.accelerationMultiplier', config.terrain.mud.accelerationMultiplier],
    ['dash.speedMultiplier', config.dash.speedMultiplier],
    ['dash.durationMs', config.dash.durationMs],
    ['dash.baseCooldownMs', config.dash.baseCooldownMs],
    ['dash.particleLifetimeMs', config.dash.particleLifetimeMs],
    ['dash.particleSpeed', config.dash.particleSpeed],
    ['simulation.fixedStepMs', config.simulation.fixedStepMs],
    ['simulation.maxFrameMs', config.simulation.maxFrameMs],
    ['particles.lifetimeMs', config.particles.lifetimeMs],
    ['particles.speed', config.particles.speed],
    ['camera.minimumSmoothing', config.camera.minimumSmoothing],
    ['camera.screenMargin', config.camera.screenMargin],
    ['camera.zoomOutStartCount', config.camera.zoomOutStartCount],
    ['camera.zoomOutFullCount', config.camera.zoomOutFullCount],
    ['camera.minimumZoom', config.camera.minimumZoom],
    ['camera.zoomSmoothing', config.camera.zoomSmoothing],
    ['camera.shakeDurationMs', config.camera.shakeDurationMs],
    ['camera.shakeIntensity', config.camera.shakeIntensity],
    ['visuals.animation.movementThreshold', config.visuals.animation.movementThreshold],
    ['visuals.animation.deathTransitionMs', config.visuals.animation.deathTransitionMs],
    ['visuals.animation.recruitmentEffectMs', config.visuals.animation.recruitmentEffectMs],
    ['visuals.animation.shrineTransformMs', config.visuals.animation.shrineTransformMs],
    ['visuals.particles.movementIntervalMs', config.visuals.particles.movementIntervalMs],
    ['visuals.combat.advantageFlashMs', config.visuals.combat.advantageFlashMs],
    ['visuals.combat.advantageHitPauseMs', config.visuals.combat.advantageHitPauseMs],
    ['trees.radius', config.trees.radius],
    ['world.width', config.world.width],
    ['world.height', config.world.height],
    ['minimap.width', config.minimap.width],
    ['minimap.maxHeight', config.minimap.maxHeight],
    ['minimap.borderThickness', config.minimap.borderThickness],
    ['minimap.unitMarkerSize', config.minimap.unitMarkerSize],
    ['minimap.playerMarkerSize', config.minimap.playerMarkerSize],
    ['minimap.viewportBorderThickness', config.minimap.viewportBorderThickness],
    ['minimap.dashBarHeight', config.minimap.dashBarHeight],
    ['minimap.dashBarGap', config.minimap.dashBarGap],
    ['minimap.dashLabelGap', config.minimap.dashLabelGap],
    ['minimap.dashLabelFontSize', config.minimap.dashLabelFontSize],
    ['shrine.activationRadius', config.shrine.activationRadius],
    ['shrine.channelDurationMs', config.shrine.channelDurationMs],
    ['shrine.minimumRecruitedUnits', config.shrine.minimumRecruitedUnits],
    ['shrine.channelMovementMultiplier', config.shrine.channelMovementMultiplier],
    ['shrine.postTransformPenaltyMs', config.shrine.postTransformPenaltyMs],
    ['shrine.postTransformMovementMultiplier', config.shrine.postTransformMovementMultiplier],
    ['shrine.highDamageInterruptThreshold', config.shrine.highDamageInterruptThreshold],
    ['shrine.usesPerMatch', config.shrine.usesPerMatch],
    ['shrine.cancelledFeedbackMs', config.shrine.cancelledFeedbackMs],
    ['shrine.effectLifetimeMs', config.shrine.effectLifetimeMs],
    ['shrine.effectParticleCount', config.shrine.effectParticleCount],
    ['shrine.effectParticleSpeed', config.shrine.effectParticleSpeed],
    ['shrine.platformRadius', config.shrine.platformRadius],
    ['shrine.outerRingRadius', config.shrine.outerRingRadius],
    ['shrine.ringThickness', config.shrine.ringThickness],
    ['shrine.symbolOrbitRadius', config.shrine.symbolOrbitRadius],
    ['shrine.symbolSize', config.shrine.symbolSize],
  ];
  for (const [name, value] of positives) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive.`);
  }
  if (!Number.isFinite(config.world.padding) || config.world.padding < 0)
    throw new Error('world.padding must be non-negative.');
  for (const [name, value] of [
    ['minimap.margin', config.minimap.margin],
    ['minimap.padding', config.minimap.padding],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be non-negative.`);
  }
  if (
    !Number.isFinite(config.terrain.mud.rockResistance) ||
    config.terrain.mud.rockResistance < 0 ||
    config.terrain.mud.rockResistance > 1
  )
    throw new Error('terrain.mud.rockResistance must be between 0 and 1.');
  if (
    !Number.isFinite(config.dash.minimumInputMagnitude) ||
    config.dash.minimumInputMagnitude < 0 ||
    config.dash.minimumInputMagnitude > 1
  )
    throw new Error('dash.minimumInputMagnitude must be between 0 and 1.');
  if (!Number.isInteger(config.dash.particleCount) || config.dash.particleCount <= 0)
    throw new Error('dash.particleCount must be a positive integer.');
  for (const [name, value] of [
    ['dash.accelerationInMs', config.dash.accelerationInMs],
    ['dash.decelerationOutMs', config.dash.decelerationOutMs],
    ['recruitment.radiusBonusPerUnit', config.recruitment.radiusBonusPerUnit],
    ['recruitment.maximumRadiusBonus', config.recruitment.maximumRadiusBonus],
    ['camera.velocityLagStrength', config.camera.velocityLagStrength],
    ['visuals.treeCollisionSkin', config.visuals.treeCollisionSkin],
    ['visuals.combat.disadvantageFlashMs', config.visuals.combat.disadvantageFlashMs],
    ['visuals.combat.disadvantageHitPauseMs', config.visuals.combat.disadvantageHitPauseMs],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be non-negative.`);
  }
  if (config.dash.accelerationInMs + config.dash.decelerationOutMs > config.dash.durationMs)
    throw new Error('dash easing durations must not exceed durationMs.');
  for (const [name, value] of [
    ['minimap.backgroundAlpha', config.minimap.backgroundAlpha],
    ['minimap.borderAlpha', config.minimap.borderAlpha],
    ['minimap.terrainAlpha', config.minimap.terrainAlpha],
    ['minimap.unitMarkerAlpha', config.minimap.unitMarkerAlpha],
    ['minimap.viewportAlpha', config.minimap.viewportAlpha],
    ['minimap.neutralMarkerAlpha', config.minimap.neutralMarkerAlpha],
  ] as const) {
    if (!Number.isFinite(value)) throw new Error(`${name} must be finite.`);
  }
  for (const [name, value] of [
    ['playerMovement.speedBonusPerRecruitedUnit', config.playerMovement.speedBonusPerRecruitedUnit],
    ['playerMovement.maximumSwarmSpeedBonus', config.playerMovement.maximumSwarmSpeedBonus],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be non-negative.`);
  }
  for (const faction of FACTIONS) {
    if (!config.factionPassives[faction])
      throw new Error(`factionPassives.${faction} must be configured.`);
    for (const [name, value] of Object.entries(config.factionPassives[faction])) {
      if (!Number.isFinite(value) || value <= 0)
        throw new Error(`factionPassives.${faction}.${name} must be positive.`);
    }
  }
  if (config.minimap.padding * 2 >= config.minimap.width)
    throw new Error('minimap.padding must leave positive drawing width.');
  if (config.minimap.padding * 2 >= config.minimap.maxHeight)
    throw new Error('minimap.padding must leave positive drawing height.');
  if (
    !Number.isFinite(config.shrine.sacrificeRatio) ||
    config.shrine.sacrificeRatio <= 0 ||
    config.shrine.sacrificeRatio >= 1
  )
    throw new Error('shrine.sacrificeRatio must be greater than 0 and less than 1.');
  for (const [name, value] of [
    ['shrine.channelMovementMultiplier', config.shrine.channelMovementMultiplier],
    ['shrine.postTransformMovementMultiplier', config.shrine.postTransformMovementMultiplier],
  ] as const) {
    if (value > 1) throw new Error(`${name} must be at most 1.`);
  }
  for (const [name, value] of [
    ['shrine.minimumRecruitedUnits', config.shrine.minimumRecruitedUnits],
    ['shrine.usesPerMatch', config.shrine.usesPerMatch],
    ['shrine.effectParticleCount', config.shrine.effectParticleCount],
  ] as const) {
    if (!Number.isInteger(value)) throw new Error(`${name} must be an integer.`);
  }
  if (config.shrine.platformRadius >= config.shrine.outerRingRadius)
    throw new Error('shrine.outerRingRadius must exceed platformRadius.');
  if (
    Math.ceil(config.shrine.minimumRecruitedUnits * config.shrine.sacrificeRatio) >=
    config.shrine.minimumRecruitedUnits
  )
    throw new Error('shrine.sacrificeRatio must leave at least one transformed survivor.');
  for (const [name, value] of [
    ['units.motion.drag', config.units.motion.drag],
    ['units.motion.reactionDelayMs', config.units.motion.reactionDelayMs],
    ['units.motion.predictionTimeMs', config.units.motion.predictionTimeMs],
    ['units.motion.predictionError', config.units.motion.predictionError],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be non-negative.`);
  }
  if (config.units.motion.reactionDelayMs > config.units.motion.decisionIntervalMs)
    throw new Error('units.motion.reactionDelayMs must not exceed decisionIntervalMs.');
  if (config.world.width < config.viewport.width || config.world.height < config.viewport.height)
    throw new Error('world dimensions must be at least as large as the viewport.');
  if (
    config.camera.screenMargin * 2 >= config.viewport.width ||
    config.camera.screenMargin * 2 >= config.viewport.height
  )
    throw new Error('camera.screenMargin must leave a visible camera area.');
  if (
    config.world.padding + config.units.radius >= config.world.width / 2 ||
    config.world.padding + config.units.radius >= config.world.height / 2
  )
    throw new Error('world.padding must leave a playable area for units.');
  if (config.simulation.fixedStepMs > config.simulation.maxFrameMs)
    throw new Error('simulation.fixedStepMs must not exceed simulation.maxFrameMs.');
  if (config.combat.advantageDamage <= config.combat.disadvantageDamage) {
    throw new Error('combat.advantageDamage must exceed disadvantageDamage.');
  }
  for (const [faction, count] of Object.entries(config.population)) {
    if (!Number.isInteger(count) || count < 0)
      throw new Error(`population.${faction} must be a non-negative integer.`);
  }
  if (config.population.rock < 1)
    throw new Error('population.rock must include at least one initial anchor.');
  if (!Number.isInteger(config.particles.count) || config.particles.count <= 0)
    throw new Error('particles.count must be a positive integer.');
  for (const [name, value] of [
    ['visuals.particles.maximumActive', config.visuals.particles.maximumActive],
    ['visuals.particles.movementCount', config.visuals.particles.movementCount],
    ['visuals.particles.recruitmentCount', config.visuals.particles.recruitmentCount],
    ['visuals.particles.disadvantageHitCount', config.visuals.particles.disadvantageHitCount],
    ['visuals.particles.advantageHitCount', config.visuals.particles.advantageHitCount],
    ['visuals.combat.largeClashHitCount', config.visuals.combat.largeClashHitCount],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0)
      throw new Error(`${name} must be a positive integer.`);
  }
  if (
    !Number.isFinite(config.camera.smoothing) ||
    config.camera.smoothing <= 0 ||
    config.camera.smoothing > 1
  )
    throw new Error('camera.smoothing must be greater than 0 and at most 1.');
  if (config.camera.minimumSmoothing > config.camera.smoothing)
    throw new Error('camera.minimumSmoothing must not exceed camera.smoothing.');
  if (config.camera.zoomOutFullCount <= config.camera.zoomOutStartCount)
    throw new Error('camera.zoomOutFullCount must exceed camera.zoomOutStartCount.');
  if (config.camera.minimumZoom > 1) throw new Error('camera.minimumZoom must be at most 1.');
  for (const [index, tree] of config.trees.positions.entries()) {
    const minimum = config.world.padding + config.trees.radius;
    if (
      !Number.isFinite(tree.x) ||
      !Number.isFinite(tree.y) ||
      tree.x < minimum ||
      tree.x > config.world.width - minimum ||
      tree.y < minimum ||
      tree.y > config.world.height - minimum
    )
      throw new Error(`trees.positions[${index}] must be inside the playable boundary.`);
    for (let other = index + 1; other < config.trees.positions.length; other += 1) {
      const candidate = config.trees.positions[other]!;
      if (Math.hypot(candidate.x - tree.x, candidate.y - tree.y) <= config.trees.radius * 2)
        throw new Error(`trees.positions[${index}] must not overlap another tree.`);
    }
  }
  const shrine = config.landmarks.shrine;
  if (
    !Number.isFinite(shrine.x) ||
    !Number.isFinite(shrine.y) ||
    shrine.x < 0 ||
    shrine.y < 0 ||
    shrine.x > config.world.width ||
    shrine.y > config.world.height
  )
    throw new Error('landmarks.shrine must be inside the world boundary.');
}

validateConfig(GAME_CONFIG);
