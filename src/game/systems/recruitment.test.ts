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

  it('uses living recruited units only for the effective capped radius', () => {
    const leader = createUnit('leader', 'rock', { x: 0, y: 0 }, true);
    const recruited = Array.from({ length: 10 }, (_, index) =>
      createUnit(`member-${index}`, 'rock', { x: 0, y: index + 1 }, true),
    );
    const atExpandedRadius = createUnit('expanded', 'rock', { x: 84, y: 0 });
    const neutral = createUnit('neutral', 'rock', { x: 200, y: 0 });
    const enemy = createUnit('enemy', 'paper', { x: 1, y: 0 });
    const dead = createUnit('dead', 'rock', { x: 0, y: 0 }, true);
    dead.alive = false;

    expect(
      recruitNearbyFaction([leader, ...recruited, atExpandedRadius, neutral, enemy, dead], 'rock'),
    ).toEqual(['expanded']);
    expect(enemy.recruited).toBe(false);
    expect(neutral.recruited).toBe(false);
  });

  it('expands the effective radius immediately after a same-step recruitment', () => {
    const leader = createUnit('leader', 'rock', { x: 0, y: 0 }, true);
    const first = createUnit('first', 'rock', { x: 54, y: 0 });
    const second = createUnit('second', 'rock', { x: 112, y: 0 });

    expect(recruitNearbyFaction([leader, first, second], 'rock')).toEqual(['first', 'second']);
    expect(first.recruited).toBe(true);
    expect(second.recruited).toBe(true);
  });
});
