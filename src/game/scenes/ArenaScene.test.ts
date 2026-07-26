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
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1),
      },
    },
  },
}));

import { GAME_CONFIG } from '../config/gameConfig';
import { gameBridge } from '../events/gameBridge';
import { getMapDefinition } from '../maps/maps';
import { ArenaScene } from './ArenaScene';

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
    'beginPath',
    'moveTo',
    'lineTo',
    'closePath',
    'fillPath',
    'arc',
    'strokePath',
    'setDepth',
    'setScrollFactor',
    'destroy',
  ]) {
    graphics[method] = vi.fn(() => graphics);
  }
  return graphics;
}

function textDouble() {
  const text: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['destroy', 'setDepth', 'setOrigin', 'setPosition', 'setScrollFactor']) {
    text[method] = vi.fn(() => text);
  }
  return text;
}

describe('ArenaScene lifecycle', () => {
  afterEach(() => gameBridge.reset());

  it('creates, updates, publishes, and detaches its bridge controller on shutdown', () => {
    const scene = new ArenaScene('forest', 12);
    const map = getMapDefinition('forest');
    const worldGraphics = graphicsDouble();
    const actorGraphics = graphicsDouble();
    const minimapStaticGraphics = graphicsDouble();
    const minimapDynamicGraphics = graphicsDouble();
    const dashLabel = textDouble();
    const setBounds = vi.fn();
    const setZoom = vi.fn((zoom: number) => {
      camera.zoom = zoom;
      return camera;
    });
    const camera = { setBounds, setZoom, shake: vi.fn(), scrollX: 0, scrollY: 0, zoom: 1 };
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
        graphics: vi
          .fn()
          .mockReturnValueOnce(worldGraphics)
          .mockReturnValueOnce(actorGraphics)
          .mockReturnValueOnce(minimapStaticGraphics)
          .mockReturnValueOnce(minimapDynamicGraphics),
        text: vi.fn().mockReturnValue(dashLabel),
      },
      events: {
        emit: vi.fn(),
        once: vi.fn((event: string, callback: () => void) => {
          if (event === phaserMocks.shutdown) shutdown = callback;
        }),
      },
    });

    scene.create();
    expect(setBounds).toHaveBeenCalledWith(
      map.cameraBounds.x,
      map.cameraBounds.y,
      map.cameraBounds.width,
      map.cameraBounds.height,
    );
    expect(gameBridge.latest?.counts).toEqual(map.populationRecommendation);
    expect(gameBridge.latest?.mapId).toBe('forest');

    gameBridge.setKey('d', true);
    gameBridge.requestDash();
    expect(gameBridge.latest?.dash.phase).toBe('active');

    scene.update(0, 100);
    expect(actorGraphics.clear).toHaveBeenCalled();
    expect(actorGraphics.strokeCircle).toHaveBeenCalledWith(
      map.shrine.x,
      map.shrine.y,
      GAME_CONFIG.shrine.activationRadius,
    );
    expect(minimapDynamicGraphics.clear).toHaveBeenCalled();
    expect(gameBridge.latest?.elapsedMs).toBe(100);
    expect(Number.isFinite(camera.scrollX)).toBe(true);
    expect(Number.isFinite(camera.scrollY)).toBe(true);
    const visualRadius = (Math.hypot(16, 16) / 2) * 1.5;
    expect(gameBridge.latest!.swarmCenter.x + visualRadius).toBeLessThanOrEqual(
      camera.scrollX + GAME_CONFIG.viewport.width / camera.zoom - 24,
    );

    expect(shutdown).toBeTypeOf('function');
    shutdown?.();
    const snapshotAfterShutdown = gameBridge.latest;
    gameBridge.requestDash();
    expect(gameBridge.latest).toBe(snapshotAfterShutdown);
    expect(releaseController).toHaveBeenCalledOnce();
    expect(minimapStaticGraphics.destroy).toHaveBeenCalledOnce();
    expect(minimapDynamicGraphics.destroy).toHaveBeenCalledOnce();
    expect(dashLabel.destroy).toHaveBeenCalledOnce();
  });
});
