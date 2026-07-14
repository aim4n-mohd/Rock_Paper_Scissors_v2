import { GAME_CONFIG, validateConfig } from './gameConfig';
import { distance } from '../math/vector';

describe('game configuration', () => {
  it('contains balanced positive combat values and integer populations', () => {
    expect(() => validateConfig(GAME_CONFIG)).not.toThrow();
    expect(GAME_CONFIG.combat.advantageDamage).toBeGreaterThan(
      GAME_CONFIG.combat.disadvantageDamage,
    );
    expect(Object.values(GAME_CONFIG.population).every(Number.isInteger)).toBe(true);
  });

  it('rejects unsafe values with useful errors', () => {
    expect(() =>
      validateConfig({ ...GAME_CONFIG, units: { ...GAME_CONFIG.units, maxHealth: 0 } }),
    ).toThrow(/maxHealth/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        combat: { ...GAME_CONFIG.combat, advantageDamage: 5, disadvantageDamage: 8 },
      }),
    ).toThrow(/advantageDamage/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        combat: { ...GAME_CONFIG.combat, disadvantageDamage: -1 },
      }),
    ).toThrow(/disadvantageDamage/);
    expect(() => validateConfig({ ...GAME_CONFIG, camera: { smoothing: 1.5 } })).toThrow(
      /camera.smoothing/,
    );
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        particles: { ...GAME_CONFIG.particles, count: 2.5 },
      }),
    ).toThrow(/particles.count/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        trees: { ...GAME_CONFIG.trees, positions: [{ x: 0, y: 0 }] },
      }),
    ).toThrow(/trees.positions/);
  });

  it('keeps the fixed meadow trees inside the playable boundary without overlap', () => {
    const minimum = GAME_CONFIG.world.padding + GAME_CONFIG.trees.radius;
    for (let index = 0; index < GAME_CONFIG.trees.positions.length; index += 1) {
      const tree = GAME_CONFIG.trees.positions[index]!;
      expect(tree.x).toBeGreaterThanOrEqual(minimum);
      expect(tree.y).toBeGreaterThanOrEqual(minimum);
      expect(tree.x).toBeLessThanOrEqual(GAME_CONFIG.world.width - minimum);
      expect(tree.y).toBeLessThanOrEqual(GAME_CONFIG.world.height - minimum);
      for (let other = index + 1; other < GAME_CONFIG.trees.positions.length; other += 1) {
        expect(distance(tree, GAME_CONFIG.trees.positions[other]!)).toBeGreaterThan(
          GAME_CONFIG.trees.radius * 2,
        );
      }
    }
  });
});
