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
  return {
    status: 'available',
    channelProgressMs: 0,
    usesRemaining: config.maxUses,
    movementPenaltyRemainingMs: 0,
    transformationEffectRemainingMs: 0,
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
  if (context.qualifyingPredatorHit || !canChannelShrine(state, context, config)) {
    state.status = 'available';
    state.channelProgressMs = 0;
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
  if (state.movementPenaltyRemainingMs < 0.000001) state.movementPenaltyRemainingMs = 0;
  if (state.transformationEffectRemainingMs < 0.000001) state.transformationEffectRemainingMs = 0;
}
