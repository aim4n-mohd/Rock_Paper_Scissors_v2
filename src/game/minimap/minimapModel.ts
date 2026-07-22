import type { Faction } from '../config/factions';
import type { MinimapConfig } from '../config/gameConfig';
import type { Unit } from '../model/unit';
import type { MinimapCoordinateMapper } from './MinimapCoordinateMapper';

export interface MinimapMarker {
  id: string;
  faction: Faction;
  x: number;
  y: number;
  size: number;
  alpha: number;
  recruited: boolean;
  isAnchor: boolean;
}

export function buildMinimapMarkers(
  units: readonly Unit[],
  anchorId: string | undefined,
  mapper: MinimapCoordinateMapper,
  config: MinimapConfig,
): MinimapMarker[] {
  return units.flatMap((unit) => {
    if (!unit.alive) return [];
    const position = mapper.worldToMinimap(unit.position);
    const recruited = unit.faction === 'rock' && unit.recruited;
    return [
      {
        id: unit.id,
        faction: unit.faction,
        x: position.x,
        y: position.y,
        size: recruited ? config.playerMarkerSize : config.unitMarkerSize,
        alpha: unit.faction === 'rock' && !recruited ? config.neutralMarkerAlpha : 1,
        recruited,
        isAnchor: unit.id === anchorId,
      },
    ];
  });
}
