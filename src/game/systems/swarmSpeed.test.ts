import { calculateSwarmSpeedMultiplier } from './swarmSpeed';

describe('calculateSwarmSpeedMultiplier', () => {
  it.each([
    { count: 0, expected: 1 },
    { count: 1, expected: 1 },
    { count: -4, expected: 1 },
    { count: 2, expected: 1.02 },
    { count: 10, expected: 1.18 },
    { count: 999, expected: 1.45 },
  ])('returns $expected for $count recruited units', ({ count, expected }) => {
    expect(calculateSwarmSpeedMultiplier(count, 0.02, 0.45)).toBeCloseTo(expected);
  });

  it('is deterministic, config-driven, and caps the bonus', () => {
    const first = calculateSwarmSpeedMultiplier(8, 0.02, 0.12);
    expect(first).toBe(1.12);
    expect(calculateSwarmSpeedMultiplier(8, 0.02, 0.12)).toBe(first);
    expect(calculateSwarmSpeedMultiplier(8, 0.01, 0.5)).toBeCloseTo(1.07);
  });
});
