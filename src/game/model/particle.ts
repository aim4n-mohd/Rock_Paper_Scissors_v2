import type { Faction } from '../config/factions';
import type { Vector } from '../math/vector';

export interface Particle {
  id: string;
  faction: Faction;
  position: Vector;
  velocity: Vector;
  remainingMs: number;
  lifetimeMs: number;
  effect:
    | 'death'
    | 'shrine'
    | 'shrine-death'
    | 'dash'
    | 'movement'
    | 'recruitment'
    | 'hit-advantage'
    | 'hit-disadvantage'
    | 'metal';
}
