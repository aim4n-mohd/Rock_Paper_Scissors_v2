import { TutorialController } from './tutorial';

describe('deterministic tutorial', () => {
  it('uses a non-release map and only advances after each required action', () => {
    const tutorial = new TutorialController();
    expect(tutorial.snapshot()).toMatchObject({ mapId: 'tutorial', stage: 'move' });

    tutorial.update(1000, { x: 0, y: 0 });
    expect(tutorial.snapshot().stage).toBe('move');
    tutorial.update(1000, { x: 1, y: 0 });
    expect(tutorial.snapshot().stage).toBe('recruit');

    tutorial.update(1000, { x: 0, y: 0 });
    expect(tutorial.snapshot().stage).toBe('recruit');
    tutorial.update(250, { x: 1, y: 0 });
    tutorial.update(250, { x: 1, y: 0 });
    expect(tutorial.snapshot().stage).toBe('prey');

    tutorial.requestDash();
    expect(tutorial.snapshot().stage).toBe('prey');
    for (let index = 0; index < 4; index += 1) tutorial.update(250, { x: 1, y: 0 });
    tutorial.update(250, { x: 0, y: -1 });
    expect(tutorial.snapshot().stage).toBe('predator');
    for (let index = 0; index < 5; index += 1) tutorial.update(250, { x: -1, y: 0 });
    expect(tutorial.snapshot().stage).toBe('dash');
    tutorial.requestDash();
    expect(tutorial.snapshot().stage).toBe('shrine');
    for (let index = 0; index < 20 && tutorial.snapshot().stage === 'shrine'; index += 1) {
      const player = tutorial
        .snapshot()
        .entities.find((entity) => entity.role === 'player')!.position;
      tutorial.update(250, { x: 680 - player.x, y: 225 - player.y });
    }
    expect(tutorial.snapshot().stage).toBe('switch');

    tutorial.selectFaction('rock');
    expect(tutorial.snapshot().stage).toBe('switch');
    tutorial.selectFaction('paper');
    expect(tutorial.snapshot()).toMatchObject({ stage: 'complete', playerFaction: 'paper' });
  });

  it('restarts with the same predetermined entities and positions', () => {
    const first = new TutorialController().snapshot();
    const second = new TutorialController().snapshot();
    expect(second.entities).toEqual(first.entities);
  });
});
