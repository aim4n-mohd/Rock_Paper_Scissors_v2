export interface GameConfig {
  viewport: { width: number; height: number };
  world: { width: number; height: number; padding: number };
  population: { rock: number; paper: number; scissors: number };
  units: {
    maxHealth: number;
    radius: number;
    speed: number;
    fleeMultiplier: number;
    detectionRadius: number;
    allyRadius: number;
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
    maxDistance: number;
    maxInputSpeed: number;
  };
  particles: { count: number; lifetimeMs: number; speed: number };
  camera: { smoothing: number };
  trees: { radius: number; positions: readonly { x: number; y: number }[] };
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
    speed: 105,
    fleeMultiplier: 1.15,
    detectionRadius: 190,
    allyRadius: 105,
  },
  combat: {
    advantageDamage: 35,
    disadvantageDamage: 8,
    hitCooldownMs: 350,
    knockbackForce: 125,
    knockbackDurationMs: 140,
  },
  recruitment: { radius: 62 },
  swarm: { cohesion: 0.34, separation: 1.1, maxDistance: 230, maxInputSpeed: 1 },
  particles: { count: 8, lifetimeMs: 650, speed: 55 },
  camera: { smoothing: 0.09 },
  trees: { radius: 34, positions: TREE_POSITIONS },
};

export function validateConfig(config: GameConfig): void {
  const positives: [string, number][] = [
    ['units.maxHealth', config.units.maxHealth],
    ['units.radius', config.units.radius],
    ['units.speed', config.units.speed],
    ['combat.hitCooldownMs', config.combat.hitCooldownMs],
    ['recruitment.radius', config.recruitment.radius],
    ['world.width', config.world.width],
    ['world.height', config.world.height],
  ];
  for (const [name, value] of positives) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive.`);
  }
  if (config.combat.advantageDamage <= config.combat.disadvantageDamage) {
    throw new Error('combat.advantageDamage must exceed disadvantageDamage.');
  }
  for (const [faction, count] of Object.entries(config.population)) {
    if (!Number.isInteger(count) || count < 0)
      throw new Error(`population.${faction} must be a non-negative integer.`);
  }
}

validateConfig(GAME_CONFIG);
