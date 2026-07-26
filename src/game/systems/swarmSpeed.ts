export function calculateSwarmSpeedMultiplier(
  recruitedCount: number,
  speedBonusPerRecruitedUnit: number,
  maximumSwarmSpeedBonus: number,
): number {
  const safeCount = Math.max(0, Number.isFinite(recruitedCount) ? recruitedCount : 0);
  const safeBonusPerUnit = Math.max(
    0,
    Number.isFinite(speedBonusPerRecruitedUnit) ? speedBonusPerRecruitedUnit : 0,
  );
  const safeMaximum = Math.max(
    0,
    Number.isFinite(maximumSwarmSpeedBonus) ? maximumSwarmSpeedBonus : 0,
  );
  const sizeBonus = Math.min(safeMaximum, Math.max(0, safeCount - 1) * safeBonusPerUnit);
  return 1 + sizeBonus;
}
