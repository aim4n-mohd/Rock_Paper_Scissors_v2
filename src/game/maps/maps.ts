import { FACTIONS, type Faction } from '../config/factions';
import { distance, type Vector } from '../math/vector';
import { createSeededRandom } from '../math/random';

export const MAP_IDS = ['meadow', 'forest', 'marsh'] as const;
export type MapId = (typeof MAP_IDS)[number];

export interface MapRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BaseObstacle {
  id: string;
  position: Vector;
  collisionRadius: number;
}

export interface TreeObstacle extends BaseObstacle {
  kind: 'tree';
  trunkRadius: number;
  canopyRadius: number;
  canopyColor: number;
}

export interface PropObstacle extends BaseObstacle {
  kind: 'stone' | 'log';
  visualWidth: number;
  visualHeight: number;
  angle: number;
}

export type MapObstacle = TreeObstacle | PropObstacle;

export interface TerrainRegion extends MapRectangle {
  id: string;
  kind: 'grass' | 'forest-floor' | 'mud' | 'dry-land' | 'water';
  color: number;
  alpha: number;
}

export type DecorationKind =
  | 'grass'
  | 'flower'
  | 'small-stone'
  | 'reeds'
  | 'leaves'
  | 'ground-patch';

export interface DecorativeRegion extends MapRectangle {
  id: string;
  kinds: readonly DecorationKind[];
  count: number;
}

export interface MapDecoration {
  id: string;
  kind: DecorationKind;
  position: Vector;
  rotation: number;
  scale: number;
  collidable: false;
}

export interface MapDefinition {
  id: MapId;
  displayName: string;
  description: string;
  preview: {
    baseColor: number;
    accentColor: number;
    pattern: 'open' | 'canopy' | 'islands';
  };
  world: { width: number; height: number; padding: number };
  cameraBounds: MapRectangle;
  shrine: Vector;
  obstacles: readonly MapObstacle[];
  spawnRegions: Record<Faction, readonly MapRectangle[]>;
  decorativeRegions: readonly DecorativeRegion[];
  terrainRegions: readonly TerrainRegion[];
  populationRecommendation: Record<Faction, number>;
  parCompletionMs: number;
  minimap: {
    groundColor: number;
    terrainColors: Record<TerrainRegion['kind'], number>;
    obstacleColor: number;
    shrineColor: number;
  };
}

function tree(
  id: string,
  x: number,
  y: number,
  trunkRadius = 42,
  canopyRadius = 72,
  canopyColor = 0x356b39,
): TreeObstacle {
  return {
    id,
    kind: 'tree',
    position: { x, y },
    trunkRadius,
    collisionRadius: trunkRadius,
    canopyRadius,
    canopyColor,
  };
}

function prop(
  id: string,
  kind: 'stone' | 'log',
  x: number,
  y: number,
  collisionRadius: number,
  visualWidth: number,
  visualHeight: number,
  angle = 0,
): PropObstacle {
  return {
    id,
    kind,
    position: { x, y },
    collisionRadius,
    visualWidth,
    visualHeight,
    angle,
  };
}

const TERRAIN_COLORS: Record<TerrainRegion['kind'], number> = {
  grass: 0x73964b,
  'forest-floor': 0x485b35,
  mud: 0x63533b,
  'dry-land': 0x718457,
  water: 0x466f70,
};

