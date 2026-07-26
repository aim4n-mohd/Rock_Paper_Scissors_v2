import { GAME_CONFIG } from '../config/gameConfig';
import { resolveMatchRules } from './matchRules';

describe('match rule resolution', () => {
  it.each([
    [
      'casual',
      {
        enemyPopulationMultiplier: 1,
        enemyDetectionRadiusMultiplier: 0.85,
        enemyReactionDelayMultiplier: 1.3,
        enemySpeedMultiplier: 0.95,
        playerDashCooldownMultiplier: 0.85,
        shrineSacrificeRatio: 0.15,
        scoreMultiplier: 0.75,
      },
    ],
    [
      'normal',
      {
        enemyPopulationMultiplier: 1,
        enemyDetectionRadiusMultiplier: 1,
        enemyReactionDelayMultiplier: 1,
        enemySpeedMultiplier: 1,
        playerDashCooldownMultiplier: 1,
        shrineSacrificeRatio: 0.2,
        scoreMultiplier: 1,
      },
    ],
    [
      'chaos',
      {
        enemyPopulationMultiplier: 1.25,
        enemyDetectionRadiusMultiplier: 1.15,
        enemyReactionDelayMultiplier: 0.8,
        enemySpeedMultiplier: 1.1,
        playerDashCooldownMultiplier: 1,
        shrineSacrificeRatio: 0.25,
        scoreMultiplier: 1.5,
      },
    ],
  ] as const)('resolves the %s difficulty without mutating base config', (difficulty, expected) => {
    const before = structuredClone(GAME_CONFIG);
    const rules = resolveMatchRules({ difficulty, mode: 'last-faction-standing' });

    expect(rules.difficulty).toMatchObject(expected);
    expect(GAME_CONFIG).toEqual(before);
  });

  it('resolves mode timers, pacing, and score multipliers', () => {
    const standing = resolveMatchRules({
      difficulty: 'normal',
      mode: 'last-faction-standing',
    });
    const blitz = resolveMatchRules({ difficulty: 'normal', mode: 'blitz' });

    expect(standing.timeLimitMs).toBeUndefined();
    expect(standing.mode.scoreMultiplier).toBe(1);
    expect(blitz.timeLimitMs).toBe(180_000);
    expect(blitz.mode.scoreMultiplier).toBeGreaterThan(standing.mode.scoreMultiplier);
    expect(blitz.mode.movementSpeedMultiplier).toBeGreaterThan(1);
  });
});
