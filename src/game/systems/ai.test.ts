import { createUnit } from '../model/unit';
import { decideIndependentMovement } from './ai';

describe('independent AI priority', () => {
  it('flees its predator even when prey is visible', () => {
    const rock = createUnit('rock', 'rock', { x: 0, y: 0 });
    const paper = createUnit('paper', 'paper', { x: 20, y: 0 });
    const scissors = createUnit('scissors', 'scissors', { x: -10, y: 0 });
    const result = decideIndependentMovement(rock, [rock, paper, scissors], { x: 0, y: 1 });
    expect(result.intent).toBe('flee');
    expect(result.targetId).toBe('paper');
    expect(result.direction.x).toBeLessThan(0);
  });

  it.each([
    ['rock', 'scissors'],
    ['paper', 'rock'],
    ['scissors', 'paper'],
  ] as const)('%s chases its closest %s prey', (faction, preyFaction) => {
    const unit = createUnit('hunter', faction, { x: 0, y: 0 });
    const prey = createUnit('prey', preyFaction, { x: 20, y: 0 });
    const result = decideIndependentMovement(unit, [unit, prey], { x: 0, y: 1 });
    expect(result).toMatchObject({ intent: 'chase', targetId: 'prey' });
    expect(result.direction.x).toBeGreaterThan(0);
  });

  it('wanders when no relevant unit is detected', () => {
    const rock = createUnit('rock', 'rock', { x: 0, y: 0 });
    expect(decideIndependentMovement(rock, [rock], { x: 0, y: 1 })).toMatchObject({
      intent: 'wander',
      direction: { x: 0, y: 1 },
    });
  });
});
