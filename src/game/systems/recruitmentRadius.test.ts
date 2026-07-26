import { calculateRecruitmentRadius } from './recruitmentRadius';

describe('calculateRecruitmentRadius', () => {
  it.each([
    { count: 0, expected: 55 },
    { count: 1, expected: 55 },
    { count: 2, expected: 58 },
    { count: 10, expected: 82 },
    { count: 999, expected: 130 },
  ])('returns $expected for $count living recruited units', ({ count, expected }) => {
    expect(calculateRecruitmentRadius(count, 55, 3, 75)).toBe(expected);
  });

  it('is deterministic, configuration-driven, and clamps invalid inputs', () => {
    expect(calculateRecruitmentRadius(8, 40, 2, 10)).toBe(50);
    expect(calculateRecruitmentRadius(-5, 40, 2, 10)).toBe(40);
    expect(calculateRecruitmentRadius(Number.NaN, 40, 2, 10)).toBe(40);
  });
});
