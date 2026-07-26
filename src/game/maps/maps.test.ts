import { FACTIONS } from '../config/factions';
import { GAME_CONFIG } from '../config/gameConfig';
import { createInitialUnits } from '../systems/spawn';
import {
  MAPS,
  MAP_IDS,
  areMapGoalsConnected,
  canTestSwarmTraverse,
  generateMapDecorations,
  isPositionInsideObstacle,
  validateMapDefinition,
} from './maps';

describe('handcrafted map definitions', () => {
  it('provides three unique, valid, visually distinct maps', () => {
    expect(MAP_IDS).toEqual(['meadow', 'forest', 'marsh']);
    expect(new Set(MAPS.map((map) => map.id)).size).toBe(MAPS.length);
    expect(new Set(MAPS.map((map) => map.preview.baseColor)).size).toBe(MAPS.length);
    for (const map of MAPS) expect(() => validateMapDefinition(map)).not.toThrow();
  });

  it('keeps shrines, camera bounds, terrain, and faction spawn regions valid', () => {
    for (const map of MAPS) {
      expect(map.shrine.x).toBeGreaterThan(0);
      expect(map.shrine.y).toBeGreaterThan(0);
      expect(map.shrine.x).toBeLessThan(map.world.width);
      expect(map.shrine.y).toBeLessThan(map.world.height);
      expect(map.cameraBounds).toEqual({
        x: 0,
        y: 0,
        width: map.world.width,
        height: map.world.height,
      });
      expect(map.terrainRegions.length).toBeGreaterThan(0);
      for (const faction of FACTIONS) expect(map.spawnRegions[faction].length).toBeGreaterThan(0);
    }
  });

  it('uses trunk-centred tree collision bodies smaller than their canopies', () => {
    for (const tree of MAPS.flatMap((map) =>
      map.obstacles.filter((item) => item.kind === 'tree'),
    )) {
      expect(tree.collisionRadius).toBe(tree.trunkRadius);
      expect(tree.canopyRadius).toBeGreaterThan(tree.collisionRadius * 1.5);
    }
  });

  it('spawns every faction deterministically and outside every obstacle', () => {
    for (const map of MAPS) {
      const first = createInitialUnits(42, map);
      const repeat = createInitialUnits(42, map);
      expect(first.map((unit) => unit.position)).toEqual(repeat.map((unit) => unit.position));
      for (const faction of FACTIONS)
        expect(first.filter((unit) => unit.faction === faction)).toHaveLength(
          map.populationRecommendation[faction],
        );
      expect(
        first.every(
          (unit) => !isPositionInsideObstacle(map, unit.position, GAME_CONFIG.units.radius),
        ),
      ).toBe(true);
    }
  });

  it('keeps main routes connected and wide enough for a large test swarm', () => {
    for (const map of MAPS) {
      expect(areMapGoalsConnected(map, GAME_CONFIG.units.radius + 4), map.id).toBe(true);
      expect(canTestSwarmTraverse(map, 60), map.id).toBe(true);
    }
  });

  it('generates seeded non-colliding decorations deterministically', () => {
    for (const map of MAPS) {
      const first = generateMapDecorations(map, 77);
      expect(first).toEqual(generateMapDecorations(map, 77));
      expect(first).not.toEqual(generateMapDecorations(map, 78));
      expect(first.length).toBeGreaterThan(20);
      expect(first.every((decoration) => !decoration.collidable)).toBe(true);
    }
  });
});
