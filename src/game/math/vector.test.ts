import {
  add,
  clampMagnitude,
  distance,
  magnitude,
  normalize,
  scale,
  subtract,
  vec,
} from './vector';

describe('vector helpers', () => {
  it('supports basic vector arithmetic', () => {
    expect(add(vec(2, 3), vec(4, -1))).toEqual(vec(6, 2));
    expect(subtract(vec(2, 3), vec(4, -1))).toEqual(vec(-2, 4));
    expect(scale(vec(2, 3), 2)).toEqual(vec(4, 6));
    expect(distance(vec(0, 0), vec(3, 4))).toBe(5);
  });

  it('normalizes safely and clamps magnitude', () => {
    expect(normalize(vec(0, 0))).toEqual(vec(0, 0));
    expect(magnitude(normalize(vec(3, 4)))).toBeCloseTo(1);
    expect(magnitude(clampMagnitude(vec(6, 8), 5))).toBeCloseTo(5);
  });
});
