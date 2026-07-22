import { GAME_CONFIG } from '../config/gameConfig';
import { distance, magnitude } from '../math/vector';
import { createUnit } from '../model/unit';
import { Simulation } from './Simulation';

function playerFixture() {
  const simulation = new Simulation(73);
  const first = createUnit('player-a', 'rock', { x: 900, y: 800 }, true);
  const second = createUnit('player-b', 'rock', { x: 930, y: 825 }, true);
  const paper = createUnit('paper', 'paper', { x: 2400, y: 1300 });
  const scissors = createUnit('scissors', 'scissors', { x: 2600, y: 1300 });
  simulation.units = [first, second, paper, scissors];
  simulation.anchorId = first.id;
  return { simulation, first, second };
}

describe('responsive imperfect movement integration', () => {
  it('keeps recruited units responsive while accelerating into player input', () => {
    const { simulation, first } = playerFixture();
    const startX = first.position.x;

    simulation.update(120, { x: 1, y: 0 });

    expect(first.position.x).toBeGreaterThan(startX);
    expect(first.velocity.x).toBeGreaterThan(0);
    expect(magnitude(first.velocity)).toBeLessThan(first.motion.maxSpeed);
  });

  it('moves recruited units as a loose swarm instead of synchronized copies', () => {
    const { simulation, first, second } = playerFixture();

    simulation.update(300, { x: 1, y: 0 });

    expect(first.velocity).not.toEqual(second.velocity);
    expect(distance(first.position, second.position)).toBeGreaterThan(first.radius * 2);
    expect(distance(first.position, second.position)).toBeLessThan(GAME_CONFIG.swarm.maxDistance);
  });

  it('steers around trees while pursuing only remembered target information', () => {
    const simulation = new Simulation(31);
    const tree = GAME_CONFIG.trees.positions[0]!;
    const hunter = createUnit('tree-hunter', 'paper', { x: tree.x - 100, y: tree.y });
    const target = createUnit('tree-target', 'rock', { x: tree.x + 80, y: tree.y }, true);
    const scissors = createUnit('far-scissors', 'scissors', { x: 2500, y: 1400 });
    hunter.velocity = { x: 30, y: 0 };
    hunter.motion = {
      ...hunter.motion,
      decisionIntervalMs: 1000,
      reactionDelayMs: 0,
      predictionTimeMs: 0,
      predictionError: 0,
    };
    simulation.units = [target, hunter, scissors];
    simulation.anchorId = target.id;

    simulation.update(450, { x: 0, y: -1 });

    expect(distance(hunter.position, tree)).toBeGreaterThanOrEqual(
      GAME_CONFIG.trees.radius + hunter.radius,
    );
    expect(Math.abs(hunter.position.y - tree.y)).toBeGreaterThan(1);
    expect(hunter.aiMemory.active?.targetPosition).not.toEqual(target.position);
  });
});
