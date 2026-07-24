import type { DashSnapshot } from '../systems/dash';

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function calculateDashCooldownFill(dash: DashSnapshot): number {
  if (dash.phase === 'active') return 0;
  if (dash.phase === 'ready') return 1;
  if (!Number.isFinite(dash.cooldownMs) || dash.cooldownMs <= 0) return 1;
  const remaining = Number.isFinite(dash.cooldownRemainingMs)
    ? dash.cooldownRemainingMs
    : dash.cooldownMs;
  return clamp(1 - remaining / dash.cooldownMs);
}
