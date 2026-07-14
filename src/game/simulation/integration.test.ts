import { GAME_CONFIG } from '../config/gameConfig';
import { distance } from '../math/vector';
import { createUnit } from '../model/unit';
import { resolveCombatPair } from '../systems/combat';
import { Simulation } from './Simulation';

describe('simulation integration scenarios', () => {
  it('allows a sufficiently large disadvantaged group to overturn one predator', () => {
    const rock = createUnit('rock', 'rock', { x: 0, y: 0 });
    const scissors = Array.from({ length: 13 }, (_, index) =>
      createUnit(`s-${index}`, 'scissors', { x: 10, y: 0 }),
    );
    for (const attacker of scissors) resolveCombatPair(rock, attacker, 1000);
    expect(rock.alive).toBe(false);
  });

  it('keeps units outside solid trees while targets remain detectable through them', () => {
    const simulation = new Simulation(4);
    const rock = simulation.units.find((unit) => unit.recruited)!;
    const tree = GAME_CONFIG.trees.positions[0]!;
    rock.position = { x: tree.x - GAME_CONFIG.trees.radius - rock.radius - 1, y: tree.y };
    simulation.update(500, { x: 1, y: 0 });
    expect(distance(rock.position, tree)).toBeGreaterThanOrEqual(
      GAME_CONFIG.trees.radius + rock.radius,
    );
  });

  it('does not tunnel through a tree during a long frame', () => {
    const simulation = new Simulation(4);
    const rock = simulation.units.find((unit) => unit.recruited)!;
    const tree = GAME_CONFIG.trees.positions[0]!;
    const minimum = GAME_CONFIG.trees.radius + rock.radius;
    rock.position = { x: tree.x - 100, y: tree.y };
    simulation.update(1000, { x: 1, y: 0 });
    expect(rock.position.x).toBeLessThanOrEqual(tree.x - minimum);
  });

  it('does not tunnel through an opposing unit during a long frame', () => {
    const simulation = new Simulation(4);
    const rock = createUnit('rock', 'rock', { x: 500, y: 500 }, true);
    const paper = createUnit('paper', 'paper', { x: 650, y: 500 });
    simulation.units = [rock, paper];
    simulation.anchorId = rock.id;

    simulation.update(1000, { x: 1, y: 0 });

    expect(rock.health).toBeLessThan(rock.maxHealth);
    expect(paper.health).toBeLessThan(paper.maxHealth);
  });

  it('emits faction particles once and removes them after their lifetime', () => {
    const simulation = new Simulation(3);
    simulation.killFaction('paper');
    expect(simulation.particles).toHaveLength(
      GAME_CONFIG.population.paper * GAME_CONFIG.particles.count,
    );
    simulation.update(GAME_CONFIG.particles.lifetimeMs + 1, { x: 0, y: 0 });
    expect(simulation.particles).toHaveLength(0);
  });
});
