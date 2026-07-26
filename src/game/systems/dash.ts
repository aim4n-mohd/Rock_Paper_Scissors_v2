import type { DashConfig } from '../config/gameConfig';
import { magnitude, normalize, vec, type Vector } from '../math/vector';

export type DashPhase = 'ready' | 'active' | 'cooldown';

export interface DashSnapshot {
  phase: DashPhase;
  ready: boolean;
  direction: Vector;
  activeRemainingMs: number;
  cooldownRemainingMs: number;
  cooldownMs: number;
}

export interface DashCooldownModifiers {
  factionMultiplier: number;
  difficultyMultiplier: number;
  temporaryMultiplier: number;
}

const DEFAULT_COOLDOWN_MODIFIERS: DashCooldownModifiers = {
  factionMultiplier: 1,
  difficultyMultiplier: 1,
  temporaryMultiplier: 1,
};

function smoothstep(progress: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  return clamped * clamped * (3 - 2 * clamped);
}

export class DashSystem {
  private phase: DashPhase = 'ready';
  private direction = vec();
  private lastValidDirection = vec();
  private activeRemainingMs = 0;
  private cooldownRemainingMs = 0;
  private cooldownModifiers = { ...DEFAULT_COOLDOWN_MODIFIERS };

  constructor(private readonly config: DashConfig) {}

  observeInput(input: Vector): void {
    if (magnitude(input) >= this.config.minimumInputMagnitude)
      this.lastValidDirection = normalize(input);
  }

  request(input: Vector, gameplayActive: boolean): boolean {
    if (!this.config.enabled || this.phase !== 'ready') return false;
    if (!gameplayActive && !this.config.allowWhilePaused) return false;
    const current =
      magnitude(input) >= this.config.minimumInputMagnitude ? normalize(input) : undefined;
    const remembered =
      this.config.useLastDirection &&
      magnitude(this.lastValidDirection) >= this.config.minimumInputMagnitude
        ? this.lastValidDirection
        : undefined;
    const direction = current ?? remembered;
    if (!direction) return false;

    this.direction = { ...direction };
    this.lastValidDirection = { ...direction };
    this.phase = 'active';
    this.activeRemainingMs = this.config.durationMs;
    this.cooldownRemainingMs = 0;
    return true;
  }

  tick(deltaMs: number, gameplayActive: boolean): void {
    if (!gameplayActive && !this.config.allowWhilePaused) return;
    let remaining = Math.max(0, deltaMs);
    if (this.phase === 'active') {
      const consumed = Math.min(remaining, this.activeRemainingMs);
      this.activeRemainingMs -= consumed;
      remaining -= consumed;
      if (this.activeRemainingMs <= 0) {
        this.activeRemainingMs = 0;
        this.phase = 'cooldown';
        this.cooldownRemainingMs = this.effectiveCooldownMs();
      }
    }
    if (this.phase === 'cooldown' && remaining > 0) {
      this.cooldownRemainingMs = Math.max(0, this.cooldownRemainingMs - remaining);
      if (this.cooldownRemainingMs === 0) this.phase = 'ready';
    }
  }

  setCooldownModifiers(modifiers: DashCooldownModifiers): void {
    const previousDuration = this.effectiveCooldownMs();
    const previousProgress =
      this.phase === 'cooldown' && previousDuration > 0
        ? this.cooldownRemainingMs / previousDuration
        : 0;
    this.cooldownModifiers = {
      factionMultiplier: this.safeMultiplier(modifiers.factionMultiplier),
      difficultyMultiplier: this.safeMultiplier(modifiers.difficultyMultiplier),
      temporaryMultiplier: this.safeMultiplier(modifiers.temporaryMultiplier),
    };
    if (this.phase === 'cooldown')
      this.cooldownRemainingMs = this.effectiveCooldownMs() * previousProgress;
  }

  handleCollision(): void {
    if (this.phase === 'active' && this.config.cancelOnCollision) this.beginCooldown();
  }

  reset(): void {
    this.phase = 'ready';
    this.direction = vec();
    this.lastValidDirection = vec();
    this.activeRemainingMs = 0;
    this.cooldownRemainingMs = 0;
    this.cooldownModifiers = { ...DEFAULT_COOLDOWN_MODIFIERS };
  }

  isActive(): boolean {
    return this.phase === 'active';
  }

  movementDirection(fallback: Vector): Vector {
    return this.isActive() ? { ...this.direction } : normalize(fallback);
  }

  movementMultiplier(): number {
    if (!this.isActive()) return 1;
    const elapsedMs = this.config.durationMs - this.activeRemainingMs;
    const easeIn =
      this.config.accelerationInMs > 0 ? smoothstep(elapsedMs / this.config.accelerationInMs) : 1;
    const easeOut =
      this.config.decelerationOutMs > 0
        ? smoothstep(this.activeRemainingMs / this.config.decelerationOutMs)
        : 1;
    const intensity = Math.min(easeIn, easeOut);
    return 1 + (this.config.speedMultiplier - 1) * intensity;
  }

  snapshot(): DashSnapshot {
    return {
      phase: this.phase,
      ready: this.phase === 'ready',
      direction: { ...this.direction },
      activeRemainingMs: this.activeRemainingMs,
      cooldownRemainingMs: this.cooldownRemainingMs,
      cooldownMs: this.effectiveCooldownMs(),
    };
  }

  private beginCooldown(): void {
    this.phase = 'cooldown';
    this.activeRemainingMs = 0;
    this.cooldownRemainingMs = this.effectiveCooldownMs();
  }

  private effectiveCooldownMs(): number {
    return (
      this.config.baseCooldownMs *
      this.cooldownModifiers.factionMultiplier *
      this.cooldownModifiers.difficultyMultiplier *
      this.cooldownModifiers.temporaryMultiplier
    );
  }

  private safeMultiplier(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 1;
  }
}
