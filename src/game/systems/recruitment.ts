import { GAME_CONFIG } from '../config/gameConfig';
import { distance } from '../math/vector';
import type { Unit } from '../model/unit';

export function recruitNearbyRocks(units: Unit[]): string[] {
  const recruited = units.filter((unit) => unit.alive && unit.faction === 'rock' && unit.recruited);
  if (recruited.length === 0) return [];
  const joined: string[] = [];
  for (const unit of units) {
    if (!unit.alive || unit.faction !== 'rock' || unit.recruited) continue;
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
