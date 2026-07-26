import { GAME_CONFIG } from '../config/gameConfig';
import { distance } from '../math/vector';
import { Simulation } from './Simulation';

describe('game-feel event integration', () => {
  it('emits recruitment feedback and its future audio hook exactly once', () => {
    const simulation = new Simulation(5);
    const leader = simulation.units.find((unit) => unit.recruited)!;
    const neutral = simulation.units.find(
      (unit) => unit.faction === simulation.playerFaction && !unit.recruited,
    )!;
    neutral.position = { x: leader.position.x + 15, y: leader.position.y };

    simulation.update(GAME_CONFIG.simulation.fixedStepMs, { x: 0, y: 0 });
    const events = simulation.drainEffectEvents();

    expect(events.filter((event) => event.kind === 'recruitment')).toHaveLength(1);
    expect(events.find((event) => event.kind === 'recruitment')?.soundHook).toBe('unit-recruited');
    expect(simulation.drainEffectEvents()).toEqual([]);
    expect(neutral.recruitEffectRemainingMs).toBeGreaterThan(0);
  });

  it('emits distinct advantage and disadvantage hit profiles', () => {
    const simulation = new Simulation(8);
    const rock = simulation.units.find((unit) => unit.faction === 'rock')!;
    const scissors = simulation.units.find((unit) => unit.faction === 'scissors')!;
    rock.position = { x: 1000, y: 800 };
    scissors.position = { ...rock.position };

    simulation.update(GAME_CONFIG.simulation.fixedStepMs, { x: 0, y: 0 });
    const hits = simulation.drainEffectEvents().filter((event) => event.kind === 'hit');

    expect(hits.map((event) => event.profile).sort()).toEqual(['advantage', 'disadvantage']);
    expect(simulation.hitPauseRemainingMs).toBeGreaterThan(0);
  });

  it('caps particles and inherits previous velocity for death feedback', () => {
    const simulation = new Simulation(4, {
      visualSettings: { particleIntensity: 4 },
    });
    for (const unit of simulation.units.filter((candidate) => candidate.faction === 'paper')) {
      unit.velocity = { x: 70, y: -20 };
      unit.deathVelocity = { ...unit.velocity };
    }
    simulation.killFaction('paper');

    expect(simulation.particles.length).toBeLessThanOrEqual(
      GAME_CONFIG.visuals.particles.maximumActive,
    );
    expect(
      simulation.particles.some(
        (particle) => particle.effect === 'death' && particle.velocity.x > 70,
      ),
    ).toBe(true);
  });

  it('clears transient visual state on restart', () => {
    const simulation = new Simulation(3);
    simulation.requestDash({ x: 1, y: 0 });
    expect(simulation.particles.length).toBeGreaterThan(0);
    simulation.restart(3);

    expect(simulation.particles).toHaveLength(0);
    expect(simulation.drainEffectEvents()).toEqual([]);
    expect(simulation.hitPauseRemainingMs).toBe(0);
  });

  it('keeps units outside the visible tree trunk safety margin', () => {
    const simulation = new Simulation(9, { mapId: 'forest' });
    const tree = simulation.map.obstacles.find((obstacle) => obstacle.kind === 'tree')!;
    const unit = simulation.units.find((candidate) => candidate.recruited)!;
    unit.position = {
      x: tree.position.x - tree.collisionRadius - unit.radius - 1,
      y: tree.position.y,
    };
    unit.velocity = { x: 200, y: 0 };

    simulation.update(100, { x: 1, y: 0 });

    expect(distance(unit.position, tree.position)).toBeGreaterThanOrEqual(
      tree.collisionRadius + unit.radius + GAME_CONFIG.visuals.treeCollisionSkin,
    );
  });
});
