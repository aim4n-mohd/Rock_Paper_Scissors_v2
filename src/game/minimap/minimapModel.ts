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

export function clampAlpha(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function buildMinimapMarkers(
  units: readonly Unit[],
  anchorId: string | undefined,
  mapper: MinimapCoordinateMapper,
  config: MinimapConfig,
): MinimapMarker[] {
  const playerFaction = units.find((unit) => unit.id === anchorId)?.faction;
  return units.flatMap((unit) => {
    if (!unit.alive) return [];
    const position = mapper.worldToMinimap(unit.position);
    const recruited = unit.recruited;
    return [
      {
        id: unit.id,
        faction: unit.faction,
        x: position.x,
        y: position.y,
        size: recruited ? config.playerMarkerSize : config.unitMarkerSize,
        alpha:
          playerFaction !== undefined && unit.faction === playerFaction && !recruited
            ? clampAlpha(config.neutralMarkerAlpha)
            : clampAlpha(config.unitMarkerAlpha),
        recruited,
        isAnchor: unit.id === anchorId,
      },
    ];
  });
}