const meadow: MapDefinition = {
  id: 'meadow',
  displayName: 'Meadow',
  description: 'A balanced open arena with curved escape lanes and a generous shrine clearing.',
  preview: { baseColor: 0x73964b, accentColor: 0xe9d45f, pattern: 'open' },
  world: { width: 2880, height: 1620, padding: 48 },
  cameraBounds: { x: 0, y: 0, width: 2880, height: 1620 },
  shrine: { x: 1440, y: 810 },
  obstacles: [
    tree('m-nw-1', 320, 270),
    tree('m-nw-2', 470, 330),
    tree('m-nw-3', 360, 440),
    tree('m-ne-1', 2390, 260),
    tree('m-ne-2', 2540, 360),
    tree('m-ne-3', 2420, 470),
    tree('m-sw-1', 390, 1210),
    tree('m-sw-2', 540, 1320),
    tree('m-sw-3', 650, 1190),
    tree('m-se-1', 2230, 1230),
    tree('m-se-2', 2380, 1340),
    tree('m-se-3', 2510, 1190),
    tree('m-west-1', 870, 520),
    tree('m-west-2', 1000, 810),
    tree('m-west-3', 920, 1080),
    tree('m-east-1', 2010, 520),
    tree('m-east-2', 2080, 810),
    tree('m-east-3', 1960, 1080),
    prop('m-log-1', 'log', 1120, 310, 30, 92, 28, 0.35),
    prop('m-log-2', 'log', 1770, 1320, 30, 96, 28, -0.4),
    prop('m-stone-1', 'stone', 1180, 1190, 26, 52, 38),
    prop('m-stone-2', 'stone', 1720, 400, 25, 48, 40),
  ],
  spawnRegions: {
    rock: [
      { x: 1360, y: 730, width: 160, height: 160 },
      { x: 110, y: 620, width: 430, height: 380 },
    ],
    paper: [{ x: 2260, y: 130, width: 440, height: 360 }],
    scissors: [{ x: 2260, y: 1130, width: 440, height: 350 }],
  },
  decorativeRegions: [
    {
      id: 'm-flowers',
      x: 590,
      y: 180,
      width: 1700,
      height: 1260,
      kinds: ['grass', 'flower', 'ground-patch'],
      count: 110,
    },
    {
      id: 'm-stones',
      x: 100,
      y: 100,
      width: 2680,
      height: 1420,
      kinds: ['small-stone', 'grass'],
      count: 38,
    },
  ],
  terrainRegions: [
    {
      id: 'm-base',
      kind: 'grass',
      x: 0,
      y: 0,
      width: 2880,
      height: 1620,
      color: 0x73964b,
      alpha: 1,
    },
    {
      id: 'm-center',
      kind: 'dry-land',
      x: 1190,
      y: 570,
      width: 500,
      height: 480,
      color: 0x81985c,
      alpha: 0.45,
    },
  ],
  populationRecommendation: { rock: 15, paper: 12, scissors: 16 },
  parCompletionMs: 180_000,
  minimap: {
    groundColor: 0x35512f,
    terrainColors: TERRAIN_COLORS,
    obstacleColor: 0x1b3520,
    shrineColor: 0xffd66b,
  },
};

