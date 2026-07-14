const phaserMocks = vi.hoisted(() => ({
  shutdown: 'shutdown',
}));

vi.mock('phaser', () => ({
  default: {
    Scene: class Scene {},
    Scenes: { Events: { SHUTDOWN: phaserMocks.shutdown } },
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
      Linear: (start: number, end: number, amount: number) => start + (end - start) * amount,
    },
  },
}));

import { GAME_CONFIG } from '../config/gameConfig';
import { gameBridge } from '../events/gameBridge';
import { MeadowScene } from './MeadowScene';

function graphicsDouble() {
  const graphics: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    'clear',
    'fillStyle',
    'fillRect',
    'lineStyle',
    'strokeRect',
    'fillEllipse',
    'fillCircle',
    'strokeCircle',
    'fillRoundedRect',
    'lineBetween',
  ]) {
    graphics[method] = vi.fn(() => graphics);
  }
  return graphics;
}

describe('MeadowScene lifecycle', () => {
  afterEach(() => gameBridge.reset());

  it('creates, updates, publishes, and detaches its bridge controller on shutdown', () => {
    const scene = new MeadowScene();
    const worldGraphics = graphicsDouble();
    const actorGraphics = graphicsDouble();
    const setBounds = vi.fn();
    const camera = { setBounds, scrollX: 0, scrollY: 0 };
    let shutdown: (() => void) | undefined;
    const originalBindController = gameBridge.bindController.bind(gameBridge);
    const releaseController = vi.fn();
    vi.spyOn(gameBridge, 'bindController').mockImplementation((controller) => {
      const release = originalBindController(controller);
      return () => {
        releaseController();
        release();
      };
    });

    Object.assign(scene, {
      cameras: { main: camera },
      scale: { width: GAME_CONFIG.viewport.width, height: GAME_CONFIG.viewport.height },
      add: {
        graphics: vi.fn().mockReturnValueOnce(worldGraphics).mockReturnValueOnce(actorGraphics),
      },
      events: {
        once: vi.fn((event: string, callback: () => void) => {
          if (event === phaserMocks.shutdown) shutdown = callback;
        }),
      },
    });

    scene.create();
    expect(setBounds).toHaveBeenCalledWith(0, 0, GAME_CONFIG.world.width, GAME_CONFIG.world.height);
    expect(gameBridge.latest?.counts).toEqual(GAME_CONFIG.population);

    scene.update(0, 100);
    expect(actorGraphics.clear).toHaveBeenCalled();
    expect(gameBridge.latest?.elapsedMs).toBe(100);
    expect(Number.isFinite(camera.scrollX)).toBe(true);
    expect(Number.isFinite(camera.scrollY)).toBe(true);

    expect(shutdown).toBeTypeOf('function');
    shutdown?.();
    expect(releaseController).toHaveBeenCalledOnce();
  });
});
