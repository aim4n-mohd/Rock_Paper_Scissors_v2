import { GAME_CONFIG, validateConfig } from './gameConfig';

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
  });
});
