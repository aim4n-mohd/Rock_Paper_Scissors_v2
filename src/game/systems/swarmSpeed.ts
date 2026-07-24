export function calculateSwarmSpeedMultiplier(
  recruitedCount: number,
  speedBonusPerUnit: number,
  maxSwarmSpeedBonus: number,
): number {
  const safeCount = Math.max(0, Number.isFinite(recruitedCount) ? recruitedCount : 0);
  const safeBonusPerUnit = Math.max(0, Number.isFinite(speedBonusPerUnit) ? speedBonusPerUnit : 0);
  const safeMaximum = Math.max(0, Number.isFinite(maxSwarmSpeedBonus) ? maxSwarmSpeedBonus : 0);
  const sizeBonus = Math.min(safeMaximum, Math.max(0, safeCount - 1) * safeBonusPerUnit);
  return 1 + sizeBonus;
}
