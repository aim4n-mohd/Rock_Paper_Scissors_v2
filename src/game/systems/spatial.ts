import { distance } from '../math/vector';
import type { Unit } from '../model/unit';

export function unitsWithinRadius(source: Unit, units: readonly Unit[], radius: number): Unit[] {
  return units.filter(
    (unit) => unit !== source && unit.alive && distance(source.position, unit.position) <= radius,
  );
}

export function closestUnit(
  source: Unit,
  units: readonly Unit[],
  predicate: (unit: Unit) => boolean,
  radius = Infinity,
): Unit | undefined {
  let best: Unit | undefined;
  let bestDistance = radius;
  for (const unit of units) {
    if (unit === source || !unit.alive || !predicate(unit)) continue;
    const candidateDistance = distance(source.position, unit.position);
    if (candidateDistance <= bestDistance) {
      best = unit;
      bestDistance = candidateDistance;
    }
  }
  return best;
}
