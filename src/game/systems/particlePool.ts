import type { Particle } from '../model/particle';

export class ParticlePool {
  readonly active: Particle[] = [];
  private readonly inactive: Particle[] = [];

  constructor(readonly maximumActive: number) {
    if (!Number.isInteger(maximumActive) || maximumActive <= 0)
      throw new Error('ParticlePool maximumActive must be a positive integer.');
  }

  emit(particle: Particle): Particle {
    let target = this.inactive.pop();
    if (!target && this.active.length >= this.maximumActive) target = this.active.shift();
    if (target) Object.assign(target, particle);
    else target = particle;
    this.active.push(target);
    return target;
  }

  releaseExpired(): void {
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      if (this.active[index]!.remainingMs > 0) continue;
      this.inactive.push(this.active[index]!);
      this.active.splice(index, 1);
    }
  }

  clear(): void {
    this.inactive.push(...this.active.splice(0));
  }
}
