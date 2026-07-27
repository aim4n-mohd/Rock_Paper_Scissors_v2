import {
  UNIT_SPRITE_MANIFEST,
  resolveSpriteFrame,
  type PixelSpriteFrame,
  type UnitAnimationState,
} from '../config/unitSpriteManifest';
import { GAME_CONFIG } from '../config/gameConfig';
import { magnitude } from '../math/vector';
import type { Unit } from '../model/unit';

export interface UnitAnimationContext {
  dashActive: boolean;
  shrineTransformActive: boolean;
  reducedMotion: boolean;
}

export interface UnitAnimationPose {
  state: UnitAnimationState;
  frame: PixelSpriteFrame;
  frameIndex: number;
  playbackRate: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  offsetY: number;
}

interface AnimationRuntime {
  state: UnitAnimationState;
  elapsedMs: number;
  rotation: number;
}

function selectState(unit: Unit, context: UnitAnimationContext): UnitAnimationState {
  if (!unit.alive && unit.deathTransitionRemainingMs > 0) return 'death';
  if (unit.flashRemainingMs > 0) return 'hit';
  if (context.shrineTransformActive || unit.shrineTransformRemainingMs > 0) return 'shrine';
  if (context.dashActive && unit.recruited) return 'dash';
  return magnitude(unit.velocity) >= GAME_CONFIG.visuals.animation.movementThreshold
    ? 'move'
    : 'idle';
}

export class UnitAnimationController {
  private readonly runtimes = new Map<string, AnimationRuntime>();

  get runtimeCount(): number {
    return this.runtimes.size;
  }

  update(unit: Unit, context: UnitAnimationContext, deltaMs: number): UnitAnimationPose {
    const state = selectState(unit, context);
    let runtime = this.runtimes.get(unit.id);
    if (!runtime) {
      runtime = { state, elapsedMs: 0, rotation: 0 };
      this.runtimes.set(unit.id, runtime);
    }
    if (runtime.state !== state) {
      runtime.state = state;
      runtime.elapsedMs = 0;
    }

    const speed = magnitude(unit.velocity);
    const playback = GAME_CONFIG.visuals.animation.playbackByFaction[unit.faction];
    const playbackRate = Math.max(
      playback.minimumRate,
      Math.min(playback.maximumRate, playback.baseRate + speed / playback.speedDivisor),
    );
    runtime.elapsedMs += Math.max(0, deltaMs) * (context.reducedMotion ? 0 : playbackRate);

    if (unit.faction === 'rock' && state !== 'idle' && !context.reducedMotion) {
      runtime.rotation =
        (runtime.rotation +
          ((speed * Math.max(0, deltaMs)) /
            1000 /
            GAME_CONFIG.visuals.animation.rockRollPixelsPerRotation) *
            Math.PI *
            2) %
        (Math.PI * 2);
    } else if (
      unit.faction === 'scissors' &&
      speed >= GAME_CONFIG.visuals.animation.movementThreshold
    )
      runtime.rotation = Math.atan2(unit.velocity.y, unit.velocity.x);
    else if (unit.faction === 'paper')
      runtime.rotation = context.reducedMotion
        ? 0
        : Math.max(
            -GAME_CONFIG.visuals.animation.paperMaximumTiltRadians,
            Math.min(
              GAME_CONFIG.visuals.animation.paperMaximumTiltRadians,
              (unit.velocity.x / GAME_CONFIG.visuals.animation.paperVelocityForMaximumTilt) *
                GAME_CONFIG.visuals.animation.paperMaximumTiltRadians,
            ),
          );

    const definition = UNIT_SPRITE_MANIFEST.factions[unit.faction].animations[state];
    const rawIndex = Math.floor(runtime.elapsedMs / definition.frameDurationMs);
    const frameIndex = context.reducedMotion
      ? 0
      : definition.loop
        ? rawIndex % definition.frames.length
        : Math.min(definition.frames.length - 1, rawIndex);
    const phase = runtime.elapsedMs / Math.max(1, definition.frameDurationMs);
    let scaleX = 1;
    let scaleY = 1;
    let offsetY = 0;
    if (!context.reducedMotion && state === 'idle') {
      const wobble = Math.sin(phase * Math.PI * 2);
      scaleY += unit.faction === 'rock' ? wobble * 0.035 : wobble * 0.045;
      offsetY = wobble * 0.5;
    } else if (state === 'dash') {
      scaleX = unit.faction === 'paper' ? 1.25 : 1.12;
      scaleY = unit.faction === 'rock' ? 0.9 : 0.94;
    } else if (state === 'hit') {
      scaleX = unit.faction === 'paper' ? 0.82 : 1.12;
      scaleY = 0.82;
    } else if (!context.reducedMotion && unit.recruitEffectRemainingMs > 0) {
      const progress =
        1 - unit.recruitEffectRemainingMs / GAME_CONFIG.visuals.animation.recruitmentEffectMs;
      offsetY = -Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI) * 5;
      runtime.rotation += unit.faction === 'rock' ? 0.08 : 0.16;
    }

    return {
      state,
      frame: resolveSpriteFrame(unit.faction, state, frameIndex),
      frameIndex,
      playbackRate,
      rotation: runtime.rotation,
      scaleX,
      scaleY,
      offsetY,
    };
  }

  cleanup(activeUnitIds: ReadonlySet<string>): void {
    for (const id of this.runtimes.keys()) if (!activeUnitIds.has(id)) this.runtimes.delete(id);
  }

  reset(): void {
    this.runtimes.clear();
  }
}
