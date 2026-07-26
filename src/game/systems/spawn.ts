import { FACTIONS, type Faction } from '../config/factions';
import { GAME_CONFIG } from '../config/gameConfig';
import { UNIT_FRAME_CONTRACT } from '../config/unitSpriteManifest';
import { getMapDefinition, isPositionInsideObstacle, type MapDefinition } from '../maps/maps';
import { distance, type Vector } from '../math/vector';
import { createSeededRandom } from '../math/random';
import { createUnit, type Unit } from '../model/unit';

function insideRegion(position: Vector, region: MapDefinition['spawnRegions'][Faction][number]) {
  return (
    position.x >= region.x &&
    position.y >= region.y &&
    position.x <= region.x + region.width &&
    position.y <= region.y + region.height
  );
}

function validPosition(position: Vector, units: readonly Unit[], map: MapDefinition): boolean {
  const { padding } = map.world;
  const boundaryRadius = Math.max(GAME_CONFIG.units.radius, UNIT_FRAME_CONTRACT.boundaryRadius);
  if (
    position.x < padding + boundaryRadius ||
    position.y < padding + boundaryRadius ||
    position.x > map.world.width - padding - boundaryRadius ||
    position.y > map.world.height - padding - boundaryRadius
  )
    return false;
  if (isPositionInsideObstacle(map, position, GAME_CONFIG.units.radius + 4)) return false;
  return units.every(
    (unit) => distance(position, unit.position) > unit.radius + GAME_CONFIG.units.radius + 3,
  );
}

export function createInitialUnits(
  seed = 1,
  map: MapDefinition = getMapDefinition('meadow'),
): Unit[] {
  const random = createSeededRandom(seed);
  const units: Unit[] = [];
  const anchorRegion = map.spawnRegions.rock[0]!;
  const anchorPosition = {
    x: anchorRegion.x + anchorRegion.width / 2,
    y: anchorRegion.y + anchorRegion.height / 2,
  };
  units.push(createUnit('rock-0', 'rock', anchorPosition, true));
  const independentRegions = FACTIONS.flatMap((faction) => map.spawnRegions[faction]).filter(
    (region) => region !== anchorRegion,
  );

  for (const faction of FACTIONS) {
    const start = faction === 'rock' ? 1 : 0;
    for (let index = start; index < map.populationRecommendation[faction]; index += 1) {
      let position: Vector | undefined;
      for (
        let attempt = 0;
        (!position ||
          !independentRegions.some((region) => insideRegion(position!, region)) ||
          !validPosition(position, units, map)) &&
        attempt < 1000;
        attempt += 1
      ) {
        const region = independentRegions[Math.floor(random() * independentRegions.length)]!;
        position = {
          x: region.x + random() * region.width,
          y: region.y + random() * region.height,
        };
      }
      if (!position || !validPosition(position, units, map))
        throw new Error(`Unable to spawn ${faction}-${index}.`);
      units.push(createUnit(`${faction}-${index}`, faction as Faction, position));
    }
  }
  return units;
}
