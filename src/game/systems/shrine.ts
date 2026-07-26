import type { Faction } from '../config/factions';
import type { ShrineConfig } from '../config/gameConfig';

export type ShrineStatus = 'available' | 'channeling' | 'used';

export interface ShrineState {
  status: ShrineStatus;
  selectedFaction?: Faction;
  channelProgressMs: number;
  usesRemaining: number;
  movementPenaltyRemainingMs: number;
  transformationEffectRemainingMs: number;
  cancelledFeedbackRemainingMs: number;
}

export interface ShrineChannelContext {
  deltaMs: number;
  interactionHeld: boolean;
  inRange: boolean;
  qualifyingPredatorHit: boolean;
  recruitedCount: number;
  playerFaction: Faction;
}

export function createShrineState(config: ShrineConfig): ShrineState {
  const usesRemaining = config.enabled ? config.usesPerMatch : 0;
  return {
    status: usesRemaining > 0 ? 'available' : 'used',
    channelProgressMs: 0,
    usesRemaining,
    movementPenaltyRemainingMs: 0,
    transformationEffectRemainingMs: 0,
    cancelledFeedbackRemainingMs: 0,
  };
}

export function selectShrineFaction(
  state: ShrineState,
  playerFaction: Faction,
  selectedFaction: Faction,
): boolean {
  if (state.status === 'used' || state.usesRemaining <= 0 || selectedFaction === playerFaction)
    return false;
  state.selectedFaction = selectedFaction;
  state.status = 'available';
  state.channelProgressMs = 0;
  state.cancelledFeedbackRemainingMs = 0;
  return true;
}

export function calculateShrineSacrificeCount(
  recruitedCount: number,
  sacrificeRatio: number,
): number {
  return recruitedCount > 0 ? Math.ceil(recruitedCount * sacrificeRatio) : 0;
}

export function canChannelShrine(
  state: ShrineState,
  context: Omit<ShrineChannelContext, 'deltaMs' | 'qualifyingPredatorHit'>,
  config: ShrineConfig,
): boolean {
  return (
    state.status !== 'used' &&
    state.usesRemaining > 0 &&
    context.interactionHeld &&
    context.inRange &&
    context.recruitedCount >= config.minimumRecruitedUnits &&
    state.selectedFaction !== undefined &&
    state.selectedFaction !== context.playerFaction
  );
}

export function advanceShrineChannel(
  state: ShrineState,
  context: ShrineChannelContext,
  config: ShrineConfig,
): boolean {
  if (state.status === 'used') return false;
  const wasChanneling = state.status === 'channeling' || state.channelProgressMs > 0;
  if (context.qualifyingPredatorHit || !canChannelShrine(state, context, config)) {
    state.status = 'available';
    state.channelProgressMs = 0;
    if (wasChanneling) state.cancelledFeedbackRemainingMs = config.cancelledFeedbackMs;
    return false;
  }
  state.status = 'channeling';
  state.channelProgressMs = Math.min(
    config.channelDurationMs,
    state.channelProgressMs + context.deltaMs,
  );
  return state.channelProgressMs >= config.channelDurationMs;
}

export function tickShrineEffects(state: ShrineState, deltaMs: number): void {
  state.movementPenaltyRemainingMs = Math.max(0, state.movementPenaltyRemainingMs - deltaMs);
  state.transformationEffectRemainingMs = Math.max(
    0,
    state.transformationEffectRemainingMs - deltaMs,
  );
  state.cancelledFeedbackRemainingMs = Math.max(0, state.cancelledFeedbackRemainingMs - deltaMs);
  if (state.movementPenaltyRemainingMs < 0.000001) state.movementPenaltyRemainingMs = 0;
  if (state.transformationEffectRemainingMs < 0.000001) state.transformationEffectRemainingMs = 0;
  if (state.cancelledFeedbackRemainingMs < 0.000001) state.cancelledFeedbackRemainingMs = 0;
}
