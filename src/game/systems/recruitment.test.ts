import { createUnit } from '../model/unit';
import { recruitNearbyFaction } from './recruitment';

describe('player-faction recruitment', () => {
  it('permanently recruits only nearby neutral units of the current player faction', () => {
    const leader = createUnit('leader', 'rock', { x: 0, y: 0 }, true);
    const near = createUnit('near', 'rock', { x: 30, y: 0 });
    const far = createUnit('far', 'rock', { x: 300, y: 0 });
    const paper = createUnit('paper', 'paper', { x: 10, y: 0 });
    expect(recruitNearbyFaction([leader, near, far, paper], 'rock')).toEqual(['near']);
    expect(near.recruited).toBe(true);
    expect(recruitNearbyFaction([leader, near, far, paper], 'rock')).toEqual([]);
    leader.recruited = false;
    paper.recruited = true;
    const paperAlly = createUnit('paper-ally', 'paper', { x: 20, y: 0 });
    expect(recruitNearbyFaction([paper, paperAlly, near], 'paper')).toEqual(['paper-ally']);
  });
});
