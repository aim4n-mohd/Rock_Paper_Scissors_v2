import type {
  FactionPassiveConfig,
  PlayerMovementConfig,
  UnitMotionConfig,
} from '../config/gameConfig';

export function applyPlayerMotionPassives(
  baseMotion: UnitMotionConfig,
  playerMovement: PlayerMovementConfig,
  passive: FactionPassiveConfig,
): UnitMotionConfig {
  const acceleration = playerMovement.acceleration * passive.accelerationMultiplier;
  const deceleration = playerMovement.deceleration * passive.decelerationMultiplier;
  return {
    ...baseMotion,
    acceleration,
    deceleration,
    maxSteeringForce: Math.max(acceleration, deceleration) * playerMovement.steeringResponsiveness,
    maxTurnRate:
      baseMotion.maxTurnRate * playerMovement.steeringResponsiveness * passive.turnRateMultiplier,
  };
}

export function applySwarmSpreadPassive(baseRadius: number, passive: FactionPassiveConfig): number {
  return baseRadius * passive.swarmSpreadMultiplier;
}

export function applySwarmResponsePassive(
  baseResponse: number,
  passive: FactionPassiveConfig,
): number {
  return baseResponse * passive.swarmResponseMultiplier;
}
