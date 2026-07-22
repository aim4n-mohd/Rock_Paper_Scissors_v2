import type { MinimapConfig } from '../config/gameConfig';
import { MinimapCoordinateMapper, calculateMinimapLayout } from './MinimapCoordinateMapper';

const config: MinimapConfig = {
  enabled: true,
  width: 180,
  maxHeight: 130,
  margin: 12,
  padding: 5,
  backgroundAlpha: 0.75,
  borderThickness: 2,
  unitMarkerSize: 3,
  playerMarkerSize: 5,
  neutralMarkerAlpha: 0.55,
  viewportBorderThickness: 1,
  showTrees: true,
  showShrine: true,
};

describe('MinimapCoordinateMapper', () => {
  const world = { x: 100, y: -50, width: 1000, height: 500 };
  const minimap = { x: 20, y: 300, width: 200, height: 100 };
  const mapper = new MinimapCoordinateMapper(world, minimap);

  it('maps world corners and the center into minimap space', () => {
    expect(mapper.worldToMinimap({ x: 100, y: -50 })).toEqual({ x: 20, y: 300 });
    expect(mapper.worldToMinimap({ x: 600, y: 200 })).toEqual({ x: 120, y: 350 });
    expect(mapper.worldToMinimap({ x: 1100, y: 450 })).toEqual({ x: 220, y: 400 });
  });

  it('clamps out-of-bounds world positions to the minimap rectangle', () => {
    expect(mapper.worldToMinimap({ x: -500, y: 900 })).toEqual({ x: 20, y: 400 });
  });

  it('maps the camera viewport and accounts for zoom', () => {
    expect(
      mapper.cameraViewport({ scrollX: 100, scrollY: -50, width: 500, height: 250, zoom: 1 }),
    ).toEqual({ x: 20, y: 300, width: 100, height: 50 });
    expect(
      mapper.cameraViewport({ scrollX: 100, scrollY: -50, width: 500, height: 250, zoom: 2 }),
    ).toEqual({ x: 20, y: 300, width: 50, height: 25 });
  });

  it('clamps the viewport rectangle inside the minimap', () => {
    expect(
      mapper.cameraViewport({ scrollX: 1050, scrollY: 425, width: 500, height: 250, zoom: 1 }),
    ).toEqual({ x: 120, y: 350, width: 100, height: 50 });
  });
});

describe('calculateMinimapLayout', () => {
  it('places a landscape minimap at the bottom-left and preserves the world aspect ratio', () => {
    const layout = calculateMinimapLayout(
      { width: 960, height: 540 },
      { x: 0, y: 0, width: 2880, height: 1620 },
      config,
    );

    expect(layout.frame.x).toBe(12);
    expect(layout.frame.width).toBe(180);
    expect(layout.frame.y + layout.frame.height).toBe(528);
    expect(layout.map.width).toBe(170);
    expect(layout.map.height).toBeCloseTo(95.625);
    expect(layout.map.width / layout.map.height).toBeCloseTo(2880 / 1620);
  });

  it('shrinks a tall minimap to the configured maximum height', () => {
    const layout = calculateMinimapLayout(
      { width: 960, height: 540 },
      { x: 0, y: 0, width: 500, height: 1000 },
      config,
    );

    expect(layout.frame.height).toBe(130);
    expect(layout.frame.width).toBe(70);
    expect(layout.map.width / layout.map.height).toBeCloseTo(0.5);
  });
});
