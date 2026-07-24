import type { UnitMotionConfig } from '../config/gameConfig';
import {
  add,
  clampMagnitude,
  magnitude,
  normalize,
  rotate,
  scale,
  subtract,
  vec,
  type Vector,
} from '../math/vector';

function signedAngle(from: Vector, to: Vector): number {
  return Math.atan2(from.x * to.y - from.y * to.x, from.x * to.x + from.y * to.y);
}

export function turnToward(current: Vector, desired: Vector, maximumRadians: number): Vector {
  const normalizedDesired = normalize(desired);
  if (magnitude(normalizedDesired) === 0) return vec();
  const normalizedCurrent = normalize(current);
  if (magnitude(normalizedCurrent) === 0) return normalizedDesired;
  const angle = signedAngle(normalizedCurrent, normalizedDesired);
  const limited = Math.max(-maximumRadians, Math.min(maximumRadians, angle));
  return normalize(rotate(normalizedCurrent, limited));
}

export function steerVelocity(
  currentVelocity: Vector,
  desiredDirection: Vector,
  maximumSpeed: number,
  deltaMs: number,
  motion: UnitMotionConfig,
  targetSpeedScale = 1,
): Vector {
  const seconds = Math.max(0, deltaMs) / 1000;
  if (seconds === 0) return { ...currentVelocity };
  const desired = normalize(desiredDirection);
  const currentSpeed = magnitude(currentVelocity);

  if (magnitude(desired) === 0) {
    const braking = Math.min(motion.deceleration, motion.maxSteeringForce) * seconds;
    const slowed = Math.max(0, currentSpeed - braking);
    const dragged = slowed * Math.exp(-motion.drag * seconds);
    return dragged === 0 ? vec() : scale(normalize(currentVelocity), dragged);
  }

  const safeTargetScale = Number.isFinite(targetSpeedScale)
    ? Math.max(0, Math.min(1, targetSpeedScale))
    : 0;
  const targetSpeed = maximumSpeed * safeTargetScale;
  const limitedHeading = turnToward(currentVelocity, desired, motion.maxTurnRate * seconds);
  const targetVelocity = scale(limitedHeading, targetSpeed);
  const change = subtract(targetVelocity, currentVelocity);
  const speedRate = currentSpeed < targetSpeed ? motion.acceleration : motion.deceleration;
  const maximumChange = Math.min(speedRate, motion.maxSteeringForce) * seconds;
  const accelerated = add(currentVelocity, clampMagnitude(change, maximumChange));
  const dragged = scale(accelerated, Math.exp(-motion.drag * seconds));
  return clampMagnitude(dragged, maximumSpeed);
}
