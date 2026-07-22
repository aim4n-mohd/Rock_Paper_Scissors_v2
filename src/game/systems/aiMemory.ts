import { add, normalize, scale, subtract, type Vector } from '../math/vector';
import { seededValue } from '../math/random';
import type { RememberedDecision, Unit } from '../model/unit';
import { decideIndependentMovement, type MovementDecision } from './ai';

function seededDirection(seed: number, unitId: string, sequence: number): Vector {
  const angle = seededValue(seed, `${unitId}:wander`, sequence) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function predictTargetPosition(
  observer: Unit,
  target: Unit,
  seed: number,
  sequence: number,
): Vector {
  const predicted = add(
    target.position,
    scale(target.velocity, observer.motion.predictionTimeMs / 1000),
  );
  if (observer.motion.predictionError === 0) return predicted;
  const angle = seededValue(seed, `${observer.id}:${target.id}:angle`, sequence) * Math.PI * 2;
  const radius =
    Math.sqrt(seededValue(seed, `${observer.id}:${target.id}:radius`, sequence)) *
    observer.motion.predictionError;
  return add(predicted, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
}

function rememberDecision(
  unit: Unit,
  units: readonly Unit[],
  seed: number,
  sequence: number,
): RememberedDecision {
  const wanderDirection = seededDirection(seed, unit.id, sequence);
  const selected = decideIndependentMovement(unit, units, wanderDirection);
  const target = selected.targetId
    ? units.find((candidate) => candidate.alive && candidate.id === selected.targetId)
    : undefined;
  const targetPosition = target
    ? selected.intent === 'cohere'
      ? { ...target.position }
      : predictTargetPosition(unit, target, seed, sequence)
    : undefined;
  return {
    intent: selected.intent as RememberedDecision['intent'],
    direction: { ...selected.direction },
    targetId: selected.targetId,
    targetPosition,
  };
}

function directionFor(unit: Unit, decision: RememberedDecision): Vector {
  if (!decision.targetPosition) return decision.direction;
  return decision.intent === 'flee'
    ? normalize(subtract(unit.position, decision.targetPosition))
    : normalize(subtract(decision.targetPosition, unit.position));
}

function activatePending(unit: Unit, nowMs: number): void {
  const pending = unit.aiMemory.pending;
  if (!pending || nowMs < pending.applyAtMs) return;
  unit.aiMemory.active = pending.decision;
  unit.aiMemory.pending = undefined;
}

export function updateAiSteering(
  unit: Unit,
  units: readonly Unit[],
  nowMs: number,
  seed: number,
): MovementDecision {
  activatePending(unit, nowMs);
  if (nowMs >= unit.aiMemory.nextDecisionAtMs) {
    const decision = rememberDecision(unit, units, seed, unit.aiMemory.sequence);
    unit.aiMemory.sequence += 1;
    unit.aiMemory.pending = {
      decision,
      applyAtMs: nowMs + unit.motion.reactionDelayMs,
    };
    unit.aiMemory.nextDecisionAtMs = nowMs + unit.motion.decisionIntervalMs;
    activatePending(unit, nowMs);
  }

  const active = unit.aiMemory.active ?? {
    intent: 'wander' as const,
    direction: seededDirection(seed, unit.id, -1),
  };
  return {
    intent: active.intent,
    direction: directionFor(unit, active),
    targetId: active.targetId,
  };
}
