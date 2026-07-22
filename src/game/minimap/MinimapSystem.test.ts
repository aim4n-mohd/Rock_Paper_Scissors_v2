import { GAME_CONFIG } from '../config/gameConfig';
import { createUnit } from '../model/unit';
import { MinimapSystem } from './MinimapSystem';

type RecordedCall = { method: string; args: unknown[] };

function graphicsDouble() {
  const calls: RecordedCall[] = [];
  const graphics: Record<string, unknown> = { calls };
  for (const method of [
    'clear',
    'destroy',
    'fillStyle',
    'fillRect',
    'fillCircle',
    'lineStyle',
    'strokeRect',
    'strokeCircle',
    'lineBetween',
    'setDepth',
    'setScrollFactor',
  ]) {
    graphics[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return graphics;
    });
  }
  return graphics;
}

function sceneDouble() {
  const staticGraphics = graphicsDouble();
  const dynamicGraphics = graphicsDouble();
  const graphics = vi.fn().mockReturnValueOnce(staticGraphics).mockReturnValueOnce(dynamicGraphics);
  return { scene: { add: { graphics } }, staticGraphics, dynamicGraphics, graphics };
}

describe('MinimapSystem', () => {
  const world = { x: 0, y: 0, width: 2880, height: 1620 };
  const camera = { scrollX: 240, scrollY: 160, width: 960, height: 540, zoom: 1 };

  it('creates fixed-screen layers once, draws static terrain once, and reuses dynamic graphics', () => {
    const { scene, staticGraphics, dynamicGraphics, graphics } = sceneDouble();
    const minimap = new MinimapSystem(scene as never, {
      config: GAME_CONFIG.minimap,
      world,
      trees: GAME_CONFIG.trees.positions,
      shrine: GAME_CONFIG.landmarks.shrine,
    });
    const unit = createUnit('rock', 'rock', { x: 100, y: 100 }, true);

    minimap.initialize({ width: 960, height: 540 });
    minimap.update([unit], 'rock', camera, { width: 960, height: 540 });
    minimap.update([unit], 'rock', camera, { width: 960, height: 540 });

    expect(graphics).toHaveBeenCalledTimes(2);
    expect(staticGraphics.setScrollFactor).toHaveBeenCalledWith(0);
    expect(dynamicGraphics.setScrollFactor).toHaveBeenCalledWith(0);
    expect(staticGraphics.clear).toHaveBeenCalledTimes(1);
    expect(dynamicGraphics.clear).toHaveBeenCalledTimes(2);
  });

  it('renders configured trees and shrine on the static layer', () => {
    const { scene, staticGraphics } = sceneDouble();
    const minimap = new MinimapSystem(scene as never, {
      config: GAME_CONFIG.minimap,
      world,
      trees: GAME_CONFIG.trees.positions.slice(0, 2),
      shrine: GAME_CONFIG.landmarks.shrine,
    });

    minimap.initialize({ width: 960, height: 540 });

    expect(staticGraphics.fillCircle).toHaveBeenCalledTimes(3);
  });

  it('omits optional trees and shrine when their config toggles are disabled', () => {
    const { scene, staticGraphics } = sceneDouble();
    const minimap = new MinimapSystem(scene as never, {
      config: { ...GAME_CONFIG.minimap, showTrees: false, showShrine: false },
      world,
      trees: GAME_CONFIG.trees.positions.slice(0, 2),
      shrine: GAME_CONFIG.landmarks.shrine,
    });

    minimap.initialize({ width: 960, height: 540 });

    expect(staticGraphics.fillCircle).not.toHaveBeenCalled();
  });

  it('draws the camera viewport after unit markers and clamps it to the minimap', () => {
    const { scene, dynamicGraphics } = sceneDouble();
    const minimap = new MinimapSystem(scene as never, {
      config: GAME_CONFIG.minimap,
      world,
      trees: [],
      shrine: GAME_CONFIG.landmarks.shrine,
    });
    const unit = createUnit('rock', 'rock', { x: 9999, y: -20 }, true);

    minimap.initialize({ width: 960, height: 540 });
    minimap.update(
      [unit],
      'rock',
      { scrollX: 9999, scrollY: 9999, width: 960, height: 540, zoom: 2 },
      { width: 960, height: 540 },
    );

    const calls = dynamicGraphics.calls as RecordedCall[];
    const lastStrokeRect = [...calls].reverse().find((call) => call.method === 'strokeRect');
    const lastMarker = [...calls]
      .reverse()
      .find((call) => call.method === 'fillCircle' || call.method === 'fillRect');
    expect(lastStrokeRect).toBeDefined();
    expect(lastMarker).toBeDefined();
    if (!lastStrokeRect || !lastMarker) throw new Error('Expected marker and viewport calls.');
    expect(calls.indexOf(lastStrokeRect!)).toBeGreaterThan(calls.indexOf(lastMarker!));
    const [x = 0, y = 0, width = 0, height = 0] = lastStrokeRect.args as number[];
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(x + width).toBeCloseTo(12 + 180 - 5);
    expect(y + height).toBeCloseTo(540 - 12 - 5);
  });

  it('clears stale markers and renders only the current unit collection after restart', () => {
    const { scene, dynamicGraphics } = sceneDouble();
    const minimap = new MinimapSystem(scene as never, {
      config: GAME_CONFIG.minimap,
      world,
      trees: [],
      shrine: GAME_CONFIG.landmarks.shrine,
    });
    const oldRock = createUnit('old-rock', 'rock', { x: 100, y: 100 }, true);
    const newPaper = createUnit('new-paper', 'paper', { x: 200, y: 200 });

    minimap.initialize({ width: 960, height: 540 });
    minimap.update([oldRock], oldRock.id, camera, { width: 960, height: 540 });
    const secondUpdateStart = (dynamicGraphics.calls as RecordedCall[]).length;
    minimap.update([newPaper], undefined, camera, { width: 960, height: 540 });

    const secondUpdateCalls = (dynamicGraphics.calls as RecordedCall[]).slice(secondUpdateStart);
    expect(secondUpdateCalls[0]?.method).toBe('clear');
    expect(secondUpdateCalls.some((call) => call.method === 'fillRect')).toBe(true);
    expect(secondUpdateCalls.some((call) => call.method === 'fillCircle')).toBe(false);
  });

  it('redraws static content only after a screen-size change', () => {
    const { scene, staticGraphics } = sceneDouble();
    const minimap = new MinimapSystem(scene as never, {
      config: GAME_CONFIG.minimap,
      world,
      trees: [],
      shrine: GAME_CONFIG.landmarks.shrine,
    });

    minimap.initialize({ width: 960, height: 540 });
    minimap.update([], undefined, camera, { width: 800, height: 600 });

    expect(staticGraphics.clear).toHaveBeenCalledTimes(2);
  });

  it('destroys both graphics layers during scene cleanup', () => {
    const { scene, staticGraphics, dynamicGraphics } = sceneDouble();
    const minimap = new MinimapSystem(scene as never, {
      config: GAME_CONFIG.minimap,
      world,
      trees: [],
      shrine: GAME_CONFIG.landmarks.shrine,
    });

    minimap.initialize({ width: 960, height: 540 });
    minimap.destroy();

    expect(staticGraphics.destroy).toHaveBeenCalledOnce();
    expect(dynamicGraphics.destroy).toHaveBeenCalledOnce();
  });

  it('does not create or update graphics when disabled', () => {
    const { scene, graphics } = sceneDouble();
    const minimap = new MinimapSystem(scene as never, {
      config: { ...GAME_CONFIG.minimap, enabled: false },
      world,
      trees: [],
      shrine: GAME_CONFIG.landmarks.shrine,
    });

    minimap.initialize({ width: 960, height: 540 });
    minimap.update([], undefined, camera, { width: 960, height: 540 });
    minimap.destroy();

    expect(graphics).not.toHaveBeenCalled();
  });
});
