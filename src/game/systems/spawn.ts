import { FACTIONS, type Faction } from '../config/factions';
import { GAME_CONFIG } from '../config/gameConfig';
import { distance, type Vector } from '../math/vector';
import { createSeededRandom } from '../math/random';
import { createUnit, type Unit } from '../model/unit';

function validPosition(position: Vector, units: readonly Unit[]): boolean {
  const { padding } = GAME_CONFIG.world;
  if (
    position.x < padding ||
    position.y < padding ||
    position.x > GAME_CONFIG.world.width - padding ||
    position.y > GAME_CONFIG.world.height - padding
  )
    return false;
  if (
    GAME_CONFIG.trees.positions.some(
      (tree) => distance(position, tree) <= GAME_CONFIG.trees.radius + GAME_CONFIG.units.radius + 4,
    )
  )
    return false;
  return units.every(
    (unit) => distance(position, unit.position) > unit.radius + GAME_CONFIG.units.radius + 3,
  );
}

export function createInitialUnits(seed = 1): Unit[] {
  const random = createSeededRandom(seed);
  const units: Unit[] = [];
  const anchorPosition = { x: GAME_CONFIG.world.width / 2, y: GAME_CONFIG.world.height / 2 };
  units.push(createUnit('rock-0', 'rock', anchorPosition, true));

  for (const faction of FACTIONS) {
    const start = faction === 'rock' ? 1 : 0;
    for (let index = start; index < GAME_CONFIG.population[faction]; index += 1) {
      let position: Vector | undefined;
      if (faction === 'rock' && index === 1)
        position = { x: anchorPosition.x + 120, y: anchorPosition.y };
      for (
        let attempt = 0;
        (!position || !validPosition(position, units)) && attempt < 1000;
        attempt += 1
      ) {
        position = {
          x:
            GAME_CONFIG.world.padding +
            random() * (GAME_CONFIG.world.width - GAME_CONFIG.world.padding * 2),
          y:
            GAME_CONFIG.world.padding +
            random() * (GAME_CONFIG.world.height - GAME_CONFIG.world.padding * 2),
        };
      }
      if (!position || !validPosition(position, units))
        throw new Error(`Unable to spawn ${faction}-${index}.`);
      units.push(createUnit(`${faction}-${index}`, faction as Faction, position));
    }
  }
  return units;
}
