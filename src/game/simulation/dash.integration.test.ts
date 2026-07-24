import { GAME_CONFIG } from '../config/gameConfig';
import { distance, magnitude } from '../math/vector';
import { createUnit } from '../model/unit';
import { Simulation } from './Simulation';

function dashFixture() {
  const simulation = new Simulation(52);
  const first = createUnit('player-a', 'rock', { x: 1100, y: 1000 }, true);
  const second = createUnit('player-b', 'rock', { x: 1130, y: 1025 }, true);
  const neutral = createUnit('neutral', 'rock', { x: 1800, y: 1200 });
  const paper = createUnit('paper', 'paper', { x: 2400, y: 1300 });
  const scissors = createUnit('scissors', 'scissors', { x: 2600, y: 1300 });
  simulation.units = [first, second, neutral, paper, scissors];
  simulation.anchorId = first.id;
  return { simulation, first, second, neutral, paper };
}

describe('dash simulation integration', () => {
  it('activates from current input, applies speed after the swarm bonus, and returns to normal', () => {
    const { simulation } = dashFixture();
    const normalSpeed = simulation.currentEffectiveSwarmSpeed();

    expect(simulation.requestDash({ x: 1, y: 0 })).toBe(true);
    expect(simulation.snapshot().dash.phase).toBe('active');
    expect(simulation.currentEffectiveSwarmSpeed()).toBeCloseTo(
      normalSpeed * GAME_CONFIG.dash.speedMultiplier,
    );

    simulation.update(GAME_CONFIG.dash.durationMs + GAME_CONFIG.simulation.fixedStepMs, {
      x: 1,
      y: 0,
    });
    expect(simulation.snapshot().dash.phase).toBe('cooldown');
    expect(simulation.currentEffectiveSwarmSpeed()).toBeCloseTo(normalSpeed);
  });

  it('rejects invalid, paused, active, and cooldown requests and freezes while paused', () => {
    const { simulation } = dashFixture();
    expect(simulation.requestDash({ x: 0, y: 0 })).toBe(false);
    simulation.setPaused(true);
    expect(simulation.requestDash({ x: 1, y: 0 })).toBe(false);
    simulation.setPaused(false);
    expect(simulation.requestDash({ x: 1, y: 0 })).toBe(true);
    expect(simulation.requestDash({ x: 1, y: 0 })).toBe(false);
    simulation.update(60, { x: 1, y: 0 });
    const beforePause = simulation.snapshot().dash;
    simulation.setPaused(true);
    simulation.update(500, { x: 1, y: 0 });
    expect(simulation.snapshot().dash).toEqual(beforePause);
  });

  it('uses a remembered direction and resets dash state on restart', () => {
    const { simulation } = dashFixture();
    simulation.update(40, { x: 0, y: -1 });
    expect(simulation.requestDash({ x: 0, y: 0 })).toBe(true);
    expect(simulation.snapshot().dash.direction).toEqual({ x: 0, y: -1 });
    simulation.restart(52);
    expect(simulation.snapshot().dash).toMatchObject({ phase: 'ready', ready: true });
  });

  it('boosts recruited units only and preserves individual steering', () => {
    const { simulation, first, second, neutral, paper } = dashFixture();
    const neutralMaximum = neutral.motion.maxSpeed;
    const enemyMaximum = paper.motion.maxSpeed;
    simulation.requestDash({ x: 1, y: 0 });
    simulation.update(150, { x: 1, y: 0 });

    expect(first.velocity).not.toEqual(second.velocity);
    expect(magnitude(neutral.velocity)).toBeLessThanOrEqual(
      neutralMaximum * neutral.motion.fleeSpeedMultiplier,
    );
    expect(magnitude(paper.velocity)).toBeLessThanOrEqual(
      enemyMaximum * paper.motion.fleeSpeedMultiplier,
    );
    expect(neutral.recruited).toBe(false);
    expect(paper.recruited).toBe(false);
  });

  it('respects trees and world boundaries at dash speed', () => {
    const treeSimulation = new Simulation(8);
    const tree = GAME_CONFIG.trees.positions[0]!;
    const rock = createUnit('tree-rock', 'rock', { x: tree.x - 100, y: tree.y }, true);
    treeSimulation.units = [
      rock,
      createUnit('paper', 'paper', { x: 2400, y: 1400 }),
      createUnit('scissors', 'scissors', { x: 2600, y: 1400 }),
    ];
    treeSimulation.anchorId = rock.id;
    treeSimulation.requestDash({ x: 1, y: 0 });
    treeSimulation.update(300, { x: 1, y: 0 });
    expect(distance(rock.position, tree)).toBeGreaterThanOrEqual(
      GAME_CONFIG.trees.radius + rock.radius,
    );

    const edgeSimulation = new Simulation(9);
    const edgeRock = createUnit(
      'edge-rock',
      'rock',
      {
        x: GAME_CONFIG.world.width - GAME_CONFIG.world.padding - GAME_CONFIG.units.radius - 1,
        y: 900,
      },
      true,
    );
    edgeSimulation.units = [
      edgeRock,
      createUnit('edge-paper', 'paper', { x: 2000, y: 1400 }),
      createUnit('edge-scissors', 'scissors', { x: 2200, y: 1400 }),
    ];
    edgeSimulation.anchorId = edgeRock.id;
    edgeSimulation.requestDash({ x: 1, y: 0 });
    edgeSimulation.update(300, { x: 1, y: 0 });
    expect(edgeRock.position.x).toBeLessThanOrEqual(
      GAME_CONFIG.world.width - GAME_CONFIG.world.padding - edgeRock.radius,
    );
  });

  it('emits one configured feedback burst per successful dash without leaking on rejection', () => {
    const { simulation } = dashFixture();
    expect(simulation.requestDash({ x: 1, y: 0 })).toBe(true);
    expect(simulation.particles.filter((particle) => particle.effect === 'dash')).toHaveLength(
      GAME_CONFIG.dash.particleCount,
    );
    expect(simulation.requestDash({ x: 1, y: 0 })).toBe(false);
    expect(simulation.particles.filter((particle) => particle.effect === 'dash')).toHaveLength(
      GAME_CONFIG.dash.particleCount,
    );
    simulation.update(GAME_CONFIG.dash.particleLifetimeMs + 1, { x: 1, y: 0 });
    expect(simulation.particles.filter((particle) => particle.effect === 'dash')).toHaveLength(0);
    simulation.update(GAME_CONFIG.dash.durationMs, { x: 1, y: 0 });
    for (
      let elapsed = 0;
      elapsed <= GAME_CONFIG.dash.cooldownMs;
      elapsed += GAME_CONFIG.simulation.maxFrameMs
    ) {
      simulation.update(
        Math.min(
          GAME_CONFIG.simulation.maxFrameMs,
          GAME_CONFIG.dash.cooldownMs - elapsed + GAME_CONFIG.simulation.fixedStepMs,
        ),
        { x: 1, y: 0 },
      );
    }
    expect(simulation.requestDash({ x: 1, y: 0 })).toBe(true);
    expect(simulation.particles.filter((particle) => particle.effect === 'dash')).toHaveLength(
      GAME_CONFIG.dash.particleCount,
    );
  });
});
