import { getRelationship, type Faction } from '../config/factions';
import type { ScoringConfig } from '../config/gameConfig';

export interface CombatDeathAttribution {
  deathId: string;
  attackerFaction: Faction;
  attackerRecruited: boolean;
  targetFaction: Faction;
  playerFaction: Faction;
}

export interface ScoreFinalizationInput {
  result: 'victory' | 'defeat';
  survivingRecruitedUnits: number;
  elapsedMs: number;
  parCompletionMs: number;
  difficultyMultiplier: number;
  modeMultiplier: number;
  modeCompletionBonus: number;
}

export interface FinalScoreBreakdown {
  preyKills: number;
  predatorKills: number;
  killPoints: number;
  victoryBonus: number;
  survivorBonus: number;
  timeBonus: number;
  modeCompletionBonus: number;
  difficultyMultiplier: number;
  modeMultiplier: number;
  subtotal: number;
  finalScore: number;
}

export interface ScoreSnapshot {
  current: number;
  preyKills: number;
  predatorKills: number;
  killPoints: number;
  final?: FinalScoreBreakdown;
}

export class ScoreTracker {
  private readonly scoredDeaths = new Set<string>();
  private preyKills = 0;
  private predatorKills = 0;
  private killPoints = 0;
  private finalScore?: FinalScoreBreakdown;

  constructor(private readonly config: ScoringConfig) {}

  reset(): void {
    this.scoredDeaths.clear();
    this.preyKills = 0;
    this.predatorKills = 0;
    this.killPoints = 0;
    this.finalScore = undefined;
  }

  recordCombatDeath(attribution: CombatDeathAttribution): number {
    if (this.scoredDeaths.has(attribution.deathId)) return 0;
    this.scoredDeaths.add(attribution.deathId);
    if (!attribution.attackerRecruited || attribution.attackerFaction !== attribution.playerFaction)
      return 0;
    const relationship = getRelationship(attribution.playerFaction, attribution.targetFaction);
    if (relationship === 'ally') return 0;
    const points =
      relationship === 'prey' ? this.config.preyDefeatedPoints : this.config.predatorDefeatedPoints;
    if (relationship === 'prey') this.preyKills += 1;
    else this.predatorKills += 1;
    this.killPoints += points;
    return points;
  }

  finalize(input: ScoreFinalizationInput): FinalScoreBreakdown {
    if (this.finalScore) return this.finalScore;
    const won = input.result === 'victory';
    const victoryBonus = won ? this.config.victoryBonusPoints : 0;
    const survivorBonus = won
      ? Math.max(0, Math.floor(input.survivingRecruitedUnits)) *
        this.config.survivingRecruitedUnitPoints
      : 0;
    const secondsUnderPar = won
      ? Math.max(0, Math.floor((input.parCompletionMs - input.elapsedMs) / 1000))
      : 0;
    const timeBonus = secondsUnderPar * this.config.pointsPerSecondUnderPar;
    const modeCompletionBonus = won ? Math.max(0, input.modeCompletionBonus) : 0;
    const subtotal =
      this.killPoints + victoryBonus + survivorBonus + timeBonus + modeCompletionBonus;
    this.finalScore = {
      preyKills: this.preyKills,
      predatorKills: this.predatorKills,
      killPoints: this.killPoints,
      victoryBonus,
      survivorBonus,
      timeBonus,
      modeCompletionBonus,
      difficultyMultiplier: input.difficultyMultiplier,
      modeMultiplier: input.modeMultiplier,
      subtotal,
      finalScore: Math.round(subtotal * input.difficultyMultiplier * input.modeMultiplier),
    };
    return this.finalScore;
  }

  snapshot(difficultyMultiplier = 1, modeMultiplier = 1): ScoreSnapshot {
    return {
      current: this.finalScore
        ? this.finalScore.finalScore
        : Math.round(this.killPoints * difficultyMultiplier * modeMultiplier),
      preyKills: this.preyKills,
      predatorKills: this.predatorKills,
      killPoints: this.killPoints,
      final: this.finalScore ? { ...this.finalScore } : undefined,
    };
  }
}
