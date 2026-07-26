import { getPredator, getPrey, type Faction } from '../config/factions';
import { GAME_CONFIG } from '../config/gameConfig';
import { createUnit } from '../model/unit';
import { calculateShrineSacrificeCount } from '../systems/shrine';
import { Simulation, type SimulationOptions } from './Simulation';

function preparedSimulation(recruitedCount = 5, options: SimulationOptions = {}): Simulation {
  const simulation = new Simulation(41, options);
  const shrine = GAME_CONFIG.landmarks.shrine;
  const recruited = Array.from({ length: recruitedCount }, (_, index) =>
    createUnit(
      `recruited-${index}`,
      'rock',
      { x: shrine.x + (index - recruitedCount / 2) * 22, y: shrine.y },
      true,
    ),
  );
  simulation.units = [
    ...recruited,
    createUnit('former-neutral', 'rock', { x: shrine.x + 300, y: shrine.y }),
    createUnit('new-neutral', 'paper', { x: shrine.x + 500, y: shrine.y + 300 }),
    createUnit('other-enemy', 'scissors', { x: shrine.x - 500, y: shrine.y - 300 }),
  ];
  simulation.anchorId = recruited[0]?.id;
  return simulation;
}

function advance(
  simulation: Simulation,
  durationMs: number,
  interactionHeld: boolean,
  input = { x: 0, y: 0 },
): void {
  for (let elapsed = 0; elapsed < durationMs; elapsed += 250)
    simulation.update(Math.min(250, durationMs - elapsed), input, interactionHeld);
}

function activate(simulation: Simulation, faction: Faction = 'paper'): void {
  expect(simulation.selectShrineFaction(faction)).toBe(true);
  advance(simulation, GAME_CONFIG.shrine.channelDurationMs, true);
  expect(simulation.snapshot().shrine.status).toBe('used');
}

