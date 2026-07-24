import type { DashSnapshot } from '../systems/dash';
import { calculateDashCooldownFill } from './dashCooldownModel';

function dashSnapshot(
  phase: DashSnapshot['phase'],
  cooldownRemainingMs = 0,
  cooldownMs = 2400,
): DashSnapshot {
  return {
    phase,
    ready: phase === 'ready',
    direction: { x: 1, y: 0 },
    activeRemainingMs: phase === 'active' ? 720 : 0,
    cooldownRemainingMs,
    cooldownMs,
  };
}

describe('dash cooldown indicator model', () => {
  it.each([
    { state: dashSnapshot('active'), expected: 0 },
    { state: dashSnapshot('cooldown', 2400), expected: 0 },
    { state: dashSnapshot('cooldown', 1800), expected: 0.25 },
    { state: dashSnapshot('cooldown', 1200), expected: 0.5 },
    { state: dashSnapshot('cooldown', 0), expected: 1 },
    { state: dashSnapshot('ready'), expected: 1 },
  ])('returns $expected fill for $state.phase', ({ state, expected }) => {
    expect(calculateDashCooldownFill(state)).toBeCloseTo(expected);
  });

  it('clamps invalid cooldown state safely', () => {
    expect(calculateDashCooldownFill(dashSnapshot('cooldown', 9999))).toBe(0);
    expect(calculateDashCooldownFill(dashSnapshot('cooldown', -50))).toBe(1);
    expect(calculateDashCooldownFill(dashSnapshot('cooldown', 100, 0))).toBe(1);
    expect(calculateDashCooldownFill(dashSnapshot('cooldown', Number.NaN))).toBe(0);
  });
});
