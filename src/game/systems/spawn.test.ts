import { GAME_CONFIG } from '../config/gameConfig';
import { getMapDefinition } from '../maps/maps';
import { distance } from '../math/vector';
import { createInitialUnits } from './spawn';

function insideRegion(
  position: { x: number; y: number },
  region: { x: number; y: number; width: number; height: number },
) {
  return (
    position.x >= region.x &&
    position.y >= region.y &&
    position.x <= region.x + region.width &&
    position.y <= region.y + region.height
  );
}

describe('deterministic population spawning', () => {
  it('creates exact counts with one recruited Rock and valid positions', () => {
    const units = createInitialUnits(42);
    for (const faction of ['rock', 'paper', 'scissors'] as const) {
      expect(units.filter((unit) => unit.faction === faction)).toHaveLength(
        GAME_CONFIG.population[faction],
      );
    }
    expect(units.filter((unit) => unit.recruited)).toHaveLength(1);
    for (let i = 0; i < units.length; i += 1) {
      const unit = units[i]!;
      for (const tree of GAME_CONFIG.trees.positions) {
        expect(distance(unit.position, tree)).toBeGreaterThan(
          GAME_CONFIG.trees.radius + unit.radius,
        );
      }
      for (let j = i + 1; j < units.length; j += 1) {
        expect(distance(unit.position, units[j]!.position)).toBeGreaterThan(
          unit.radius + units[j]!.radius,
        );
      }
    }
  });

  it('uses a repeatable seed', () => {
    expect(createInitialUnits(7).map((unit) => unit.position)).toEqual(
      createInitialUnits(7).map((unit) => unit.position),
    );
    expect(createInitialUnits(7).map((unit) => unit.position)).not.toEqual(
      createInitialUnits(8).map((unit) => unit.position),
    );
  });

  it('intermixes independent factions across the maps valid spawn regions', () => {
    const map = getMapDefinition('meadow');
    const units = createInitialUnits(42, map);

    for (const faction of ['rock', 'paper', 'scissors'] as const) {
      const independent = units.filter((unit) => unit.faction === faction && !unit.recruited);
      expect(
        independent.some(
          (unit) =>
            !map.spawnRegions[faction].some((region) => insideRegion(unit.position, region)),
        ),
        faction,
      ).toBe(true);
    }
  });
});
