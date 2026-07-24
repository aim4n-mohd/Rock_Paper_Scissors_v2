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

export class DashSystem {
  private phase: DashPhase = 'ready';
  private direction = vec();
  private lastValidDirection = vec();
  private activeRemainingMs = 0;
  private cooldownRemainingMs = 0;

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
        this.cooldownRemainingMs = this.config.cooldownMs;
      }
    }
    if (this.phase === 'cooldown' && remaining > 0) {
      this.cooldownRemainingMs = Math.max(0, this.cooldownRemainingMs - remaining);
      if (this.cooldownRemainingMs === 0) this.phase = 'ready';
    }
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
  }

  isActive(): boolean {
    return this.phase === 'active';
  }

  movementDirection(fallback: Vector): Vector {
    return this.isActive() ? { ...this.direction } : normalize(fallback);
  }

  movementMultiplier(): number {
    return this.isActive() ? this.config.speedMultiplier : 1;
  }

  snapshot(): DashSnapshot {
    return {
      phase: this.phase,
      ready: this.phase === 'ready',
      direction: { ...this.direction },
      activeRemainingMs: this.activeRemainingMs,
      cooldownRemainingMs: this.cooldownRemainingMs,
      cooldownMs: this.config.cooldownMs,
    };
  }

  private beginCooldown(): void {
    this.phase = 'cooldown';
    this.activeRemainingMs = 0;
    this.cooldownRemainingMs = this.config.cooldownMs;
  }
}
