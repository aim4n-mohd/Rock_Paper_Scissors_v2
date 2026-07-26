import {
  GAME_CONFIG,
  type DifficultyConfig,
  type DifficultyId,
  type GameModeConfig,
  type GameModeId,
} from '../config/gameConfig';

export interface MatchRuleSelection {
  difficulty: DifficultyId;
  mode: GameModeId;
}

export interface ResolvedMatchRules {
  difficultyId: DifficultyId;
  modeId: GameModeId;
  difficulty: DifficultyConfig;
  mode: GameModeConfig;
  timeLimitMs?: number;
  enemyDetectionRadius: number;
}

export function resolveMatchRules(selection: MatchRuleSelection): ResolvedMatchRules {
  const difficulty = { ...GAME_CONFIG.difficulties[selection.difficulty] };
  const mode = { ...GAME_CONFIG.gameModes[selection.mode] };
  return {
    difficultyId: selection.difficulty,
    modeId: selection.mode,
    difficulty,
    mode,
    timeLimitMs: mode.timeLimitMs,
    enemyDetectionRadius:
      GAME_CONFIG.units.detectionRadius * difficulty.enemyDetectionRadiusMultiplier,
  };
}