const forest: MapDefinition = {
  id: 'forest',
  displayName: 'Forest',
  description: 'Dense groves form broad loops, contested clearings, and evasive cross-routes.',
  preview: { baseColor: 0x485b35, accentColor: 0x9eb66a, pattern: 'canopy' },
  world: { width: 3000, height: 1800, padding: 52 },
  cameraBounds: { x: 0, y: 0, width: 3000, height: 1800 },
  shrine: { x: 1500, y: 900 },
  obstacles: [
    tree('f-nw-1', 360, 260, 45, 80, 0x285a35),
    tree('f-nw-2', 530, 250, 44, 78, 0x2f6738),
    tree('f-nw-3', 680, 330, 43, 76, 0x285a35),
    tree('f-nw-4', 410, 470, 46, 82, 0x315f35),
    tree('f-nw-5', 620, 520, 44, 78, 0x285a35),
    tree('f-n-1', 1050, 250, 44, 78, 0x315f35),
    tree('f-n-2', 1250, 330, 45, 80, 0x285a35),
    tree('f-n-3', 1770, 310, 45, 80, 0x315f35),
    tree('f-n-4', 1980, 240, 44, 78, 0x285a35),
    tree('f-ne-1', 2400, 280, 46, 82, 0x315f35),
    tree('f-ne-2', 2480, 390, 44, 78, 0x285a35),
    tree('f-ne-3', 2490, 530, 45, 80, 0x315f35),
    tree('f-w-1', 300, 760, 44, 78, 0x285a35),
    tree('f-w-2', 520, 850, 46, 82, 0x315f35),
    tree('f-w-3', 340, 1050, 44, 78, 0x285a35),
    tree('f-w-4', 650, 1150, 45, 80, 0x315f35),
    tree('f-e-1', 2670, 760, 44, 78, 0x285a35),
    tree('f-e-2', 2440, 870, 46, 82, 0x315f35),
    tree('f-e-3', 2650, 1080, 44, 78, 0x285a35),
    tree('f-e-4', 2350, 1160, 45, 80, 0x315f35),
    tree('f-sw-1', 420, 1430, 46, 82, 0x315f35),
    tree('f-sw-2', 650, 1510, 44, 78, 0x285a35),
    tree('f-s-1', 1050, 1510, 44, 78, 0x315f35),
    tree('f-s-2', 1270, 1430, 45, 80, 0x285a35),
    tree('f-s-3', 1740, 1470, 45, 80, 0x315f35),
    tree('f-s-4', 1980, 1530, 44, 78, 0x285a35),
    tree('f-se-1', 2400, 1430, 46, 82, 0x315f35),
    tree('f-se-2', 2440, 1540, 44, 78, 0x285a35),
    tree('f-inner-1', 1040, 680, 44, 78, 0x315f35),
    tree('f-inner-2', 1030, 1080, 44, 78, 0x285a35),
    tree('f-inner-3', 1970, 690, 44, 78, 0x315f35),
    tree('f-inner-4', 1980, 1080, 44, 78, 0x285a35),
    prop('f-log-1', 'log', 820, 900, 32, 110, 30, 1.1),
    prop('f-log-2', 'log', 2180, 900, 32, 110, 30, -1.05),
    prop('f-log-3', 'log', 1500, 420, 30, 100, 28, 0.05),
    prop('f-stone-1', 'stone', 1370, 1260, 28, 58, 42),
    prop('f-stone-2', 'stone', 1640, 570, 28, 56, 44),
  ],
  spawnRegions: {
    rock: [
      { x: 1420, y: 820, width: 160, height: 160 },
      { x: 100, y: 650, width: 430, height: 430 },
    ],
    paper: [{ x: 2380, y: 90, width: 470, height: 380 }],
    scissors: [{ x: 2380, y: 1330, width: 470, height: 360 }],
  },
  decorativeRegions: [
    {
      id: 'f-floor',
      x: 80,
      y: 80,
      width: 2840,
      height: 1640,
      kinds: ['leaves', 'ground-patch', 'small-stone'],
      count: 150,
    },
    {
      id: 'f-clearings',
      x: 800,
      y: 520,
      width: 1400,
      height: 760,
      kinds: ['grass', 'flower', 'leaves'],
      count: 55,
    },
  ],
  terrainRegions: [
    {
      id: 'f-base',
      kind: 'forest-floor',
      x: 0,
      y: 0,
      width: 3000,
      height: 1800,
      color: 0x485b35,
      alpha: 1,
    },
    {
      id: 'f-center',
      kind: 'grass',
      x: 1240,
      y: 640,
      width: 520,
      height: 520,
      color: 0x617946,
      alpha: 0.72,
    },
    {
      id: 'f-west-clearing',
      kind: 'grass',
      x: 650,
      y: 620,
      width: 450,
      height: 560,
      color: 0x587043,
      alpha: 0.55,
    },
    {
      id: 'f-east-clearing',
      kind: 'grass',
      x: 1900,
      y: 620,
      width: 450,
      height: 560,
      color: 0x587043,
      alpha: 0.55,
    },
  ],
  populationRecommendation: { rock: 16, paper: 14, scissors: 17 },
  parCompletionMs: 240_000,
  minimap: {
    groundColor: 0x293a29,
    terrainColors: TERRAIN_COLORS,
    obstacleColor: 0x102819,
    shrineColor: 0xf4c95d,
  },
};

