import type Phaser from 'phaser';
import { FACTION_COLORS } from '../config/factionVisuals';
import type { MinimapConfig } from '../config/gameConfig';
import type { Unit } from '../model/unit';
import type { MapDefinition } from '../maps/maps';
import type { DashSnapshot } from '../systems/dash';
import { calculateDashCooldownFill } from './dashCooldownModel';
import {
  MinimapCoordinateMapper,
  calculateMinimapLayout,
  type CameraView,
  type MinimapLayout,
  type Rectangle,
  type ScreenSize,
} from './MinimapCoordinateMapper';
import { buildMinimapMarkers, clampAlpha, type MinimapMarker } from './minimapModel';

export interface MinimapDependencies {
  config: MinimapConfig;
  map?: MapDefinition;
  world?: Rectangle;
  trees?: readonly { x: number; y: number }[];
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
  dashTrack: 0x142019,
  dashFill: 0x65d8ff,
};

export class MinimapSystem {
  private staticGraphics?: Phaser.GameObjects.Graphics;
  private dynamicGraphics?: Phaser.GameObjects.Graphics;
  private dashLabel?: Phaser.GameObjects.Text;
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
    this.dashLabel = this.scene.add
      .text(0, 0, 'Dash - SPACE', {
        color: '#e8efe3',
        fontFamily: '"Courier New", monospace',
        fontSize: `${this.dependencies.config.dashLabelFontSize}px`,
      })
      .setScrollFactor(0)
      .setDepth(1002)
      .setOrigin(0, 1);
    this.resize(screen);
  }

  update(
    units: readonly Unit[],
    anchorId: string | undefined,
    camera: CameraView,
    screen: ScreenSize,
    dash: DashSnapshot,
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
      .lineStyle(
        this.dependencies.config.viewportBorderThickness,
        COLORS.viewport,
        clampAlpha(this.dependencies.config.viewportAlpha),
      )
      .strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);
    this.drawDashCooldown(graphics, dash);
  }

  destroy(): void {
    this.staticGraphics?.destroy();
    this.dynamicGraphics?.destroy();
    this.dashLabel?.destroy();
    this.staticGraphics = undefined;
    this.dynamicGraphics = undefined;
    this.dashLabel = undefined;
    this.layout = undefined;
    this.mapper = undefined;
    this.screen = undefined;
  }

  private resize(screen: ScreenSize): void {
    if (!this.staticGraphics) return;
    this.screen = { ...screen };
    const world = this.dependencies.map?.cameraBounds ?? this.dependencies.world;
    if (!world) throw new Error('Minimap requires a map or world bounds.');
    this.layout = calculateMinimapLayout(screen, world, this.dependencies.config);
    this.mapper = new MinimapCoordinateMapper(world, this.layout.map);
    const barY =
      this.layout.frame.y -
      this.dependencies.config.dashBarGap -
      this.dependencies.config.dashBarHeight;
    this.dashLabel?.setPosition(this.layout.frame.x, barY - this.dependencies.config.dashLabelGap);
    this.drawStatic();
  }

  private drawStatic(): void {
    if (!this.staticGraphics || !this.layout || !this.mapper) return;
    const { config, map } = this.dependencies;
    const trees = this.dependencies.trees ?? [];
    const shrine = map?.shrine ?? this.dependencies.shrine;
    const backgroundAlpha = clampAlpha(config.backgroundAlpha);
    const terrainAlpha = clampAlpha(config.terrainAlpha);
    const graphics = this.staticGraphics.clear();
    graphics
      .fillStyle(COLORS.background, backgroundAlpha)
      .fillRect(
        this.layout.frame.x,
        this.layout.frame.y,
        this.layout.frame.width,
        this.layout.frame.height,
      )
      .fillStyle(map?.minimap.groundColor ?? COLORS.meadow, terrainAlpha)
      .fillRect(
        this.layout.map.x,
        this.layout.map.y,
        this.layout.map.width,
        this.layout.map.height,
      );

    if (map) {
      for (const region of map.terrainRegions) {
        const topLeft = this.mapper.worldToMinimap({ x: region.x, y: region.y });
        const bottomRight = this.mapper.worldToMinimap({
          x: region.x + region.width,
          y: region.y + region.height,
        });
        graphics
          .fillStyle(map.minimap.terrainColors[region.kind], terrainAlpha * region.alpha)
          .fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      }
    }

    if (config.showTrees) {
      const obstaclePoints = map?.obstacles.map((obstacle) => obstacle.position) ?? trees;
      for (const obstacle of obstaclePoints) {
        const point = this.mapper.worldToMinimap(obstacle);
        graphics
          .fillStyle(map?.minimap.obstacleColor ?? COLORS.tree, terrainAlpha)
          .fillCircle(point.x, point.y, 1.8);
      }
    }
    if (config.showShrine && shrine) {
      const point = this.mapper.worldToMinimap(shrine);
      graphics
        .fillStyle(map?.minimap.shrineColor ?? COLORS.shrine, terrainAlpha)
        .fillCircle(point.x, point.y, 2.5);
    }
    graphics
      .lineStyle(config.borderThickness, COLORS.border, clampAlpha(config.borderAlpha))
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
        .lineStyle(1, marker.isAnchor ? COLORS.anchor : COLORS.recruited, marker.alpha)
        .strokeCircle(marker.x, marker.y, marker.size + (marker.isAnchor ? 2 : 1));
  }

  private drawDashCooldown(graphics: Phaser.GameObjects.Graphics, dash: DashSnapshot): void {
    if (!this.layout) return;
    const { config } = this.dependencies;
    const x = this.layout.frame.x;
    const y = this.layout.frame.y - config.dashBarGap - config.dashBarHeight;
    const width = this.layout.frame.width;
    const fill = calculateDashCooldownFill(dash);
    graphics.fillStyle(COLORS.dashTrack, 0.82).fillRect(x, y, width, config.dashBarHeight);
    if (fill > 0)
      graphics.fillStyle(COLORS.dashFill, 0.95).fillRect(x, y, width * fill, config.dashBarHeight);
  }
}
