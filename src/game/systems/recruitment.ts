import { GAME_CONFIG } from '../config/gameConfig';
import type { Faction } from '../config/factions';
import { distance } from '../math/vector';
import type { Unit } from '../model/unit';
import { calculateRecruitmentRadius } from './recruitmentRadius';

export function recruitNearbyFaction(units: Unit[], playerFaction: Faction): string[] {
  const recruited = units.filter(
    (unit) => unit.alive && unit.faction === playerFaction && unit.recruited,
  );
  if (recruited.length === 0) return [];
  const joined: string[] = [];
  let recruitedDuringPass = true;
  while (recruitedDuringPass) {
    recruitedDuringPass = false;
    const recruitmentRadius = calculateRecruitmentRadius(
      recruited.length,
      GAME_CONFIG.recruitment.baseRadius,
      GAME_CONFIG.recruitment.radiusBonusPerUnit,
      GAME_CONFIG.recruitment.maximumRadiusBonus,
    );
    for (const unit of units) {
      if (!unit.alive || unit.faction !== playerFaction || unit.recruited) continue;
      if (
        recruited.some((member) => distance(member.position, unit.position) <= recruitmentRadius)
      ) {
        unit.recruited = true;
        unit.intent = 'player';
        recruited.push(unit);
        joined.push(unit.id);
        recruitedDuringPass = true;
      }
    }
  }
  return joined;
}