const marsh: MapDefinition = {
  id: 'marsh',
  displayName: 'Marsh',
  description: 'Dry islands and muddy crossings turn route choice into terrain control.',
  preview: { baseColor: 0x526e5f, accentColor: 0xb6a463, pattern: 'islands' },
  world: { width: 2880, height: 1700, padding: 52 },
  cameraBounds: { x: 0, y: 0, width: 2880, height: 1700 },
  shrine: { x: 1440, y: 850 },
  obstacles: [
    tree('s-nw-1', 330, 260, 43, 74, 0x315c43),
    tree('s-nw-2', 510, 340, 42, 72, 0x38684a),
    tree('s-n-1', 1040, 250, 43, 74, 0x315c43),
    tree('s-n-2', 1840, 260, 43, 74, 0x38684a),
    tree('s-ne-1', 2380, 300, 43, 74, 0x315c43),
    tree('s-ne-2', 2550, 410, 42, 72, 0x38684a),
    tree('s-w-1', 390, 680, 43, 74, 0x315c43),
    tree('s-w-2', 520, 1040, 42, 72, 0x38684a),
    tree('s-e-1', 2520, 760, 43, 74, 0x315c43),
    tree('s-e-2', 2360, 1070, 42, 72, 0x38684a),
    tree('s-sw-1', 380, 1410, 43, 74, 0x315c43),
    tree('s-sw-2', 650, 1480, 42, 72, 0x38684a),
    tree('s-s-1', 1100, 1460, 43, 74, 0x315c43),
    tree('s-s-2', 1780, 1460, 43, 74, 0x38684a),
    tree('s-se-1', 2250, 1450, 43, 74, 0x315c43),
    tree('s-se-2', 2670, 1340, 42, 72, 0x38684a),
    prop('s-log-1', 'log', 930, 720, 30, 100, 28, 0.4),
    prop('s-log-2', 'log', 1950, 1010, 30, 100, 28, -0.5),
    prop('s-stone-1', 'stone', 880, 1240, 28, 56, 42),
    prop('s-stone-2', 'stone', 2020, 520, 28, 56, 42),
  ],
  spawnRegions: {
    rock: [
      { x: 1360, y: 770, width: 160, height: 160 },
      { x: 100, y: 620, width: 420, height: 420 },
    ],
    paper: [{ x: 2250, y: 100, width: 470, height: 380 }],
    scissors: [{ x: 2210, y: 1260, width: 500, height: 330 }],
  },
  decorativeRegions: [
    {
      id: 's-reeds',
      x: 80,
      y: 80,
      width: 2720,
      height: 1540,
      kinds: ['reeds', 'ground-patch'],
      count: 135,
    },
    {
      id: 's-islands',
      x: 500,
      y: 240,
      width: 1880,
      height: 1220,
      kinds: ['grass', 'small-stone', 'flower'],
      count: 60,
    },
  ],
  terrainRegions: [
    {
      id: 's-base',
      kind: 'dry-land',
      x: 0,
      y: 0,
      width: 2880,
      height: 1700,
      color: 0x60765a,
      alpha: 1,
    },
    {
      id: 's-mud-west',
      kind: 'mud',
      x: 560,
      y: 420,
      width: 620,
      height: 860,
      color: 0x63533b,
      alpha: 0.82,
    },
    {
      id: 's-mud-east',
      kind: 'mud',
      x: 1700,
      y: 410,
      width: 620,
      height: 880,
      color: 0x63533b,
      alpha: 0.82,
    },
    {
      id: 's-water-north',
      kind: 'water',
      x: 900,
      y: 80,
      width: 1080,
      height: 250,
      color: 0x466f70,
      alpha: 0.55,
    },
    {
      id: 's-water-south',
      kind: 'water',
      x: 900,
      y: 1370,
      width: 1080,
      height: 250,
      color: 0x466f70,
      alpha: 0.55,
    },
    {
      id: 's-shrine-island',
      kind: 'dry-land',
      x: 1190,
      y: 600,
      width: 500,
      height: 500,
      color: 0x829064,
      alpha: 1,
    },
  ],
  populationRecommendation: { rock: 15, paper: 13, scissors: 16 },
  parCompletionMs: 210_000,
  minimap: {
    groundColor: 0x354b43,
    terrainColors: TERRAIN_COLORS,
    obstacleColor: 0x18382b,
    shrineColor: 0xffd66b,
  },
};

