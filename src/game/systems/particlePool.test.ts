import { ParticlePool } from './particlePool';

function particle(id: string) {
  return {
    id,
    faction: 'rock' as const,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    remainingMs: 100,
    lifetimeMs: 100,
    effect: 'movement' as const,
  };
}

describe('particle pool', () => {
  it('enforces a hard maximum and reuses released entries', () => {
    const pool = new ParticlePool(3);
    pool.emit(particle('a'));
    pool.emit(particle('b'));
    pool.emit(particle('c'));
    const released = pool.active[0];
    pool.emit(particle('d'));

    expect(pool.active).toHaveLength(3);
    expect(pool.active.map((item) => item.id)).toEqual(['b', 'c', 'd']);
    expect(pool.active[2]).toBe(released);
  });

  it('clears active particles for restart without discarding the pool', () => {
    const pool = new ParticlePool(2);
    pool.emit(particle('a'));
    pool.clear();
    expect(pool.active).toHaveLength(0);
    pool.emit(particle('b'));
    expect(pool.active).toHaveLength(1);
  });
});
