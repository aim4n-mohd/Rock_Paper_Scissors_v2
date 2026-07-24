import { GAME_CONFIG } from '../config/gameConfig';
import { createUnit } from '../model/unit';
import type { DashSnapshot } from '../systems/dash';
import { calculateMinimapLayout } from './MinimapCoordinateMapper';
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

function textDouble() {
  const text: Record<string, unknown> = {};
  for (const method of ['destroy', 'setDepth', 'setOrigin', 'setPosition', 'setScrollFactor']) {
    text[method] = vi.fn(() => text);
  }
  return text;
}

function sceneDouble() {
  const staticGraphics = graphicsDouble();
  const dynamicGraphics = graphicsDouble();
  const dashLabel = textDouble();
  const graphics = vi.fn().mockReturnValueOnce(staticGraphics).mockReturnValueOnce(dynamicGraphics);
  const text = vi.fn().mockReturnValue(dashLabel);
  return {
    scene: { add: { graphics, text } },
    staticGraphics,
    dynamicGraphics,
    dashLabel,
    graphics,
    text,
  };
}

describe('MinimapSystem', () => {
  const world = { x: 0, y: 0, width: 2880, height: 1620 };
  const camera = { scrollX: 240, scrollY: 160, width: 960, height: 540, zoom: 1 };
  const readyDash: DashSnapshot = {
    phase: 'ready',
    ready: true,
    direction: { x: 0, y: 0 },
    activeRemainingMs: 0,
    cooldownRemainingMs: 0,
    cooldownMs: GAME_CONFIG.dash.cooldownMs,
  };

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
    minimap.update([unit], 'rock', camera, { width: 960, height: 540 }, readyDash);
    minimap.update([unit], 'rock', camera, { width: 960, height: 540 }, readyDash);

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
      readyDash,
    );

    const calls = dynamicGraphics.calls as RecordedCall[];
    const lastStrokeRect = [...calls].reverse().find((call) => call.method === 'strokeRect');
    const lastMarker = [...calls].reverse().find((call) => call.method === 'fillCircle');
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
    minimap.update([oldRock], oldRock.id, camera, { width: 960, height: 540 }, readyDash);
    const secondUpdateStart = (dynamicGraphics.calls as RecordedCall[]).length;
    minimap.update([newPaper], undefined, camera, { width: 960, height: 540 }, readyDash);

    const secondUpdateCalls = (dynamicGraphics.calls as RecordedCall[]).slice(secondUpdateStart);
    expect(secondUpdateCalls[0]?.method).toBe('clear');
    expect(secondUpdateCalls.some((call) => call.method === 'fillRect')).toBe(true);
    expect(secondUpdateCalls.some((call) => call.method === 'fillCircle')).toBe(false);
    expect(
      secondUpdateCalls.some(
        (call) =>
          call.method === 'fillStyle' && call.args[1] === GAME_CONFIG.minimap.unitMarkerAlpha,
      ),
    ).toBe(true);
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
    minimap.update([], undefined, camera, { width: 800, height: 600 }, readyDash);

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
    minimap.update([], undefined, camera, { width: 960, height: 540 }, readyDash);
    minimap.destroy();

    expect(graphics).not.toHaveBeenCalled();
  });

  it('applies separate configured alpha values to every minimap layer', () => {
    const { scene, staticGraphics, dynamicGraphics } = sceneDouble();
    const config = {
      ...GAME_CONFIG.minimap,
      backgroundAlpha: 0.11,
      terrainAlpha: 0.22,
      borderAlpha: 0.33,
      unitMarkerAlpha: 0.44,
      viewportAlpha: 0.55,
    };
    const minimap = new MinimapSystem(scene as never, {
      config,
      world,
      trees: [{ x: 200, y: 200 }],
      shrine: GAME_CONFIG.landmarks.shrine,
    });
    const unit = createUnit('paper', 'paper', { x: 100, y: 100 });

    minimap.initialize({ width: 960, height: 540 });
    minimap.update([unit], undefined, camera, { width: 960, height: 540 }, readyDash);

    expect(staticGraphics.fillStyle).toHaveBeenNthCalledWith(1, expect.any(Number), 0.11);
    expect(staticGraphics.fillStyle).toHaveBeenNthCalledWith(2, expect.any(Number), 0.22);
    expect(staticGraphics.fillStyle).toHaveBeenCalledWith(expect.any(Number), 0.22);
    expect(staticGraphics.lineStyle).toHaveBeenCalledWith(
      config.borderThickness,
      expect.any(Number),
      0.33,
    );
    expect(dynamicGraphics.fillStyle).toHaveBeenCalledWith(expect.any(Number), 0.44);
    expect(dynamicGraphics.lineStyle).toHaveBeenCalledWith(
      config.viewportBorderThickness,
      expect.any(Number),
      0.55,
    );
  });

  it('clamps every configured alpha before rendering', () => {
    const { scene, staticGraphics, dynamicGraphics } = sceneDouble();
    const config = {
      ...GAME_CONFIG.minimap,
      backgroundAlpha: -1,
      terrainAlpha: 2,
      borderAlpha: 3,
      unitMarkerAlpha: 4,
      viewportAlpha: -2,
    };
    const minimap = new MinimapSystem(scene as never, {
      config,
      world,
      trees: [{ x: 200, y: 200 }],
      shrine: GAME_CONFIG.landmarks.shrine,
    });
    const unit = createUnit('paper', 'paper', { x: 100, y: 100 });

    minimap.initialize({ width: 960, height: 540 });
    minimap.update([unit], undefined, camera, { width: 960, height: 540 }, readyDash);

    expect(staticGraphics.fillStyle).toHaveBeenNthCalledWith(1, expect.any(Number), 0);
    expect(staticGraphics.fillStyle).toHaveBeenNthCalledWith(2, expect.any(Number), 1);
    expect(staticGraphics.lineStyle).toHaveBeenCalledWith(
      config.borderThickness,
      expect.any(Number),
      1,
    );
    expect(dynamicGraphics.fillStyle).toHaveBeenCalledWith(expect.any(Number), 1);
    expect(dynamicGraphics.lineStyle).toHaveBeenCalledWith(
      config.viewportBorderThickness,
      expect.any(Number),
      0,
    );
  });

  it('renders a small Dash - SPACE label and a cooldown bar above the minimap', () => {
    const { scene, dynamicGraphics, dashLabel, text } = sceneDouble();
    const minimap = new MinimapSystem(scene as never, {
      config: GAME_CONFIG.minimap,
      world,
      trees: [],
      shrine: GAME_CONFIG.landmarks.shrine,
    });
    const screen = { width: 960, height: 540 };
    const layout = calculateMinimapLayout(screen, world, GAME_CONFIG.minimap);
    const barY =
      layout.frame.y - GAME_CONFIG.minimap.dashBarGap - GAME_CONFIG.minimap.dashBarHeight;
    const cooldownDash = {
      ...readyDash,
      phase: 'cooldown' as const,
      ready: false,
      cooldownRemainingMs: GAME_CONFIG.dash.cooldownMs / 2,
    };

    minimap.initialize(screen);
    minimap.update([], undefined, camera, screen, cooldownDash);

    expect(text).toHaveBeenCalledWith(
      0,
      0,
      'Dash - SPACE',
      expect.objectContaining({ fontSize: `${GAME_CONFIG.minimap.dashLabelFontSize}px` }),
    );
    expect(dashLabel.setPosition).toHaveBeenCalledWith(
      layout.frame.x,
      barY - GAME_CONFIG.minimap.dashLabelGap,
    );
    expect(dynamicGraphics.fillRect).toHaveBeenCalledWith(
      layout.frame.x,
      barY,
      layout.frame.width,
      GAME_CONFIG.minimap.dashBarHeight,
    );
    expect(dynamicGraphics.fillRect).toHaveBeenCalledWith(
      layout.frame.x,
      barY,
      layout.frame.width / 2,
      GAME_CONFIG.minimap.dashBarHeight,
    );
  });

  it('starts the cooldown bar empty during a dash and fills it when ready', () => {
    const { scene, dynamicGraphics } = sceneDouble();
    const minimap = new MinimapSystem(scene as never, {
      config: GAME_CONFIG.minimap,
      world,
      trees: [],
      shrine: GAME_CONFIG.landmarks.shrine,
    });
    const screen = { width: 960, height: 540 };

    minimap.initialize(screen);
    minimap.update([], undefined, camera, screen, {
      ...readyDash,
      phase: 'active',
      ready: false,
      activeRemainingMs: 720,
    });
    const activeFillRects = (dynamicGraphics.calls as RecordedCall[]).filter(
      (call) => call.method === 'fillRect',
    );
    expect(activeFillRects).toHaveLength(1);

    const readyStart = (dynamicGraphics.calls as RecordedCall[]).length;
    minimap.update([], undefined, camera, screen, readyDash);
    const readyFillRects = (dynamicGraphics.calls as RecordedCall[])
      .slice(readyStart)
      .filter((call) => call.method === 'fillRect');
    expect(readyFillRects).toHaveLength(2);
    expect(readyFillRects[1]?.args[2]).toBe(readyFillRects[0]?.args[2]);
  });
});
