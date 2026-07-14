import { createUnit } from '../model/unit';
import { closestUnit, unitsWithinRadius } from './spatial';

describe('spatial queries', () => {
  const source = createUnit('source', 'rock', { x: 0, y: 0 });
  const near = createUnit('near', 'scissors', { x: 10, y: 0 });
  const far = createUnit('far', 'scissors', { x: 30, y: 0 });
  const dead = createUnit('dead', 'paper', { x: 2, y: 0 });
  dead.alive = false;

  it('returns only living nearby units and excludes the source', () => {
    expect(unitsWithinRadius(source, [source, near, far, dead], 15).map((unit) => unit.id)).toEqual(
      ['near'],
    );
  });

  it('returns the closest matching unit or undefined', () => {
    expect(closestUnit(source, [far, near], (unit) => unit.faction === 'scissors')?.id).toBe(
      'near',
    );
    expect(closestUnit(source, [far, near], (unit) => unit.faction === 'paper')).toBeUndefined();
  });
});
