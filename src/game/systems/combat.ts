import { getRelationship } from '../config/factions';
import { GAME_CONFIG } from '../config/gameConfig';
import { normalize, scale, subtract } from '../math/vector';
import { damageUnit, type Unit } from '../model/unit';

export interface CombatResult {
  hitCount: number;
  deaths: string[];
}

function damageFor(attacker: Unit, target: Unit): number {
  return getRelationship(attacker.faction, target.faction) === 'prey'
    ? GAME_CONFIG.combat.advantageDamage
    : GAME_CONFIG.combat.disadvantageDamage;
}

function canHit(attacker: Unit, target: Unit, nowMs: number): boolean {
  return (
    nowMs - (attacker.lastHits.get(target.id) ?? -Infinity) >= GAME_CONFIG.combat.hitCooldownMs
  );
}

export function resolveCombatPair(a: Unit, b: Unit, nowMs: number): CombatResult {
  if (!a.alive || !b.alive || a.faction === b.faction) return { hitCount: 0, deaths: [] };
  const aCanHit = canHit(a, b, nowMs);
  const bCanHit = canHit(b, a, nowMs);
  if (!aCanHit && !bCanHit) return { hitCount: 0, deaths: [] };

  const aDamage = bCanHit ? damageFor(b, a) : 0;
  const bDamage = aCanHit ? damageFor(a, b) : 0;
  if (aCanHit) a.lastHits.set(b.id, nowMs);
  if (bCanHit) b.lastHits.set(a.id, nowMs);

  const direction = normalize(subtract(b.position, a.position));
  const fallbackDirection = direction.x === 0 && direction.y === 0 ? { x: 1, y: 0 } : direction;
  a.knockback = scale(fallbackDirection, -GAME_CONFIG.combat.knockbackForce);
  b.knockback = scale(fallbackDirection, GAME_CONFIG.combat.knockbackForce);
  a.knockbackRemainingMs = GAME_CONFIG.combat.knockbackDurationMs;
  b.knockbackRemainingMs = GAME_CONFIG.combat.knockbackDurationMs;

  const deaths: string[] = [];
  if (damageUnit(a, aDamage)) deaths.push(a.id);
  if (damageUnit(b, bDamage)) deaths.push(b.id);
  return { hitCount: Number(aCanHit) + Number(bCanHit), deaths };
}