export const MAPS: readonly MapDefinition[] = [meadow, forest, marsh];

export function getMapDefinition(id: MapId): MapDefinition {
  const map = MAPS.find((candidate) => candidate.id === id);
  if (!map) throw new Error(`Unknown map: ${id}`);
  return map;
}

function rectangleInside(rectangle: MapRectangle, world: MapDefinition['world']): boolean {
  return (
    rectangle.width > 0 &&
    rectangle.height > 0 &&
    rectangle.x >= 0 &&
    rectangle.y >= 0 &&
    rectangle.x + rectangle.width <= world.width &&
    rectangle.y + rectangle.height <= world.height
  );
}

export function isPositionInsideObstacle(
  map: MapDefinition,
  position: Vector,
  clearance = 0,
): boolean {
  return map.obstacles.some(
    (obstacle) => distance(position, obstacle.position) < obstacle.collisionRadius + clearance,
  );
}

function regionHasFreePoint(map: MapDefinition, region: MapRectangle): boolean {
  const step = 40;
  for (let y = region.y + step / 2; y < region.y + region.height; y += step)
    for (let x = region.x + step / 2; x < region.x + region.width; x += step)
      if (!isPositionInsideObstacle(map, { x, y }, 18)) return true;
  return false;
}

export function validateMapDefinition(map: MapDefinition): void {
  if (!MAP_IDS.includes(map.id)) throw new Error(`Invalid map id: ${map.id}`);
  if (!map.displayName || !map.description) throw new Error(`${map.id} requires display metadata.`);
  if (map.world.width <= 0 || map.world.height <= 0 || map.world.padding < 0)
    throw new Error(`${map.id} world dimensions are invalid.`);
  if (!rectangleInside(map.cameraBounds, map.world))
    throw new Error(`${map.id} camera bounds must be inside the world.`);
  if (
    map.shrine.x <= 0 ||
    map.shrine.y <= 0 ||
    map.shrine.x >= map.world.width ||
    map.shrine.y >= map.world.height
  )
    throw new Error(`${map.id} shrine must be inside the world.`);
  if (isPositionInsideObstacle(map, map.shrine, 100))
    throw new Error(`${map.id} shrine clearing overlaps an obstacle.`);
  const obstacleIds = new Set<string>();
  for (const obstacle of map.obstacles) {
    if (obstacleIds.has(obstacle.id)) throw new Error(`${map.id} obstacle ids must be unique.`);
    obstacleIds.add(obstacle.id);
    if (obstacle.collisionRadius <= 0)
      throw new Error(`${map.id}.${obstacle.id} collision radius must be positive.`);
    if (
      obstacle.position.x - obstacle.collisionRadius < map.world.padding ||
      obstacle.position.y - obstacle.collisionRadius < map.world.padding ||
      obstacle.position.x + obstacle.collisionRadius > map.world.width - map.world.padding ||
      obstacle.position.y + obstacle.collisionRadius > map.world.height - map.world.padding
    )
      throw new Error(`${map.id}.${obstacle.id} must be inside the playable world.`);
    if (
      obstacle.kind === 'tree' &&
      (obstacle.collisionRadius !== obstacle.trunkRadius ||
        obstacle.canopyRadius <= obstacle.trunkRadius)
    )
      throw new Error(`${map.id}.${obstacle.id} tree collision must match its trunk.`);
  }
  for (const faction of FACTIONS) {
    if (!Number.isInteger(map.populationRecommendation[faction]))
      throw new Error(`${map.id} population for ${faction} must be an integer.`);
    const regions = map.spawnRegions[faction];
    if (!regions.length) throw new Error(`${map.id} requires a ${faction} spawn region.`);
    for (const region of regions) {
      if (!rectangleInside(region, map.world) || !regionHasFreePoint(map, region))
        throw new Error(`${map.id} has an invalid ${faction} spawn region.`);
    }
  }
  for (const region of [...map.terrainRegions, ...map.decorativeRegions])
    if (!rectangleInside(region, map.world))
      throw new Error(`${map.id}.${region.id} must be inside the world.`);
  if (map.parCompletionMs <= 0) throw new Error(`${map.id} par time must be positive.`);
}

