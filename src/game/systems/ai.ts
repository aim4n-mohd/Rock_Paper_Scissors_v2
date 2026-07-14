import { getPredator, getPrey } from '../config/factions';
import { GAME_CONFIG } from '../config/gameConfig';
import { normalize, subtract, type Vector } from '../math/vector';
import type { Unit, UnitIntent } from '../model/unit';
import { closestUnit } from './spatial';

export interface MovementDecision {
  intent: UnitIntent;
  direction: Vector;
  targetId?: string;
}

export function decideIndependentMovement(
  unit: Unit,
  units: readonly Unit[],
  wanderDirection: Vector,
): MovementDecision {
  const predator = closestUnit(
    unit,
    units,
    (candidate) => candidate.faction === getPredator(unit.faction),
    GAME_CONFIG.units.detectionRadius,
  );
  if (predator)
    return {
      intent: 'flee',
      targetId: predator.id,
      direction: normalize(subtract(unit.position, predator.position)),
    };
  const prey = closestUnit(
    unit,
    units,
    (candidate) => candidate.faction === getPrey(unit.faction),
    GAME_CONFIG.units.detectionRadius,
  );
  if (prey)
    return {
      intent: 'chase',
      targetId: prey.id,
      direction: normalize(subtract(prey.position, unit.position)),
    };
  const ally = closestUnit(
    unit,
    units,
    (candidate) => candidate.faction === unit.faction,
    GAME_CONFIG.units.allyRadius,
  );
  if (ally)
    return {
      intent: 'cohere',
      targetId: ally.id,
      direction: normalize(subtract(ally.position, unit.position)),
    };
  return { intent: 'wander', direction: normalize(wanderDirection) };
}
