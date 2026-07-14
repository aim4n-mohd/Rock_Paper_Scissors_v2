import { createUnit } from '../model/unit';
import { Simulation } from './Simulation';

describe('match simulation', () => {
  it('pauses time and completely resets a played match', () => {
    const simulation = new Simulation(2);
    simulation.update(1000, { x: 1, y: 0 });
    expect(simulation.elapsedMs).toBe(1000);
    simulation.setPaused(true);
    simulation.update(1000, { x: 1, y: 0 });
    expect(simulation.elapsedMs).toBe(1000);
    simulation.restart(2);
    expect(simulation.elapsedMs).toBe(0);
    expect(simulation.status).toBe('active');
    expect(simulation.snapshot().counts).toEqual({ rock: 15, paper: 12, scissors: 16 });
  });

  it('transfers a dead anchor to the nearest recruited Rock', () => {
    const simulation = new Simulation(1);
    const oldAnchor = simulation.units.find((unit) => unit.id === simulation.anchorId)!;
    const replacement = createUnit(
      'replacement',
      'rock',
      { x: oldAnchor.position.x + 5, y: oldAnchor.position.y },
      true,
    );
    simulation.units.push(replacement);
    oldAnchor.alive = false;
    oldAnchor.health = 0;
    simulation.update(16, { x: 0, y: 0 });
    expect(simulation.anchorId).toBe('replacement');
    expect(simulation.status).toBe('active');
  });

  it('recruits a neutral fallback and loses only when no Rock remains', () => {
    const simulation = new Simulation(1);
    const neutral = simulation.units.find((unit) => unit.faction === 'rock' && !unit.recruited)!;
    for (const unit of simulation.units.filter((unit) => unit.recruited)) unit.alive = false;
    simulation.update(16, { x: 0, y: 0 });
    expect(simulation.anchorId).toBe(neutral.id);
    expect(neutral.recruited).toBe(true);
    simulation.killFaction('rock');
    expect(simulation.status).toBe('defeat');
  });

  it('wins only after both enemy factions are eliminated', () => {
    const simulation = new Simulation(1);
    simulation.killFaction('paper');
    expect(simulation.status).toBe('active');
    simulation.killFaction('scissors');
    expect(simulation.status).toBe('victory');
  });

  it('cleans transient state across repeated restart cycles', () => {
    const simulation = new Simulation(1);
    for (let cycle = 0; cycle < 20; cycle += 1) {
      simulation.killFaction('paper');
      expect(simulation.particles.length).toBeGreaterThan(0);
      simulation.restart(cycle + 2);
      expect(simulation.units).toHaveLength(43);
      expect(simulation.particles).toHaveLength(0);
      expect(simulation.elapsedMs).toBe(0);
      expect(simulation.snapshot().counts).toEqual({ rock: 15, paper: 12, scissors: 16 });
    }
  });
});
