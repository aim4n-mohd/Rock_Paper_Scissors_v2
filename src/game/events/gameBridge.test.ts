import { gameBridge } from './gameBridge';

describe('game bridge', () => {
  afterEach(() => gameBridge.reset());

  it('publishes authoritative snapshots and unsubscribes cleanly', () => {
    const listener = vi.fn();
    const unsubscribe = gameBridge.subscribe(listener);
    gameBridge.publish({
      status: 'active',
      playerFaction: 'rock',
      counts: { rock: 3, paper: 2, scissors: 1 },
      elapsedMs: 100,
      recruitedCount: 2,
      swarmCenter: { x: 10, y: 20 },
      shrine: {
        status: 'available',
        channelProgressMs: 0,
        channelDurationMs: 2000,
        usesRemaining: 1,
        movementPenaltyRemainingMs: 0,
        transformationEffectRemainingMs: 0,
        inRange: false,
        canActivate: false,
        sacrificePreview: 1,
        minimumRecruitedUnits: 4,
      },
      dash: {
        phase: 'ready',
        ready: true,
        direction: { x: 0, y: 0 },
        activeRemainingMs: 0,
        cooldownRemainingMs: 0,
        cooldownMs: 1200,
      },
    });
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    gameBridge.publish({
      status: 'paused',
      playerFaction: 'rock',
      counts: { rock: 3, paper: 2, scissors: 1 },
      elapsedMs: 100,
      recruitedCount: 2,
      swarmCenter: { x: 10, y: 20 },
      shrine: gameBridge.latest!.shrine,
      dash: gameBridge.latest!.dash,
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('normalizes keyboard movement and forwards commands', () => {
    const togglePause = vi.fn();
    gameBridge.bindController({
      togglePause,
      restart: vi.fn(),
      killFaction: vi.fn(),
      cycleShrineSelection: vi.fn(),
      requestDash: vi.fn(),
    });
    gameBridge.setKey('d', true);
    gameBridge.setKey('w', true);
    expect(gameBridge.input.x).toBeCloseTo(Math.SQRT1_2);
    expect(gameBridge.input.y).toBeCloseTo(-Math.SQRT1_2);
    gameBridge.togglePause();
    expect(togglePause).toHaveBeenCalledOnce();
  });

  it('clears held input when restarting or explicitly losing focus', () => {
    const restart = vi.fn();
    gameBridge.bindController({
      togglePause: vi.fn(),
      restart,
      killFaction: vi.fn(),
      cycleShrineSelection: vi.fn(),
      requestDash: vi.fn(),
    });
    gameBridge.setKey('d', true);
    expect(gameBridge.input.x).toBe(1);
    gameBridge.restart();
    expect(restart).toHaveBeenCalledOnce();
    expect(gameBridge.input).toEqual({ x: 0, y: 0 });
    gameBridge.setKey('w', true);
    gameBridge.clearInput();
    expect(gameBridge.input).toEqual({ x: 0, y: 0 });
  });

  it('restores the previous live controller when an overlapping controller is released', () => {
    const firstPause = vi.fn();
    const secondPause = vi.fn();
    const releaseFirst = gameBridge.bindController({
      togglePause: firstPause,
      restart: vi.fn(),
      killFaction: vi.fn(),
      cycleShrineSelection: vi.fn(),
      requestDash: vi.fn(),
    });
    const releaseSecond = gameBridge.bindController({
      togglePause: secondPause,
      restart: vi.fn(),
      killFaction: vi.fn(),
      cycleShrineSelection: vi.fn(),
      requestDash: vi.fn(),
    });

    gameBridge.togglePause();
    expect(secondPause).toHaveBeenCalledOnce();
    expect(firstPause).not.toHaveBeenCalled();

    releaseSecond();
    gameBridge.togglePause();
    expect(firstPause).toHaveBeenCalledOnce();

    releaseFirst();
    gameBridge.togglePause();
    expect(firstPause).toHaveBeenCalledOnce();
  });

  it('forwards one explicit dash request without mutating movement input', () => {
    const requestDash = vi.fn();
    gameBridge.bindController({
      togglePause: vi.fn(),
      restart: vi.fn(),
      killFaction: vi.fn(),
      cycleShrineSelection: vi.fn(),
      requestDash,
    });
    gameBridge.setKey('d', true);

    gameBridge.requestDash();

    expect(requestDash).toHaveBeenCalledOnce();
    expect(gameBridge.input).toEqual({ x: 1, y: 0 });
  });
});
