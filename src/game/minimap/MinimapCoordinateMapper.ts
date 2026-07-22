import type { MinimapConfig } from '../config/gameConfig';
import type { Vector } from '../math/vector';

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenSize {
  width: number;
  height: number;
}

export interface CameraView {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
  zoom: number;
}

export interface MinimapLayout {
  frame: Rectangle;
  map: Rectangle;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateMinimapLayout(
  screen: ScreenSize,
  world: Rectangle,
  config: MinimapConfig,
): MinimapLayout {
  const maximumMapWidth = Math.max(1, config.width - config.padding * 2);
  const maximumMapHeight = Math.max(1, config.maxHeight - config.padding * 2);
  const scale = Math.min(maximumMapWidth / world.width, maximumMapHeight / world.height);
  const mapWidth = world.width * scale;
  const mapHeight = world.height * scale;
  const frameWidth = mapWidth + config.padding * 2;
  const frameHeight = mapHeight + config.padding * 2;
  const frame = {
    x: config.margin,
    y: screen.height - config.margin - frameHeight,
    width: frameWidth,
    height: frameHeight,
  };

  return {
    frame,
    map: {
      x: frame.x + config.padding,
      y: frame.y + config.padding,
      width: mapWidth,
      height: mapHeight,
    },
  };
}

export class MinimapCoordinateMapper {
  constructor(
    readonly world: Rectangle,
    readonly minimap: Rectangle,
  ) {}

  worldToMinimap(position: Vector): Vector {
    const normalizedX = clamp((position.x - this.world.x) / this.world.width, 0, 1);
    const normalizedY = clamp((position.y - this.world.y) / this.world.height, 0, 1);
    return {
      x: this.minimap.x + normalizedX * this.minimap.width,
      y: this.minimap.y + normalizedY * this.minimap.height,
    };
  }

  cameraViewport(camera: CameraView): Rectangle {
    const zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
    const visibleWorldWidth = Math.min(this.world.width, camera.width / zoom);
    const visibleWorldHeight = Math.min(this.world.height, camera.height / zoom);
    const maximumScrollX = this.world.x + this.world.width - visibleWorldWidth;
    const maximumScrollY = this.world.y + this.world.height - visibleWorldHeight;
    const topLeft = this.worldToMinimap({
      x: clamp(camera.scrollX, this.world.x, maximumScrollX),
      y: clamp(camera.scrollY, this.world.y, maximumScrollY),
    });

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: (visibleWorldWidth / this.world.width) * this.minimap.width,
      height: (visibleWorldHeight / this.world.height) * this.minimap.height,
    };
  }
}
