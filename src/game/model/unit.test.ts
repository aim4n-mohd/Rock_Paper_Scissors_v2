import { GAME_CONFIG } from '../config/gameConfig';
import { createUnit, damageUnit } from './unit';

describe('unit model', () => {
  it('creates faction units from centralized defaults', () => {
    const unit = createUnit('r1', 'rock', { x: 10, y: 20 }, true);
    expect(unit.health).toBe(GAME_CONFIG.units.maxHealth);
    expect(unit.recruited).toBe(true);
    expect(unit.alive).toBe(true);
  });

  it('clamps health and makes death authoritative', () => {
    const unit = createUnit('p1', 'paper', { x: 0, y: 0 });
    damageUnit(unit, 150);
    expect(unit.health).toBe(0);
    expect(unit.alive).toBe(false);
    damageUnit(unit, 10);
    expect(unit.health).toBe(0);
  });
});
