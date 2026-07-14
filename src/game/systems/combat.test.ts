import { GAME_CONFIG } from '../config/gameConfig';
import { createUnit } from '../model/unit';
import { resolveCombatPair } from './combat';

describe('combat resolution', () => {
  it('resolves both faction-based hits simultaneously', () => {
    const rock = createUnit('rock', 'rock', { x: 0, y: 0 });
    const scissors = createUnit('scissors', 'scissors', { x: 10, y: 0 });
    const result = resolveCombatPair(rock, scissors, 1000);
    expect(result.hitCount).toBe(2);
    expect(rock.health).toBe(100 - GAME_CONFIG.combat.disadvantageDamage);
    expect(scissors.health).toBe(100 - GAME_CONFIG.combat.advantageDamage);
    expect(rock.knockback.x).toBeLessThan(0);
    expect(scissors.knockback.x).toBeGreaterThan(0);
  });

  it('enforces cooldown per attacker-target pair', () => {
    const rock = createUnit('rock', 'rock', { x: 0, y: 0 });
    const scissors = createUnit('scissors', 'scissors', { x: 10, y: 0 });
    const other = createUnit('other', 'scissors', { x: 10, y: 0 });
    resolveCombatPair(rock, scissors, 1000);
    expect(resolveCombatPair(rock, scissors, 1100).hitCount).toBe(0);
    expect(resolveCombatPair(rock, other, 1100).hitCount).toBe(2);
    expect(resolveCombatPair(rock, scissors, 1350).hitCount).toBe(2);
  });

  it('never damages allies or lets dead units attack', () => {
    const a = createUnit('a', 'rock', { x: 0, y: 0 });
    const b = createUnit('b', 'rock', { x: 10, y: 0 });
    expect(resolveCombatPair(a, b, 0).hitCount).toBe(0);
    b.faction = 'paper';
    b.alive = false;
    expect(resolveCombatPair(a, b, 500).hitCount).toBe(0);
  });
});
