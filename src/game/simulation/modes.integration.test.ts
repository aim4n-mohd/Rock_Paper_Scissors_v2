import { GAME_CONFIG } from '../config/gameConfig';
import { createUnit } from '../model/unit';
import { Simulation } from './Simulation';

describe('Phase 5 match modes and difficulty integration', () => {
  it('supports every starting faction and keeps Last Faction Standing untimed', () => {
    for (const startingFaction of ['rock', 'paper', 'scissors'] as const) {
      const simulation = new Simulation(51, {
        startingFaction,
        mode: 'last-faction-standing',
      });
      simulation.elapsedMs = GAME_CONFIG.gameModes.blitz.timeLimitMs! + 1;
      simulation.update(20, { x: 0, y: 0 });

      expect(simulation.playerFaction).toBe(startingFaction);
      expect(simulation.units.find((unit) => unit.recruited)?.faction).toBe(startingFaction);
      expect(simulation.status).toBe('active');
      expect(simulation.snapshot().remainingMs).toBeUndefined();
    }
  });

  it('pauses the Blitz timer and loses on timeout', () => {
    const simulation = new Simulation(52, { mode: 'blitz' });
    const before = simulation.snapshot().remainingMs;
    simulation.setPaused(true);
    simulation.update(1_000, { x: 0, y: 0 });
    expect(simulation.snapshot().remainingMs).toBe(before);

    simulation.setPaused(false);
    simulation.elapsedMs = GAME_CONFIG.gameModes.blitz.timeLimitMs! - 10;
    simulation.update(20, { x: 0, y: 0 });
    expect(simulation.status).toBe('defeat');
    expect(simulation.snapshot().remainingMs).toBe(0);
  });

  it('wins when both opposing factions are eliminated before the Blitz timeout', () => {
    const simulation = new Simulation(53, {
      startingFaction: 'paper',
      mode: 'blitz',
    });
    simulation.killFaction('rock');
    simulation.killFaction('scissors');

    expect(simulation.status).toBe('victory');
    expect(simulation.snapshot().score.final?.victoryBonus).toBe(
      GAME_CONFIG.scoring.victoryBonusPoints,
    );
  });

  it('uses authoritative combat attribution and resets score on restart', () => {
    const simulation = new Simulation(54, { mode: 'last-faction-standing' });
    const player = createUnit('player', 'rock', { x: 500, y: 500 }, true);
    const prey = createUnit('prey', 'scissors', { x: 500, y: 500 });
    const predator = createUnit('predator', 'paper', { x: 500, y: 500 });
    prey.health = 1;
    predator.health = 1;
    simulation.units = [player, prey, predator];
    simulation.anchorId = player.id;

    simulation.update(GAME_CONFIG.simulation.fixedStepMs, { x: 0, y: 0 });
    expect(simulation.snapshot().score.killPoints).toBe(
      GAME_CONFIG.scoring.preyDefeatedPoints + GAME_CONFIG.scoring.predatorDefeatedPoints,
    );

    simulation.restart(54);
    expect(simulation.snapshot().score.current).toBe(0);
  });

  it('applies difficulty to population, AI, dash, and shrine without changing defaults', () => {
    const normal = new Simulation(55, { difficulty: 'normal' });
    const chaos = new Simulation(55, { difficulty: 'chaos' });
    const casual = new Simulation(55, { difficulty: 'casual' });
    const normalEnemies = normal.units.filter((unit) => unit.faction !== normal.playerFaction);
    const chaosEnemies = chaos.units.filter((unit) => unit.faction !== chaos.playerFaction);

    expect(chaosEnemies.length).toBeGreaterThan(normalEnemies.length);
    expect(chaosEnemies[0]!.motion.maxSpeed).toBeGreaterThan(normalEnemies[0]!.motion.maxSpeed);
    expect(casual.snapshot().dash.cooldownMs).toBe(
      GAME_CONFIG.dash.baseCooldownMs *
        GAME_CONFIG.factionPassives.rock.dashCooldownMultiplier *
        0.85,
    );
    expect(casual.snapshot().shrine.sacrificePreview).toBe(1);
    expect(GAME_CONFIG.shrine.sacrificeRatio).toBe(0.2);
  });
});
