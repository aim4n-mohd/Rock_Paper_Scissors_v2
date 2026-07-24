import { GAME_CONFIG } from '../config/gameConfig';
import { add, magnitude, scale } from '../math/vector';
import { createUnit } from '../model/unit';
import { updateAiSteering } from './aiMemory';
import { steerVelocity } from './steering';

describe('arcade steering integration', () => {
  it('limits turn rate instead of snapping to the desired heading', () => {
    const motion = {
      ...GAME_CONFIG.units.motion,
      acceleration: 2000,
      drag: 0,
      maxSteeringForce: 2000,
      maxTurnRate: Math.PI / 2,
    };
    const velocity = steerVelocity({ x: 100, y: 0 }, { x: 0, y: 1 }, 100, 100, motion);
    const angle = Math.atan2(velocity.y, velocity.x);

    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThanOrEqual(motion.maxTurnRate * 0.1 + 0.001);
  });

  it('changes velocity through acceleration rather than instant assignment', () => {
    const motion = {
      ...GAME_CONFIG.units.motion,
      acceleration: 200,
      drag: 0,
      maxSteeringForce: 1000,
    };
    const velocity = steerVelocity({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 100, motion);

    expect(velocity.x).toBeGreaterThan(0);
    expect(velocity.x).toBeCloseTo(20, 5);
    expect(magnitude(velocity)).toBeLessThan(100);
  });

  it('decelerates with drag and respects maximum steering force', () => {
    const limited = {
      ...GAME_CONFIG.units.motion,
      acceleration: 2000,
      drag: 0,
      maxSteeringForce: 50,
    };
    expect(steerVelocity({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 100, limited).x).toBeCloseTo(5, 5);

    const slowing = {
      ...GAME_CONFIG.units.motion,
      deceleration: 100,
      drag: 1,
      maxSteeringForce: 1000,
    };
    const velocity = steerVelocity({ x: 100, y: 0 }, { x: 0, y: 0 }, 100, 100, slowing);
    expect(velocity.x).toBeGreaterThan(0);
    expect(velocity.x).toBeLessThan(90);
  });

  it('supports a reduced target-speed scale for gentle formation corrections', () => {
    const motion = {
      ...GAME_CONFIG.units.motion,
      acceleration: 2000,
      drag: 0,
      maxSteeringForce: 2000,
    };
    const full = steerVelocity({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 100, motion);
    const gentle = steerVelocity({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 100, motion, 0.2);

    expect(gentle.x).toBeCloseTo(20);
    expect(gentle.x).toBeLessThan(full.x);
    expect(steerVelocity({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 100, motion, Number.NaN)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('can overshoot a remembered target after a sharp pursuit correction', () => {
    const hunter = createUnit('hunter', 'paper', { x: 100, y: 100 });
    const target = createUnit('target', 'rock', { x: 160, y: 100 });
    hunter.motion = {
      ...hunter.motion,
      maxSpeed: 140,
      acceleration: 600,
      deceleration: 180,
      drag: 0,
      maxSteeringForce: 600,
      maxTurnRate: Math.PI,
      decisionIntervalMs: 2000,
      reactionDelayMs: 0,
      predictionTimeMs: 0,
      predictionError: 0,
    };
    let furthestX = hunter.position.x;

    for (let nowMs = 0; nowMs <= 1200; nowMs += 50) {
      const decision = updateAiSteering(hunter, [hunter, target], nowMs, 5);
      hunter.velocity = steerVelocity(
        hunter.velocity,
        decision.direction,
        hunter.motion.maxSpeed,
        50,
        hunter.motion,
      );
      hunter.position = add(hunter.position, scale(hunter.velocity, 0.05));
      furthestX = Math.max(furthestX, hunter.position.x);
    }

    expect(furthestX).toBeGreaterThan(target.position.x + 5);
  });
});
