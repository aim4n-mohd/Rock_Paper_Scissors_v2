export function calculateRecruitmentRadius(
  livingRecruitedCount: number,
  baseRadius: number,
  radiusBonusPerUnit: number,
  maximumRadiusBonus: number,
): number {
  const safeCount = Math.max(0, Number.isFinite(livingRecruitedCount) ? livingRecruitedCount : 0);
  const safeBase = Math.max(0, Number.isFinite(baseRadius) ? baseRadius : 0);
  const safeBonusPerUnit = Math.max(
    0,
    Number.isFinite(radiusBonusPerUnit) ? radiusBonusPerUnit : 0,
  );
  const safeMaximum = Math.max(0, Number.isFinite(maximumRadiusBonus) ? maximumRadiusBonus : 0);
  const sizeBonus = Math.min(safeMaximum, Math.max(0, safeCount - 1) * safeBonusPerUnit);
  return safeBase + sizeBonus;
}
