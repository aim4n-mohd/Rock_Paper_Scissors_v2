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

function idleSwarmFixture() {
  const simulation = new Simulation(117);
  const center = { x: 1500, y: 1000 };
  const rocks = Array.from({ length: 8 }, (_, index) =>
    createUnit(
      `idle-${index}`,
      'rock',
      {
        x: center.x + (index % 4) * 24 - 36,
        y: center.y + Math.floor(index / 4) * 24 - 12,
      },
      true,
    ),
  );
  simulation.units = [
    ...rocks,
    createUnit('idle-paper', 'paper', { x: 2500, y: 1400 }),
    createUnit('idle-scissors', 'scissors', { x: 2600, y: 1400 }),
  ];
  simulation.anchorId = rocks[0]!.id;
  (simulation as unknown as { playerTarget: { x: number; y: number } }).playerTarget = {
    ...center,
  };
  return { simulation, rocks };
}

function factionMovementFixture(faction: 'rock' | 'paper' | 'scissors') {
  const simulation = new Simulation(211);
  const first = createUnit('faction-player-a', faction, { x: 1200, y: 900 }, true);
  const second = createUnit('faction-player-b', faction, { x: 1230, y: 925 }, true);
  simulation.units = [
    first,
    second,
    createUnit('far-rock', 'rock', { x: 2200, y: 1300 }),
    createUnit('far-paper', 'paper', { x: 2400, y: 1300 }),
    createUnit('far-scissors', 'scissors', { x: 2600, y: 1300 }),
  ];
  simulation.playerFaction = faction;
  simulation.anchorId = first.id;
  (simulation as unknown as { playerTarget: { x: number; y: number } }).playerTarget = {
    ...first.position,
  };
  return { simulation, first, second };
}

