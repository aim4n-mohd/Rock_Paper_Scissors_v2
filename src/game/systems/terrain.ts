import type { Faction } from '../config/factions';
import { GAME_CONFIG } from '../config/gameConfig';
import type { MapDefinition, TerrainRegion } from '../maps/maps';
import type { Vector } from '../math/vector';

export interface TerrainMovementModifiers {
  speedMultiplier: number;
  accelerationMultiplier: number;
}

function contains(region: TerrainRegion, position: Vector): boolean {
  return (
    position.x >= region.x &&
    position.y >= region.y &&
    position.x <= region.x + region.width &&
    position.y <= region.y + region.height
  );
}

export function terrainMovementModifiers(
  map: MapDefinition,
  position: Vector,
  faction: Faction,
): TerrainMovementModifiers {
  const inMud = map.terrainRegions.some(
    (region) => region.kind === 'mud' && contains(region, position),
  );
  if (!inMud) return { speedMultiplier: 1, accelerationMultiplier: 1 };
  const resistance = faction === 'rock' ? GAME_CONFIG.terrain.mud.rockResistance : 0;
  return {
    speedMultiplier:
      GAME_CONFIG.terrain.mud.speedMultiplier +
      (1 - GAME_CONFIG.terrain.mud.speedMultiplier) * resistance,
    accelerationMultiplier:
      GAME_CONFIG.terrain.mud.accelerationMultiplier +
      (1 - GAME_CONFIG.terrain.mud.accelerationMultiplier) * resistance,
  };
}
