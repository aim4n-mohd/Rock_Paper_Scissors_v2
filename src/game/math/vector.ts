export interface Vector {
  x: number;
  y: number;
}
export const vec = (x = 0, y = 0): Vector => ({ x, y });
export const add = (a: Vector, b: Vector): Vector => vec(a.x + b.x, a.y + b.y);
export const subtract = (a: Vector, b: Vector): Vector => vec(a.x - b.x, a.y - b.y);
export const scale = (value: Vector, scalar: number): Vector =>
  vec(value.x * scalar, value.y * scalar);
export const magnitudeSquared = (value: Vector): number => value.x * value.x + value.y * value.y;
export const magnitude = (value: Vector): number => Math.sqrt(magnitudeSquared(value));
export const distance = (a: Vector, b: Vector): number => magnitude(subtract(a, b));
export function normalize(value: Vector): Vector {
  const length = magnitude(value);
  return length === 0 ? vec() : scale(value, 1 / length);
}
export function clampMagnitude(value: Vector, maximum: number): Vector {
  return magnitudeSquared(value) > maximum * maximum ? scale(normalize(value), maximum) : value;
}
export const average = (values: readonly Vector[]): Vector =>
  values.length === 0 ? vec() : scale(values.reduce(add, vec()), 1 / values.length);
