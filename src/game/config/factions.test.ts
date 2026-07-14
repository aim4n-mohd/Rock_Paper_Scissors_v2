import { getPredator, getPrey, getRelationship } from './factions';

describe('faction relationships', () => {
  const cases = [
    ['rock', 'rock', 'ally'],
    ['rock', 'paper', 'predator'],
    ['rock', 'scissors', 'prey'],
    ['paper', 'rock', 'prey'],
    ['paper', 'paper', 'ally'],
    ['paper', 'scissors', 'predator'],
    ['scissors', 'rock', 'predator'],
    ['scissors', 'paper', 'prey'],
    ['scissors', 'scissors', 'ally'],
  ] as const;

  it.each(cases)('%s sees %s as %s', (source, target, expected) => {
    expect(getRelationship(source, target)).toBe(expected);
  });

  it('resolves each prey and predator', () => {
    expect(getPrey('rock')).toBe('scissors');
    expect(getPrey('paper')).toBe('rock');
    expect(getPrey('scissors')).toBe('paper');
    expect(getPredator('rock')).toBe('paper');
    expect(getPredator('paper')).toBe('scissors');
    expect(getPredator('scissors')).toBe('rock');
  });
});
