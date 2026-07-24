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
  baseSwarmSpeed: number;
  speedBonusPerUnit: number;
  maxSwarmSpeedBonus: number;
}

export interface DashConfig {
  enabled: boolean;
  speedMultiplier: number;
  durationMs: number;
  cooldownMs: number;
  minimumInputMagnitude: number;
  allowWhilePaused: boolean;
  cancelOnCollision: boolean;
  useLastDirection: boolean;
  particleCount: number;
  particleLifetimeMs: number;
  particleSpeed: number;
}

export interface ShrineConfig {
  activationRadius: number;
  channelDurationMs: number;
  minimumRecruitedUnits: number;
  sacrificeRatio: number;
  channelSpeedMultiplier: number;
  postTransformPenaltyMs: number;
  postTransformSpeedMultiplier: number;
  highDamageInterruptThreshold: number;
  maxUses: number;
  effectLifetimeMs: number;
  effectParticleCount: number;
  effectParticleSpeed: number;
  platformRadius: number;
  outerRingRadius: number;
  ringThickness: number;
  symbolOrbitRadius: number;
  symbolSize: number;
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
    knockbackForce: number;
    knockbackDurationMs: number;
  };
  recruitment: { radius: number };
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
  dash: DashConfig;
  simulation: { fixedStepMs: number; maxFrameMs: number };
  particles: { count: number; lifetimeMs: number; speed: number };
  camera: { smoothing: number };
  trees: { radius: number; positions: readonly { x: number; y: number }[] };
  landmarks: { shrine: { x: number; y: number } };
  shrine: ShrineConfig;
  minimap: MinimapConfig;
}

const TREE_POSITIONS = [
  { x: 270, y: 240 },
  { x: 590, y: 180 },
  { x: 910, y: 300 },
  { x: 1280, y: 190 },
  { x: 1650, y: 320 },
  { x: 2050, y: 190 },
  { x: 2470, y: 310 },
  { x: 2670, y: 660 },
  { x: 2310, y: 780 },
  { x: 1980, y: 610 },
  { x: 1650, y: 810 },
  { x: 1320, y: 610 },
  { x: 980, y: 820 },
  { x: 650, y: 650 },
  { x: 250, y: 790 },
  { x: 430, y: 1190 },
  { x: 810, y: 1380 },
  { x: 1180, y: 1170 },
  { x: 1530, y: 1360 },
  { x: 1880, y: 1130 },
  { x: 2250, y: 1370 },
  { x: 2630, y: 1190 },
] as const;

