import { GAME_CONFIG } from '../config/gameConfig';
import { createUnit } from '../model/unit';
import { predictTargetPosition, updateAiSteering } from './aiMemory';

function pursuitPair() {
  const hunter = createUnit('hunter', 'paper', { x: 100, y: 100 });
  const target = createUnit('target', 'rock', { x: 200, y: 100 }, true);
  hunter.motion = {
    ...hunter.motion,
    decisionIntervalMs: 240,
    reactionDelayMs: 120,
    predictionTimeMs: 200,
    predictionError: 0,
  };
  target.velocity = { x: 50, y: 0 };
  return { hunter, target };
}

describe('remembered AI decisions', () => {
  it('does not change pursuit direction on the same frame as its target turns', () => {
    const { hunter, target } = pursuitPair();
    updateAiSteering(hunter, [hunter, target], 0, 17);
    updateAiSteering(hunter, [hunter, target], hunter.motion.reactionDelayMs, 17);
    const remembered = { ...hunter.aiMemory.active!.targetPosition! };

    target.velocity = { x: 0, y: 50 };
    const immediate = updateAiSteering(
      hunter,
      [hunter, target],
      hunter.motion.reactionDelayMs + 1,
      17,
    );

    expect(hunter.aiMemory.active?.targetPosition).toEqual(remembered);
    expect(immediate.direction.x).toBeGreaterThan(0);
    expect(immediate.direction.y).toBe(0);
  });

  it('updates pursuit only after the next decision and configured reaction delay', () => {
    const { hunter, target } = pursuitPair();
    updateAiSteering(hunter, [hunter, target], 0, 17);
    updateAiSteering(hunter, [hunter, target], hunter.motion.reactionDelayMs, 17);
    const oldPrediction = { ...hunter.aiMemory.active!.targetPosition! };
    target.velocity = { x: 0, y: 50 };

    updateAiSteering(hunter, [hunter, target], hunter.motion.decisionIntervalMs, 17);
    expect(hunter.aiMemory.active?.targetPosition).toEqual(oldPrediction);
    updateAiSteering(
      hunter,
      [hunter, target],
      hunter.motion.decisionIntervalMs + hunter.motion.reactionDelayMs - 1,
      17,
    );
    expect(hunter.aiMemory.active?.targetPosition).toEqual(oldPrediction);

    updateAiSteering(
      hunter,
      [hunter, target],
      hunter.motion.decisionIntervalMs + hunter.motion.reactionDelayMs,
      17,
    );
    expect(hunter.aiMemory.active?.targetPosition?.y).toBeGreaterThan(oldPrediction.y);
  });

  it('keeps flee-predator priority above chase-prey decisions', () => {
    const rock = createUnit('rock', 'rock', { x: 100, y: 100 });
    const paper = createUnit('paper', 'paper', { x: 120, y: 100 });
    const scissors = createUnit('scissors', 'scissors', { x: 90, y: 100 });
    rock.motion = { ...rock.motion, reactionDelayMs: 0 };

    expect(updateAiSteering(rock, [rock, paper, scissors], 0, 3)).toMatchObject({
      intent: 'flee',
      targetId: paper.id,
    });
  });

  it('produces deterministic seeded prediction error', () => {
    const observer = createUnit('observer', 'paper', { x: 100, y: 100 });
    const target = createUnit('target', 'rock', { x: 200, y: 100 });
    target.velocity = { x: 30, y: -10 };
    observer.motion = { ...GAME_CONFIG.units.motion, predictionError: 35 };

    const first = predictTargetPosition(observer, target, 91, 4);
    const repeat = predictTargetPosition(observer, target, 91, 4);
    const otherSeed = predictTargetPosition(observer, target, 92, 4);

    expect(first).toEqual(repeat);
    expect(otherSeed).not.toEqual(first);
  });
});
