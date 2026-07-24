import { GAME_CONFIG } from '../config/gameConfig';
import type { Faction } from '../config/factions';
import { distance } from '../math/vector';
import type { Unit } from '../model/unit';

export function recruitNearbyFaction(units: Unit[], playerFaction: Faction): string[] {
  const recruited = units.filter(
    (unit) => unit.alive && unit.faction === playerFaction && unit.recruited,
  );
  if (recruited.length === 0) return [];
  const joined: string[] = [];
  for (const unit of units) {
    if (!unit.alive || unit.faction !== playerFaction || unit.recruited) continue;
    if (
      recruited.some(
        (member) => distance(member.position, unit.position) <= GAME_CONFIG.recruitment.radius,
      )
    ) {
      unit.recruited = true;
      unit.intent = 'player';
      joined.push(unit.id);
    }
  }
  return joined;
}