describe('responsive imperfect movement integration', () => {
  it('keeps recruited units responsive while accelerating into player input', () => {
    const { simulation, first } = playerFixture();
    const startX = first.position.x;

    simulation.update(120, { x: 1, y: 0 });

    expect(first.position.x).toBeGreaterThan(startX);
    expect(first.velocity.x).toBeGreaterThan(0);
    expect(magnitude(first.velocity)).toBeLessThan(simulation.currentEffectiveSwarmSpeed());
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

  it('updates player speed immediately from living recruited units only', () => {
    const { simulation, first, second } = playerFixture();
    const neutral = createUnit('neutral', 'rock', { x: 1500, y: 900 });
    const enemy = createUnit('enemy', 'paper', { x: 1800, y: 900 });
    simulation.units.push(neutral, enemy);

    expect(simulation.currentSwarmSpeedMultiplier()).toBeCloseTo(1.03);
    neutral.recruited = true;
    expect(simulation.currentSwarmSpeedMultiplier()).toBeCloseTo(1.06);
    second.alive = false;
    expect(simulation.currentSwarmSpeedMultiplier()).toBeCloseTo(1.03);
    neutral.alive = false;
    expect(simulation.currentSwarmSpeedMultiplier()).toBe(1);
    enemy.recruited = true;
    expect(simulation.currentSwarmSpeedMultiplier()).toBe(1);
    expect(first.alive).toBe(true);
  });

  it('recalculates speed in the same fixed step that a nearby unit is recruited', () => {
    const { simulation, first, second } = playerFixture();
    const recruit = createUnit('nearby-recruit', 'rock', {
      x: first.position.x + simulation.currentRecruitmentRadius() - 2,
      y: first.position.y,
    });
    simulation.units.push(recruit);
    expect(simulation.currentSwarmSpeedMultiplier()).toBeCloseTo(1.03);

    simulation.update(GAME_CONFIG.simulation.fixedStepMs, { x: 1, y: 0 });

    expect(recruit.recruited).toBe(true);
    expect(second.alive).toBe(true);
    expect(simulation.currentSwarmSpeedMultiplier()).toBeCloseTo(1.06);
  });

  it('updates the capped recruitment radius immediately from living recruited units only', () => {
    const { simulation, second } = playerFixture();
    const neutral = createUnit('neutral-radius', 'rock', { x: 1800, y: 900 });
    const enemy = createUnit('enemy-radius', 'paper', { x: 1850, y: 900 });
    simulation.units.push(neutral, enemy);

    expect(simulation.currentRecruitmentRadius()).toBe(58);
    neutral.recruited = true;
    expect(simulation.currentRecruitmentRadius()).toBe(61);
    enemy.recruited = true;
    expect(simulation.currentRecruitmentRadius()).toBe(61);
    second.alive = false;
    expect(simulation.currentRecruitmentRadius()).toBe(58);
    neutral.alive = false;
    expect(simulation.currentRecruitmentRadius()).toBe(55);

    for (let index = 0; index < 100; index += 1)
      simulation.units.push(createUnit(`radius-cap-${index}`, 'rock', { x: 2000, y: 1000 }, true));
    expect(simulation.currentRecruitmentRadius()).toBe(130);
  });

  it('moves a larger recruited swarm faster while preserving acceleration and loose spacing', () => {
    const single = new Simulation(91);
    const singleRock = createUnit('single', 'rock', { x: 1400, y: 1100 }, true);
    single.units = [
      singleRock,
      createUnit('single-paper', 'paper', { x: 2500, y: 1400 }),
      createUnit('single-scissors', 'scissors', { x: 2600, y: 1400 }),
    ];
    single.anchorId = singleRock.id;

    const large = new Simulation(91);
    const largeRocks = Array.from({ length: 10 }, (_, index) =>
      createUnit(`large-${index}`, 'rock', { x: 1400, y: 900 + index * 24 }, true),
    );
    large.units = [
      ...largeRocks,
      createUnit('large-paper', 'paper', { x: 2500, y: 1400 }),
      createUnit('large-scissors', 'scissors', { x: 2600, y: 1400 }),
    ];
    large.anchorId = largeRocks[0]!.id;

    single.update(700, { x: 1, y: 0 });
    large.update(700, { x: 1, y: 0 });

    expect(large.currentEffectiveSwarmSpeed()).toBeGreaterThan(single.currentEffectiveSwarmSpeed());
    expect(largeRocks[0]!.position.x - 1400).toBeGreaterThan(singleRock.position.x - 1400);
    expect(largeRocks[0]!.velocity).not.toEqual(largeRocks[1]!.velocity);
    expect(magnitude(largeRocks[0]!.velocity)).toBeLessThanOrEqual(
      large.currentEffectiveSwarmSpeed(),
    );
  });

  it('does not change independent AI maximum speed when the recruited swarm grows', () => {
    const { simulation } = playerFixture();
    const enemy = simulation.units.find((unit) => !unit.recruited)!;
    const configuredMaximum = enemy.motion.maxSpeed;
    for (let index = 0; index < 20; index += 1)
      simulation.units.push(
        createUnit(`extra-${index}`, 'rock', { x: 1100 + index * 20, y: 1000 }, true),
      );

    simulation.update(300, { x: 1, y: 0 });

    expect(enemy.motion.maxSpeed).toBe(configuredMaximum);
    expect(magnitude(enemy.velocity)).toBeLessThanOrEqual(
      configuredMaximum * enemy.motion.fleeSpeedMultiplier,
    );
  });

  it('responds sharply to reversed input without an instantaneous velocity flip', () => {
    const { simulation, first } = playerFixture();
    simulation.update(180, { x: 1, y: 0 });
    const beforeReverse = first.velocity.x;

    simulation.update(50, { x: -1, y: 0 });

    expect(first.velocity.x).toBeLessThan(beforeReverse);
    expect(first.velocity.x).toBeGreaterThan(-simulation.currentEffectiveSwarmSpeed());
  });

  it('keeps remembered AI pursuit from mirroring a same-frame player reversal', () => {
    const simulation = new Simulation(313);
    const target = createUnit('direction-target', 'rock', { x: 1300, y: 900 }, true);
    const hunter = createUnit('direction-hunter', 'paper', { x: 1150, y: 900 });
    const scissors = createUnit('direction-scissors', 'scissors', { x: 2500, y: 1400 });
    simulation.units = [target, hunter, scissors];
    simulation.anchorId = target.id;

    simulation.update(300, { x: 1, y: 0 });
    const remembered = { ...hunter.aiMemory.active!.targetPosition! };
    simulation.update(GAME_CONFIG.simulation.fixedStepMs, { x: -1, y: 0 });

    expect(hunter.aiMemory.active?.targetPosition).toEqual(remembered);
    expect(hunter.aiMemory.active?.targetPosition).not.toEqual(target.position);
  });

  it('applies Paper acceleration, Paper spread, and Scissors turn-rate passives to players only', () => {
    const rock = factionMovementFixture('rock');
    const paper = factionMovementFixture('paper');
    rock.simulation.update(100, { x: 1, y: 0 });
    paper.simulation.update(100, { x: 1, y: 0 });
    expect(paper.first.velocity.x).toBeGreaterThan(rock.first.velocity.x);
    expect(magnitude(paper.second.swarmOffset)).toBeGreaterThan(magnitude(rock.second.swarmOffset));

    const turningRock = factionMovementFixture('rock');
    const turningScissors = factionMovementFixture('scissors');
    turningRock.first.velocity = { x: 100, y: 0 };
    turningScissors.first.velocity = { x: 100, y: 0 };
    turningRock.simulation.update(100, { x: 0, y: -1 });
    turningScissors.simulation.update(100, { x: 0, y: -1 });
    expect(Math.abs(turningScissors.first.velocity.y)).toBeGreaterThan(
      Math.abs(turningRock.first.velocity.y),
    );
    expect(turningRock.first.motion).toEqual(turningScissors.first.motion);
  });

  it('settles instead of roaming when the player releases all movement input', () => {
    const { simulation, rocks } = idleSwarmFixture();
    simulation.update(500, { x: 1, y: 0 });
    simulation.update(1500, { x: 0, y: 0 });
    const settledCenter = simulation.swarmCenter();

    simulation.update(500, { x: 0, y: 0 });

    expect(distance(simulation.swarmCenter(), settledCenter)).toBeLessThan(3);
    expect(Math.max(...rocks.map((rock) => magnitude(rock.velocity)))).toBeLessThan(12);
  });

  it('holds an idle recruited swarm in a tighter compact formation', () => {
    const { simulation, rocks } = idleSwarmFixture();

    simulation.update(2500, { x: 0, y: 0 });

    const center = simulation.swarmCenter();
    expect(Math.max(...rocks.map((rock) => distance(rock.position, center)))).toBeLessThanOrEqual(
      55,
    );
    expect(
      rocks.every(
        (rock) =>
          rock.position.x >= GAME_CONFIG.world.padding + rock.radius &&
          rock.position.y >= GAME_CONFIG.world.padding + rock.radius,
      ),
    ).toBe(true);
  });
});
