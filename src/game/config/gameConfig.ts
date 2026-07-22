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
  borderThickness: number;
  unitMarkerSize: number;
  playerMarkerSize: number;
  neutralMarkerAlpha: number;
  viewportBorderThickness: number;
  showTrees: boolean;
  showShrine: boolean;
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
  };
  simulation: { fixedStepMs: number; maxFrameMs: number };
  particles: { count: number; lifetimeMs: number; speed: number };
  camera: { smoothing: number };
  trees: { radius: number; positions: readonly { x: number; y: number }[] };
  landmarks: { shrine: { x: number; y: number } };
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
    cohesion: 0.34,
    separation: 1.1,
    separationRadius: 34,
    maxDistance: 230,
    maxInputSpeed: 1,
    offsetRadius: 52,
    arrivalRadius: 14,
    returnStrength: 2.2,
  },
  simulation: { fixedStepMs: 1000 / 60, maxFrameMs: 1000 },
  particles: { count: 8, lifetimeMs: 650, speed: 55 },
  camera: { smoothing: 0.09 },
  trees: { radius: 34, positions: TREE_POSITIONS },
  landmarks: { shrine: { x: 1440, y: 810 } },
  minimap: {
    enabled: true,
    width: 180,
    maxHeight: 130,
    margin: 12,
    padding: 5,
    backgroundAlpha: 0.75,
    borderThickness: 2,
    unitMarkerSize: 3,
    playerMarkerSize: 5,
    neutralMarkerAlpha: 0.55,
    viewportBorderThickness: 1,
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
  for (const [name, value] of [
    ['minimap.backgroundAlpha', config.minimap.backgroundAlpha],
    ['minimap.neutralMarkerAlpha', config.minimap.neutralMarkerAlpha],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new Error(`${name} must be between 0 and 1.`);
  }
  if (config.minimap.padding * 2 >= config.minimap.width)
    throw new Error('minimap.padding must leave positive drawing width.');
  if (config.minimap.padding * 2 >= config.minimap.maxHeight)
    throw new Error('minimap.padding must leave positive drawing height.');
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