export function generateMapDecorations(map: MapDefinition, seed: number): MapDecoration[] {
  const random = createSeededRandom(seed ^ (map.id.charCodeAt(0) << 8));
  return map.decorativeRegions.flatMap((region) =>
    Array.from({ length: region.count }, (_, index) => {
      const kind = region.kinds[Math.floor(random() * region.kinds.length)] ?? 'grass';
      return {
        id: `${map.id}-${region.id}-${index}`,
        kind,
        position: {
          x: region.x + random() * region.width,
          y: region.y + random() * region.height,
        },
        rotation: random() * Math.PI * 2,
        scale: 0.7 + random() * 0.7,
        collidable: false as const,
      };
    }),
  );
}

function goalPoints(map: MapDefinition): Vector[] {
  return [
    map.shrine,
    ...FACTIONS.flatMap((faction) =>
      map.spawnRegions[faction].map((region) => {
        return { x: region.x + region.width / 2, y: region.y + region.height / 2 };
      }),
    ),
  ];
}

export function areMapGoalsConnected(map: MapDefinition, clearance: number): boolean {
  const cellSize = 40;
  const columns = Math.floor(map.world.width / cellSize);
  const rows = Math.floor(map.world.height / cellSize);
  const key = (x: number, y: number) => y * columns + x;
  const isOpen = (x: number, y: number) => {
    const point = { x: (x + 0.5) * cellSize, y: (y + 0.5) * cellSize };
    return (
      point.x >= map.world.padding + clearance &&
      point.y >= map.world.padding + clearance &&
      point.x <= map.world.width - map.world.padding - clearance &&
      point.y <= map.world.height - map.world.padding - clearance &&
      !isPositionInsideObstacle(map, point, clearance)
    );
  };
  const toCell = (point: Vector) => ({
    x: Math.max(0, Math.min(columns - 1, Math.floor(point.x / cellSize))),
    y: Math.max(0, Math.min(rows - 1, Math.floor(point.y / cellSize))),
  });
  const start = toCell(goalPoints(map)[0]!);
  if (!isOpen(start.x, start.y)) return false;
  const queue = [start];
  const visited = new Set([key(start.x, start.y)]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = current.x + dx;
      const y = current.y + dy;
      const cellKey = key(x, y);
      if (x >= 0 && y >= 0 && x < columns && y < rows && !visited.has(cellKey) && isOpen(x, y)) {
        visited.add(cellKey);
        queue.push({ x, y });
      }
    }
  }
  return goalPoints(map).every((point) => {
    const cell = toCell(point);
    return visited.has(key(cell.x, cell.y));
  });
}

export function canTestSwarmTraverse(map: MapDefinition, swarmDiameter: number): boolean {
  return areMapGoalsConnected(map, Math.max(0, swarmDiameter / 2));
}

for (const map of MAPS) validateMapDefinition(map);