export const GAME_CONFIG: GameConfig = {
  viewport: { width: 960, height: 540 },
  world: { width: 2880, height: 1620, padding: 36 },
  population: { rock: 15, paper: 12, scissors: 16 },
  units: {
    maxHealth: 100,
    radius: 10,
    detectionRadius: 190,
    allyRadius: 105,
    motion: {
      maxSpeed: 112,
      acceleration: 460,
      deceleration: 320,
      drag: 0.55,
      maxSteeringForce: 520,
      maxTurnRate: 3.4,
      decisionIntervalMs: 260,
      reactionDelayMs: 140,
      predictionTimeMs: 240,
      predictionError: 38,
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
    knockbackForce: 125,
    knockbackDurationMs: 140,
  },
  recruitment: { radius: 62 },
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
    baseSwarmSpeed: 112,
    speedBonusPerUnit: 0.02,
    maxSwarmSpeedBonus: 0.45,
  },
  dash: {
    enabled: true,
    speedMultiplier: 3.4,
    durationMs: 720,
    cooldownMs: 2400,
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
  camera: { smoothing: 0.09 },
  trees: { radius: 34, positions: TREE_POSITIONS },
  landmarks: { shrine: { x: 1440, y: 810 } },
  shrine: {
    activationRadius: 115,
    channelDurationMs: 2000,
    minimumRecruitedUnits: 4,
    sacrificeRatio: 0.2,
    channelSpeedMultiplier: 0.24,
    postTransformPenaltyMs: 3000,
    postTransformSpeedMultiplier: 0.55,
    highDamageInterruptThreshold: 35,
    maxUses: 1,
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
    ['units.motion.fleeSpeedMultiplier', config.units.motion.fleeSpeedMultiplier],
    ['units.motion.obstacleAvoidanceStrength', config.units.motion.obstacleAvoidanceStrength],
    ['units.motion.obstacleLookAhead', config.units.motion.obstacleLookAhead],
    ['units.motion.obstacleSideBias', config.units.motion.obstacleSideBias],
    ['combat.advantageDamage', config.combat.advantageDamage],
    ['combat.disadvantageDamage', config.combat.disadvantageDamage],
    ['combat.hitCooldownMs', config.combat.hitCooldownMs],
    ['combat.knockbackForce', config.combat.knockbackForce],
    ['combat.knockbackDurationMs', config.combat.knockbackDurationMs],
    ['recruitment.radius', config.recruitment.radius],
    ['swarm.cohesion', config.swarm.cohesion],
    ['swarm.separation', config.swarm.separation],
    ['swarm.separationRadius', config.swarm.separationRadius],
    ['swarm.maxDistance', config.swarm.maxDistance],
    ['swarm.maxInputSpeed', config.swarm.maxInputSpeed],
    ['swarm.offsetRadius', config.swarm.offsetRadius],
    ['swarm.arrivalRadius', config.swarm.arrivalRadius],
    ['swarm.returnStrength', config.swarm.returnStrength],
    ['swarm.idleSpeedMultiplier', config.swarm.idleSpeedMultiplier],
    ['playerMovement.baseSwarmSpeed', config.playerMovement.baseSwarmSpeed],
    ['dash.speedMultiplier', config.dash.speedMultiplier],
    ['dash.durationMs', config.dash.durationMs],
    ['dash.cooldownMs', config.dash.cooldownMs],
    ['dash.particleLifetimeMs', config.dash.particleLifetimeMs],
    ['dash.particleSpeed', config.dash.particleSpeed],
    ['simulation.fixedStepMs', config.simulation.fixedStepMs],
    ['simulation.maxFrameMs', config.simulation.maxFrameMs],
    ['particles.lifetimeMs', config.particles.lifetimeMs],
    ['particles.speed', config.particles.speed],
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
    ['shrine.channelSpeedMultiplier', config.shrine.channelSpeedMultiplier],
    ['shrine.postTransformPenaltyMs', config.shrine.postTransformPenaltyMs],
    ['shrine.postTransformSpeedMultiplier', config.shrine.postTransformSpeedMultiplier],
    ['shrine.highDamageInterruptThreshold', config.shrine.highDamageInterruptThreshold],
    ['shrine.maxUses', config.shrine.maxUses],
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
    !Number.isFinite(config.dash.minimumInputMagnitude) ||
    config.dash.minimumInputMagnitude < 0 ||
    config.dash.minimumInputMagnitude > 1
  )
    throw new Error('dash.minimumInputMagnitude must be between 0 and 1.');
  if (!Number.isInteger(config.dash.particleCount) || config.dash.particleCount <= 0)
    throw new Error('dash.particleCount must be a positive integer.');
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
    ['playerMovement.speedBonusPerUnit', config.playerMovement.speedBonusPerUnit],
    ['playerMovement.maxSwarmSpeedBonus', config.playerMovement.maxSwarmSpeedBonus],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be non-negative.`);
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
    ['shrine.channelSpeedMultiplier', config.shrine.channelSpeedMultiplier],
    ['shrine.postTransformSpeedMultiplier', config.shrine.postTransformSpeedMultiplier],
  ] as const) {
    if (value > 1) throw new Error(`${name} must be at most 1.`);
  }
  for (const [name, value] of [
    ['shrine.minimumRecruitedUnits', config.shrine.minimumRecruitedUnits],
    ['shrine.maxUses', config.shrine.maxUses],
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
  if (
    !Number.isFinite(config.camera.smoothing) ||
    config.camera.smoothing <= 0 ||
    config.camera.smoothing > 1
  )
    throw new Error('camera.smoothing must be greater than 0 and at most 1.');
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
