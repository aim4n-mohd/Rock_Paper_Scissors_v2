import type { Faction } from '../config/factions';
import { GAME_CONFIG, type UnitMotionConfig } from '../config/gameConfig';
import type { Vector } from '../math/vector';
import { vec } from '../math/vector';

export type UnitIntent = 'player' | 'wander' | 'chase' | 'flee' | 'cohere' | 'dead';

export interface RememberedDecision {
  intent: Exclude<UnitIntent, 'player' | 'dead'>;
  direction: Vector;
  targetId?: string;
  targetPosition?: Vector;
}

export interface AiMemory {
  active?: RememberedDecision;
  pending?: { decision: RememberedDecision; applyAtMs: number };
  nextDecisionAtMs: number;
  sequence: number;
}

export interface Unit {
  id: string;
  faction: Faction;
  position: Vector;
  velocity: Vector;
  motion: UnitMotionConfig;
  health: number;
  maxHealth: number;
  radius: number;
  alive: boolean;
  recruited: boolean;
  intent: UnitIntent;
  targetId?: string;
  lastHits: Map<string, number>;
  knockback: Vector;
  knockbackRemainingMs: number;
  flashRemainingMs: number;
  aiMemory: AiMemory;
  swarmOffset: Vector;
  swarmOffsetAssigned: boolean;
}

export function createUnit(
  id: string,
  faction: Faction,
  position: Vector,
  recruited = false,
): Unit {
  return {
    id,
    faction,
    position: { ...position },
    velocity: vec(),
    motion: { ...GAME_CONFIG.units.motion },
    health: GAME_CONFIG.units.maxHealth,
    maxHealth: GAME_CONFIG.units.maxHealth,
    radius: GAME_CONFIG.units.radius,
    alive: true,
    recruited: faction === 'rock' && recruited,
    intent: recruited ? 'player' : 'wander',
    lastHits: new Map(),
    knockback: vec(),
    knockbackRemainingMs: 0,
    flashRemainingMs: 0,
    aiMemory: { nextDecisionAtMs: 0, sequence: 0 },
    swarmOffset: vec(),
    swarmOffsetAssigned: false,
  };
}

export function damageUnit(unit: Unit, amount: number): boolean {
  if (!unit.alive || amount <= 0) return false;
  unit.health = Math.max(0, unit.health - amount);
  unit.flashRemainingMs = 110;
  if (unit.health === 0) {
    unit.alive = false;
    unit.intent = 'dead';
    unit.velocity = vec();
    unit.lastHits.clear();
    return true;
  }
  return false;
}
