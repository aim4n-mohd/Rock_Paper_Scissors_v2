import { GAME_CONFIG } from '../config/gameConfig';
import { distance } from '../math/vector';
import { createInitialUnits } from './spawn';

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
});
