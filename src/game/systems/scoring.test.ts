import { GAME_CONFIG } from '../config/gameConfig';
import { ScoreTracker } from './scoring';

describe('authoritative match scoring', () => {
  it('awards prey and predator kills at different configured values', () => {
    const tracker = new ScoreTracker(GAME_CONFIG.scoring);

    expect(
      tracker.recordCombatDeath({
        deathId: 'scissors-1',
        attackerFaction: 'rock',
        attackerRecruited: true,
        targetFaction: 'scissors',
        playerFaction: 'rock',
      }),
    ).toBe(GAME_CONFIG.scoring.preyDefeatedPoints);
    expect(
      tracker.recordCombatDeath({
        deathId: 'paper-1',
        attackerFaction: 'rock',
        attackerRecruited: true,
        targetFaction: 'paper',
        playerFaction: 'rock',
      }),
    ).toBe(GAME_CONFIG.scoring.predatorDefeatedPoints);
  });

  it('does not double-process a death or score an independent-unit kill', () => {
    const tracker = new ScoreTracker(GAME_CONFIG.scoring);
    const death = {
      deathId: 'scissors-1',
      attackerFaction: 'rock' as const,
      attackerRecruited: true,
      targetFaction: 'scissors' as const,
      playerFaction: 'rock' as const,
    };

    expect(tracker.recordCombatDeath(death)).toBe(100);
    expect(tracker.recordCombatDeath(death)).toBe(0);
    expect(
      tracker.recordCombatDeath({
        ...death,
        deathId: 'scissors-2',
        attackerRecruited: false,
      }),
    ).toBe(0);
    expect(tracker.snapshot().killPoints).toBe(100);
  });

  it('finalizes deterministically with one victory bonus, survivors, and nonnegative time', () => {
    const tracker = new ScoreTracker(GAME_CONFIG.scoring);
    tracker.recordCombatDeath({
      deathId: 'scissors-1',
      attackerFaction: 'rock',
      attackerRecruited: true,
      targetFaction: 'scissors',
      playerFaction: 'rock',
    });

    const input = {
      result: 'victory' as const,
      survivingRecruitedUnits: 3,
      elapsedMs: 200_000,
      parCompletionMs: 180_000,
      difficultyMultiplier: 1.5,
      modeMultiplier: 1.25,
      modeCompletionBonus: 500,
    };
    const first = tracker.finalize(input);
    const second = tracker.finalize({ ...input, survivingRecruitedUnits: 99 });

    expect(first).toEqual(second);
    expect(first.victoryBonus).toBe(1_000);
    expect(first.survivorBonus).toBe(150);
    expect(first.timeBonus).toBe(0);
    expect(first.finalScore).toBe(Math.round((100 + 1_000 + 150 + 500) * 1.5 * 1.25));
  });

  it('applies seconds-under-par, difficulty, and mode multipliers consistently', () => {
    const tracker = new ScoreTracker(GAME_CONFIG.scoring);
    const result = tracker.finalize({
      result: 'victory',
      survivingRecruitedUnits: 0,
      elapsedMs: 175_000,
      parCompletionMs: 180_000,
      difficultyMultiplier: 0.75,
      modeMultiplier: 1.25,
      modeCompletionBonus: 0,
    });

    expect(result.timeBonus).toBe(5 * GAME_CONFIG.scoring.pointsPerSecondUnderPar);
    expect(result.finalScore).toBe(
      Math.round((GAME_CONFIG.scoring.victoryBonusPoints + result.timeBonus) * 0.75 * 1.25),
    );
  });
});
