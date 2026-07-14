import { gameBridge } from './gameBridge';

describe('game bridge', () => {
  afterEach(() => gameBridge.reset());

  it('publishes authoritative snapshots and unsubscribes cleanly', () => {
    const listener = vi.fn();
    const unsubscribe = gameBridge.subscribe(listener);
    gameBridge.publish({
      status: 'active',
      counts: { rock: 3, paper: 2, scissors: 1 },
      elapsedMs: 100,
      recruitedCount: 2,
      swarmCenter: { x: 10, y: 20 },
    });
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    gameBridge.publish({
      status: 'paused',
      counts: { rock: 3, paper: 2, scissors: 1 },
      elapsedMs: 100,
      recruitedCount: 2,
      swarmCenter: { x: 10, y: 20 },
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('normalizes keyboard movement and forwards commands', () => {
    const togglePause = vi.fn();
    gameBridge.bindController({ togglePause, restart: vi.fn(), killFaction: vi.fn() });
    gameBridge.setKey('d', true);
    gameBridge.setKey('w', true);
    expect(gameBridge.input.x).toBeCloseTo(Math.SQRT1_2);
    expect(gameBridge.input.y).toBeCloseTo(-Math.SQRT1_2);
    gameBridge.togglePause();
    expect(togglePause).toHaveBeenCalledOnce();
  });
});
