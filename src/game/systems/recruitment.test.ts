import { createUnit } from '../model/unit';
import { recruitNearbyRocks } from './recruitment';

describe('Rock recruitment', () => {
  it('permanently recruits every neutral Rock near any recruited Rock', () => {
    const leader = createUnit('leader', 'rock', { x: 0, y: 0 }, true);
    const near = createUnit('near', 'rock', { x: 30, y: 0 });
    const far = createUnit('far', 'rock', { x: 300, y: 0 });
    const paper = createUnit('paper', 'paper', { x: 10, y: 0 });
    expect(recruitNearbyRocks([leader, near, far, paper])).toEqual(['near']);
    expect(near.recruited).toBe(true);
    expect(recruitNearbyRocks([leader, near, far, paper])).toEqual([]);
  });
});