describe('Triad Shrine integration', () => {
  it('cannot activate outside its radius', () => {
    const simulation = preparedSimulation();
    for (const unit of simulation.units.filter((candidate) => candidate.recruited))
      unit.position.x += GAME_CONFIG.shrine.activationRadius + 200;

    expect(simulation.selectShrineFaction('paper')).toBe(true);
    advance(simulation, 500, true);

    expect(simulation.snapshot().shrine.channelProgressMs).toBe(0);
    expect(simulation.snapshot().shrine.status).toBe('available');
  });

  it('progresses while the swarm remains inside and interaction is held', () => {
    const simulation = preparedSimulation();
    simulation.selectShrineFaction('paper');

    advance(simulation, 500, true);

    expect(simulation.snapshot().shrine.status).toBe('channeling');
    expect(simulation.snapshot().shrine.channelProgressMs).toBeCloseTo(500, 1);
  });

  it('cancels channel progress when the swarm leaves the radius', () => {
    const simulation = preparedSimulation();
    simulation.selectShrineFaction('paper');
    advance(simulation, 500, true);
    const leavingUnit = simulation.units.find((candidate) => candidate.recruited)!;
    leavingUnit.position.x =
      GAME_CONFIG.landmarks.shrine.x + GAME_CONFIG.shrine.activationRadius + 100;

    advance(simulation, 50, true);

    expect(simulation.snapshot().shrine.status).toBe('available');
    expect(simulation.snapshot().shrine.channelProgressMs).toBe(0);
  });

  it('interrupts channeling after a qualifying predator hit', () => {
    const simulation = preparedSimulation();
    simulation.selectShrineFaction('paper');
    advance(simulation, 500, true);
    const anchor = simulation.units.find((unit) => unit.id === simulation.anchorId)!;
    const predator = simulation.units.find((unit) => unit.id === 'new-neutral')!;
    predator.position = { ...anchor.position };

    advance(simulation, GAME_CONFIG.simulation.fixedStepMs, true);

    expect(anchor.health).toBeLessThan(anchor.maxHealth);
    expect(simulation.snapshot().shrine.status).toBe('available');
    expect(simulation.snapshot().shrine.channelProgressMs).toBe(0);
  });

  it('cannot channel with fewer than the configured minimum recruited units', () => {
    const simulation = preparedSimulation(GAME_CONFIG.shrine.minimumRecruitedUnits - 1);
    simulation.selectShrineFaction('paper');

    advance(simulation, 500, true);

    expect(simulation.snapshot().shrine.canActivate).toBe(false);
    expect(simulation.snapshot().shrine.channelProgressMs).toBe(0);
  });

  it('rejects selecting the current player faction', () => {
    const simulation = preparedSimulation();

    expect(simulation.selectShrineFaction('rock')).toBe(false);
    expect(simulation.snapshot().shrine.selectedFaction).toBeUndefined();
  });

  it('allows either opposing faction to be selected explicitly', () => {
    const simulation = preparedSimulation();

    expect(simulation.selectShrineFaction('paper')).toBe(true);
    expect(simulation.snapshot().shrine.selectedFaction).toBe('paper');
    expect(simulation.selectShrineFaction('scissors')).toBe(true);
    expect(simulation.snapshot().shrine.selectedFaction).toBe('scissors');
  });

  it('safely transforms between every ordered pair of different factions', () => {
    const pairs = [
      ['rock', 'paper'],
      ['rock', 'scissors'],
      ['paper', 'rock'],
      ['paper', 'scissors'],
      ['scissors', 'rock'],
      ['scissors', 'paper'],
    ] as const;

    for (const [source, target] of pairs) {
      const simulation = preparedSimulation();
      simulation.playerFaction = source;
      for (const unit of simulation.units.filter((candidate) => candidate.recruited))
        unit.faction = source;

      activate(simulation, target);

      expect(simulation.playerFaction).toBe(target);
      expect(
        simulation.units
          .filter((unit) => unit.alive && unit.recruited)
          .every((unit) => unit.faction === target),
      ).toBe(true);
      expect(simulation.snapshot().dash.cooldownMs).toBe(
        GAME_CONFIG.dash.baseCooldownMs *
          GAME_CONFIG.factionPassives[target].dashCooldownMultiplier,
      );
    }
  });

  it('reports a temporary cancelled state after leaving during a channel', () => {
    const simulation = preparedSimulation();
    simulation.selectShrineFaction('paper');
    advance(simulation, 500, true);
    simulation.units.find((candidate) => candidate.recruited)!.position.x +=
      GAME_CONFIG.shrine.activationRadius + 100;

    advance(simulation, GAME_CONFIG.simulation.fixedStepMs, true);

    expect(simulation.snapshot().shrine.cancelledFeedbackRemainingMs).toBeGreaterThan(0);
  });

  it('does not cancel for disadvantage damage', () => {
    const simulation = preparedSimulation();
    simulation.selectShrineFaction('paper');
    advance(simulation, 500, true);
    const anchor = simulation.units.find((unit) => unit.id === simulation.anchorId)!;
    const disadvantagedAttacker = simulation.units.find((unit) => unit.id === 'other-enemy')!;
    disadvantagedAttacker.position = { ...anchor.position };

    advance(simulation, GAME_CONFIG.simulation.fixedStepMs, true);

    expect(anchor.health).toBeLessThan(anchor.maxHealth);
    expect(simulation.snapshot().shrine.status).toBe('channeling');
    expect(simulation.snapshot().shrine.channelProgressMs).toBeGreaterThan(500);
  });

  it('can be configured to cancel for disadvantage damage', () => {
    const simulation = preparedSimulation(5, {
      shrine: {
        interruptOnDisadvantageDamage: true,
        highDamageInterruptThreshold: GAME_CONFIG.combat.disadvantageDamage,
      },
    });
    simulation.selectShrineFaction('paper');
    advance(simulation, 500, true);
    const anchor = simulation.units.find((unit) => unit.id === simulation.anchorId)!;
    simulation.units.find((unit) => unit.id === 'other-enemy')!.position = {
      ...anchor.position,
    };

    advance(simulation, GAME_CONFIG.simulation.fixedStepMs, true);

    expect(simulation.snapshot().shrine.status).toBe('available');
    expect(simulation.snapshot().shrine.channelProgressMs).toBe(0);
    expect(simulation.snapshot().shrine.cancelledFeedbackRemainingMs).toBeGreaterThan(0);
  });

  it('calculates the configured sacrifice percentage rounded up', () => {
    expect(calculateShrineSacrificeCount(5, 0.2)).toBe(1);
    expect(calculateShrineSacrificeCount(6, 0.2)).toBe(2);
  });

  it('sacrifices the correct count and transforms all remaining recruited units', () => {
    const simulation = preparedSimulation(6);

    activate(simulation, 'paper');

    const livingRecruited = simulation.units.filter((unit) => unit.alive && unit.recruited);
    expect(simulation.units.filter((unit) => !unit.alive)).toHaveLength(2);
    expect(livingRecruited).toHaveLength(4);
    expect(livingRecruited.every((unit) => unit.faction === 'paper')).toBe(true);
    expect(simulation.particles.some((particle) => particle.effect === 'shrine')).toBe(true);
    expect(simulation.particles.some((particle) => particle.effect === 'shrine-death')).toBe(true);
  });

  it('keeps transformed survivors recruited', () => {
    const simulation = preparedSimulation();

    activate(simulation, 'scissors');

    expect(
      simulation.units
        .filter((unit) => unit.alive && unit.faction === 'scissors')
        .filter((unit) => unit.id.startsWith('recruited-'))
        .every((unit) => unit.recruited),
    ).toBe(true);
  });

  it('updates faction relationships immediately', () => {
    const simulation = preparedSimulation();

    activate(simulation, 'paper');

    expect(simulation.playerFaction).toBe('paper');
    expect(getPrey(simulation.playerFaction)).toBe('rock');
    expect(getPredator(simulation.playerFaction)).toBe('scissors');
  });

  it('updates faction passives, dash cooldown, and recruitment radius immediately', () => {
    const simulation = preparedSimulation();

    activate(simulation, 'scissors');

    expect(simulation.snapshot().dash.cooldownMs).toBe(
      GAME_CONFIG.dash.baseCooldownMs * GAME_CONFIG.factionPassives.scissors.dashCooldownMultiplier,
    );
    const transformedCount = simulation.units.filter(
      (unit) => unit.alive && unit.recruited && unit.faction === 'scissors',
    ).length;
    expect(simulation.currentRecruitmentRadius()).toBe(
      GAME_CONFIG.recruitment.baseRadius +
        Math.max(0, transformedCount - 1) * GAME_CONFIG.recruitment.radiusBonusPerUnit,
    );
    expect(
      simulation.units
        .filter((unit) => unit.alive && unit.recruited)
        .every((unit) => unit.faction === 'scissors'),
    ).toBe(true);
  });

  it('recruits nearby neutral units of the transformed faction', () => {
    const simulation = preparedSimulation();
    activate(simulation, 'paper');
    const newNeutral = simulation.units.find((unit) => unit.id === 'new-neutral')!;
    newNeutral.position = { ...simulation.swarmCenter() };

    advance(simulation, GAME_CONFIG.simulation.fixedStepMs, false);

    expect(newNeutral.recruited).toBe(true);
  });

  it('leaves former-faction units independent under ordinary AI', () => {
    const simulation = preparedSimulation();

    activate(simulation, 'paper');

    const formerAlly = simulation.units.find((unit) => unit.id === 'former-neutral')!;
    expect(formerAlly.faction).toBe('rock');
    expect(formerAlly.recruited).toBe(false);
    expect(formerAlly.intent).not.toBe('player');
    formerAlly.position = { ...simulation.swarmCenter() };
    advance(simulation, GAME_CONFIG.simulation.fixedStepMs, false);
    expect(formerAlly.recruited).toBe(false);
  });

  it('clears stale targeting for every independent unit after switching', () => {
    const simulation = preparedSimulation();
    for (const unit of simulation.units.filter((candidate) => !candidate.recruited)) {
      unit.targetId = simulation.anchorId;
      unit.aiMemory.active = {
        intent: 'chase',
        direction: { x: 1, y: 0 },
        targetId: simulation.anchorId,
      };
    }

    activate(simulation, 'paper');

    expect(
      simulation.units
        .filter((unit) => unit.alive && !unit.recruited)
        .every((unit) => unit.targetId === undefined && unit.aiMemory.active === undefined),
    ).toBe(true);
  });

  it('publishes current player faction, transformed counts, and sacrifice preview', () => {
    const simulation = preparedSimulation();
    expect(simulation.snapshot().shrine.sacrificePreview).toBe(1);

    activate(simulation, 'paper');

    expect(simulation.snapshot()).toMatchObject({
      playerFaction: 'paper',
      recruitedCount: 4,
      counts: { rock: 1, paper: 5, scissors: 1 },
      shrine: { status: 'used', sacrificePreview: 0 },
    });
  });

  it('cannot be used twice during one match', () => {
    const simulation = preparedSimulation();
    activate(simulation, 'paper');

    expect(simulation.selectShrineFaction('scissors')).toBe(false);
    advance(simulation, GAME_CONFIG.shrine.channelDurationMs, true);

    expect(simulation.playerFaction).toBe('paper');
    expect(simulation.snapshot().shrine.usesRemaining).toBe(0);
  });

  it('applies and expires the post-transformation movement penalty', () => {
    const simulation = preparedSimulation();
    activate(simulation, 'paper');

    expect(simulation.snapshot().shrine.movementPenaltyRemainingMs).toBe(
      GAME_CONFIG.shrine.postTransformPenaltyMs,
    );
    advance(simulation, GAME_CONFIG.shrine.postTransformPenaltyMs, false);
    expect(simulation.snapshot().shrine.movementPenaltyRemainingMs).toBe(0);
  });

  it('uses the current player faction for victory and defeat', () => {
    const victory = preparedSimulation();
    activate(victory, 'paper');
    victory.killFaction('rock');
    expect(victory.status).toBe('active');
    victory.killFaction('scissors');
    expect(victory.status).toBe('victory');

    const defeat = preparedSimulation();
    activate(defeat, 'paper');
    defeat.killFaction('paper');
    expect(defeat.status).toBe('defeat');
  });

  it('resets faction, selection, usage, progress, and penalty on restart', () => {
    const simulation = preparedSimulation();
    activate(simulation, 'paper');

    simulation.restart(41);

    expect(simulation.playerFaction).toBe('rock');
    expect(simulation.snapshot().shrine).toMatchObject({
      status: 'available',
      channelProgressMs: 0,
      usesRemaining: GAME_CONFIG.shrine.usesPerMatch,
      movementPenaltyRemainingMs: 0,
    });
    expect(simulation.snapshot().shrine.selectedFaction).toBeUndefined();
  });

  it('greatly slows recruited movement during channeling', () => {
    const normal = preparedSimulation();
    const channeling = preparedSimulation();
    channeling.selectShrineFaction('paper');

    advance(normal, 500, false, { x: 1, y: 0 });
    advance(channeling, 500, true, { x: 1, y: 0 });

    const shrineX = GAME_CONFIG.landmarks.shrine.x;
    expect(channeling.swarmCenter().x - shrineX).toBeLessThan(
      (normal.swarmCenter().x - shrineX) * 0.6,
    );
  });

  it('cancels channeling when the interaction key is released', () => {
    const simulation = preparedSimulation();
    simulation.selectShrineFaction('paper');
    advance(simulation, 500, true);

    advance(simulation, 50, false);

    expect(simulation.snapshot().shrine.status).toBe('available');
    expect(simulation.snapshot().shrine.channelProgressMs).toBe(0);
  });

  it('slows movement during post-transformation fatigue', () => {
    const penalized = preparedSimulation();
    const unpenalized = preparedSimulation();
    activate(penalized, 'paper');
    activate(unpenalized, 'paper');
    unpenalized.shrine.movementPenaltyRemainingMs = 0;
    const penalizedStart = penalized.swarmCenter().x;
    const unpenalizedStart = unpenalized.swarmCenter().x;
    expect(penalized.currentEffectiveSwarmSpeed()).toBeCloseTo(
      unpenalized.currentEffectiveSwarmSpeed() * GAME_CONFIG.shrine.postTransformMovementMultiplier,
    );

    advance(penalized, 500, false, { x: 1, y: 0 });
    advance(unpenalized, 500, false, { x: 1, y: 0 });

    expect(penalized.swarmCenter().x - penalizedStart).toBeLessThan(
      unpenalized.swarmCenter().x - unpenalizedStart,
    );
  });

  it('supports a disabled tutorial override and preserves it across restart', () => {
    const simulation = new Simulation(41, { shrine: { enabled: false } });

    expect(simulation.snapshot().shrine.usesRemaining).toBe(0);
    expect(simulation.selectShrineFaction('paper')).toBe(false);

    simulation.restart(42);

    expect(simulation.snapshot().shrine.usesRemaining).toBe(0);
    expect(simulation.snapshot().shrine.status).toBe('used');
  });
});
