import type Phaser from 'phaser';
import { FACTION_COLORS } from '../config/factionVisuals';
import type { MinimapConfig } from '../config/gameConfig';
import type { Unit } from '../model/unit';
import {
  MinimapCoordinateMapper,
  calculateMinimapLayout,
  type CameraView,
  type MinimapLayout,
  type Rectangle,
  type ScreenSize,
} from './MinimapCoordinateMapper';
import { buildMinimapMarkers, type MinimapMarker } from './minimapModel';

export interface MinimapDependencies {
  config: MinimapConfig;
  world: Rectangle;
  trees: readonly { x: number; y: number }[];
  shrine?: { x: number; y: number };
}

const COLORS = {
  background: 0x101a14,
  meadow: 0x35512f,
  border: 0xc7a95b,
  tree: 0x1b3520,
  shrine: 0xffd66b,
  viewport: 0xf6f2dd,
  recruited: 0x65d8ff,
  anchor: 0xffdc62,
};

export class MinimapSystem {
  private staticGraphics?: Phaser.GameObjects.Graphics;
  private dynamicGraphics?: Phaser.GameObjects.Graphics;
  private layout?: MinimapLayout;
  private mapper?: MinimapCoordinateMapper;
  private screen?: ScreenSize;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly dependencies: MinimapDependencies,
  ) {}

  initialize(screen: ScreenSize): void {
    if (!this.dependencies.config.enabled || this.staticGraphics) return;
    this.staticGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(1000);
    this.dynamicGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(1001);
    this.resize(screen);
  }

  update(
    units: readonly Unit[],
    anchorId: string | undefined,
    camera: CameraView,
    screen: ScreenSize,
  ): void {
    if (!this.dependencies.config.enabled) return;
    if (!this.staticGraphics || !this.dynamicGraphics) this.initialize(screen);
    if (!this.staticGraphics || !this.dynamicGraphics) return;
    if (!this.screen || this.screen.width !== screen.width || this.screen.height !== screen.height)
      this.resize(screen);
    if (!this.mapper) return;

    const graphics = this.dynamicGraphics.clear();
    for (const marker of buildMinimapMarkers(
      units,
      anchorId,
      this.mapper,
      this.dependencies.config,
    ))
      this.drawMarker(graphics, marker);

    const viewport = this.mapper.cameraViewport(camera);
    graphics
      .lineStyle(this.dependencies.config.viewportBorderThickness, COLORS.viewport, 0.95)
      .strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);
  }

  destroy(): void {
    this.staticGraphics?.destroy();
    this.dynamicGraphics?.destroy();
    this.staticGraphics = undefined;
    this.dynamicGraphics = undefined;
    this.layout = undefined;
    this.mapper = undefined;
    this.screen = undefined;
  }

  private resize(screen: ScreenSize): void {
    if (!this.staticGraphics) return;
    this.screen = { ...screen };
    this.layout = calculateMinimapLayout(screen, this.dependencies.world, this.dependencies.config);
    this.mapper = new MinimapCoordinateMapper(this.dependencies.world, this.layout.map);
    this.drawStatic();
  }

  private drawStatic(): void {
    if (!this.staticGraphics || !this.layout || !this.mapper) return;
    const { config, trees, shrine } = this.dependencies;
    const graphics = this.staticGraphics.clear();
    graphics
      .fillStyle(COLORS.background, config.backgroundAlpha)
      .fillRect(
        this.layout.frame.x,
        this.layout.frame.y,
        this.layout.frame.width,
        this.layout.frame.height,
      )
      .fillStyle(COLORS.meadow, 0.9)
      .fillRect(
        this.layout.map.x,
        this.layout.map.y,
        this.layout.map.width,
        this.layout.map.height,
      );

    if (config.showTrees) {
      for (const tree of trees) {
        const point = this.mapper.worldToMinimap(tree);
        graphics.fillStyle(COLORS.tree, 0.9).fillCircle(point.x, point.y, 1.5);
      }
    }
    if (config.showShrine && shrine) {
      const point = this.mapper.worldToMinimap(shrine);
      graphics.fillStyle(COLORS.shrine, 1).fillCircle(point.x, point.y, 2.5);
    }
    graphics
      .lineStyle(config.borderThickness, COLORS.border, 0.9)
      .strokeRect(
        this.layout.frame.x,
        this.layout.frame.y,
        this.layout.frame.width,
        this.layout.frame.height,
      );
  }

  private drawMarker(graphics: Phaser.GameObjects.Graphics, marker: MinimapMarker): void {
    const color = FACTION_COLORS[marker.faction];
    graphics.fillStyle(color, marker.alpha);
    if (marker.faction === 'rock') {
      graphics.fillCircle(marker.x, marker.y, marker.size);
    } else if (marker.faction === 'paper') {
      graphics.fillRect(
        marker.x - marker.size,
        marker.y - marker.size,
        marker.size * 2,
        marker.size * 2,
      );
    } else {
      graphics
        .lineStyle(Math.max(1, marker.size * 0.7), color, marker.alpha)
        .lineBetween(
          marker.x - marker.size,
          marker.y - marker.size,
          marker.x + marker.size,
          marker.y + marker.size,
        )
        .lineBetween(
          marker.x + marker.size,
          marker.y - marker.size,
          marker.x - marker.size,
          marker.y + marker.size,
        );
    }
    if (marker.recruited)
      graphics
        .lineStyle(1, marker.isAnchor ? COLORS.anchor : COLORS.recruited, 1)
        .strokeCircle(marker.x, marker.y, marker.size + (marker.isAnchor ? 2 : 1));
  }
}
