import Phaser from 'phaser';
import { FACTIONS, type Faction } from '../config/factions';
import { FACTION_COLORS } from '../config/factionVisuals';
import { GAME_CONFIG, type MatchOptions } from '../config/gameConfig';
import { UNIT_FRAME_CONTRACT, UNIT_SPRITE_MANIFEST } from '../config/unitSpriteManifest';
import { gameBridge } from '../events/gameBridge';
import {
  generateMapDecorations,
  getMapDefinition,
  type MapDefinition,
  type MapId,
  type MapObstacle,
} from '../maps/maps';
import { MinimapSystem } from '../minimap/MinimapSystem';
import { Simulation } from '../simulation/Simulation';
import {
  cameraFeelFor,
  resolveVisualSettings,
  shouldApplyScreenShake,
  type VisualSettings,
} from '../systems/gameFeel';
import { UnitAnimationController, type UnitAnimationPose } from '../systems/unitAnimation';
import type { Unit } from '../model/unit';

export class ArenaScene extends Phaser.Scene {
  private simulation: Simulation;
  private readonly map: MapDefinition;
  private readonly decorationSeed: number;
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private actorGraphics!: Phaser.GameObjects.Graphics;
  private minimap?: MinimapSystem;
  private lastPublish = 0;
  private readonly animationController = new UnitAnimationController();
  private visualSettings: VisualSettings;

  constructor(
    mapId: MapId = 'meadow',
    seed = Date.now() & 0xffff,
    visualSettings: Partial<VisualSettings> = {},
    matchOptions: Partial<MatchOptions> = {},
  ) {
    super('arena');
    this.map = getMapDefinition(mapId);
    this.decorationSeed = seed;
    this.visualSettings = resolveVisualSettings(visualSettings);
    this.simulation = new Simulation(seed, {
      mapId,
      visualSettings: this.visualSettings,
      ...matchOptions,
    });
  }

  create(): void {
    this.cameras.main.setBounds(
      this.map.cameraBounds.x,
      this.map.cameraBounds.y,
      this.map.cameraBounds.width,
      this.map.cameraBounds.height,
    );
    this.worldGraphics = this.add.graphics();
    this.actorGraphics = this.add.graphics();
    this.drawWorld();
    this.minimap = new MinimapSystem(this, {
      config: GAME_CONFIG.minimap,
      map: this.map,
    });
    this.minimap.initialize({ width: this.scale.width, height: this.scale.height });
    this.minimap.setOpacity(this.visualSettings.minimapOpacity);
    const releaseController = gameBridge.bindController({
      setPaused: (paused) => {
        if ((this.simulation.status === 'paused') !== paused) this.simulation.togglePaused();
        this.publish();
      },
      togglePause: () => {
        this.simulation.togglePaused();
        this.publish();
      },
      restart: () => {
        this.simulation.restart(this.decorationSeed);
        this.animationController.reset();
        this.publish();
      },
      killFaction: (faction) => {
        this.simulation.killFaction(faction);
        this.publish();
      },
      cycleShrineSelection: (direction) => {
        this.simulation.cycleShrineSelection(direction);
        this.publish();
      },
      selectShrineFaction: (faction) => {
        this.simulation.selectShrineFaction(faction);
        this.publish();
      },
      requestDash: () => {
        this.simulation.requestDash(gameBridge.input);
        this.publish();
      },
      applyVisualSettings: (settings) => {
        this.visualSettings = resolveVisualSettings(settings);
        this.simulation.applyVisualSettings(this.visualSettings);
        this.minimap?.setOpacity(this.visualSettings.minimapOpacity);
      },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      releaseController();
      this.minimap?.destroy();
      this.minimap = undefined;
    });
    this.publish();
  }

  update(_time: number, delta: number): void {
    this.simulation.update(delta, gameBridge.input, gameBridge.interactionHeld);
    this.handleEffectEvents();
    this.drawActors(delta);
    const target = this.simulation.swarmCenter();
    const snapshot = this.simulation.snapshot();
    const cameraFeel = cameraFeelFor(
      snapshot.recruitedCount,
      this.simulation.currentEffectiveSwarmSpeed(),
      this.visualSettings,
    );
    const nextZoom = Phaser.Math.Linear(
      this.cameras.main.zoom,
      cameraFeel.targetZoom,
      GAME_CONFIG.camera.zoomSmoothing,
    );
    this.cameras.main.setZoom(nextZoom);
    const visibleWidth = this.scale.width / nextZoom;
    const visibleHeight = this.scale.height / nextZoom;
    const desiredX = Phaser.Math.Clamp(
      target.x - visibleWidth / 2,
      0,
      Math.max(0, this.map.world.width - visibleWidth),
    );
    const desiredY = Phaser.Math.Clamp(
      target.y - visibleHeight / 2,
      0,
      Math.max(0, this.map.world.height - visibleHeight),
    );
    const smoothedX = Phaser.Math.Linear(this.cameras.main.scrollX, desiredX, cameraFeel.smoothing);
    const smoothedY = Phaser.Math.Linear(this.cameras.main.scrollY, desiredY, cameraFeel.smoothing);
    const recruited = this.simulation.units.filter((unit) => unit.alive && unit.recruited);
    this.cameras.main.scrollX = this.containCameraAxis(
      smoothedX,
      recruited.map((unit) => unit.position.x),
      visibleWidth,
      this.map.cameraBounds.x,
      this.map.cameraBounds.width,
    );
    this.cameras.main.scrollY = this.containCameraAxis(
      smoothedY,
      recruited.map((unit) => unit.position.y),
      visibleHeight,
      this.map.cameraBounds.y,
      this.map.cameraBounds.height,
    );
    this.minimap?.update(
      this.simulation.units,
      this.simulation.anchorId,
      {
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
        width: this.scale.width,
        height: this.scale.height,
        zoom: this.cameras.main.zoom,
      },
      { width: this.scale.width, height: this.scale.height },
      snapshot.dash,
    );
    this.lastPublish += delta;
    if (this.lastPublish >= 80) {
      this.lastPublish = 0;
      this.publish();
    }
  }

  private publish(): void {
    gameBridge.publish(this.simulation.snapshot());
  }

  private containCameraAxis(
    smoothedScroll: number,
    unitPositions: readonly number[],
    visibleSize: number,
    worldStart: number,
    worldSize: number,
  ): number {
    const maximumWorldScroll = Math.max(worldStart, worldStart + worldSize - visibleSize);
    const worldClamped = Phaser.Math.Clamp(smoothedScroll, worldStart, maximumWorldScroll);
    if (unitPositions.length === 0) return worldClamped;
    const minimumUnit = Math.min(...unitPositions);
    const maximumUnit = Math.max(...unitPositions);
    const inset = UNIT_FRAME_CONTRACT.boundaryRadius + GAME_CONFIG.camera.screenMargin;
    const minimumForTrailingEdge = maximumUnit + inset - visibleSize;
    const maximumForLeadingEdge = minimumUnit - inset;
    if (minimumForTrailingEdge > maximumForLeadingEdge) return worldClamped;
    return Phaser.Math.Clamp(
      Phaser.Math.Clamp(worldClamped, minimumForTrailingEdge, maximumForLeadingEdge),
      worldStart,
      maximumWorldScroll,
    );
  }

  private drawWorld(): void {
    const g = this.worldGraphics;
    g.fillStyle(this.map.preview.baseColor).fillRect(
      0,
      0,
      this.map.world.width,
      this.map.world.height,
    );
    for (const terrain of this.map.terrainRegions)
      g.fillStyle(terrain.color, terrain.alpha).fillRect(
        terrain.x,
        terrain.y,
        terrain.width,
        terrain.height,
      );
    for (const detail of generateMapDecorations(this.map, this.decorationSeed)) {
      if (detail.kind === 'flower')
        g.fillStyle(0xf0cf68, 0.78).fillCircle(
          detail.position.x,
          detail.position.y,
          2.2 * detail.scale,
        );
      else if (detail.kind === 'small-stone')
        g.fillStyle(0x899087, 0.55).fillEllipse(
          detail.position.x,
          detail.position.y,
          5 * detail.scale,
          3 * detail.scale,
        );
      else if (detail.kind === 'reeds')
        g.lineStyle(2, 0x63794b, 0.68).lineBetween(
          detail.position.x,
          detail.position.y + 4 * detail.scale,
          detail.position.x + Math.cos(detail.rotation) * 3,
          detail.position.y - 7 * detail.scale,
        );
      else if (detail.kind === 'leaves')
        g.fillStyle(0x9a7442, 0.48).fillEllipse(
          detail.position.x,
          detail.position.y,
          6 * detail.scale,
          2.5 * detail.scale,
        );
      else if (detail.kind === 'ground-patch')
        g.fillStyle(0x314a32, 0.12).fillEllipse(
          detail.position.x,
          detail.position.y,
          22 * detail.scale,
          10 * detail.scale,
        );
      else
        g.lineStyle(1.5, 0x9dbb62, 0.45).lineBetween(
          detail.position.x,
          detail.position.y + 3,
          detail.position.x + 1,
          detail.position.y - 5 * detail.scale,
        );
    }
    g.lineStyle(8, 0x445f32).strokeRect(4, 4, this.map.world.width - 8, this.map.world.height - 8);
    const shrine = this.map.shrine;
    g.fillStyle(0x252b22, 0.35).fillEllipse(
      shrine.x + 4,
      shrine.y + 10,
      GAME_CONFIG.shrine.outerRingRadius * 2.1,
      GAME_CONFIG.shrine.outerRingRadius * 0.75,
    );
    g.fillStyle(0x4b4936, 0.82).fillCircle(shrine.x, shrine.y, GAME_CONFIG.shrine.platformRadius);
    g.lineStyle(GAME_CONFIG.shrine.ringThickness, 0xd9b953, 0.95).strokeCircle(
      shrine.x,
      shrine.y,
      GAME_CONFIG.shrine.outerRingRadius,
    );
    for (const obstacle of this.map.obstacles) {
      if (obstacle.kind === 'tree') {
        const { x, y } = obstacle.position;
        g.fillStyle(0x172216, 0.3).fillEllipse(
          x + 10,
          y + obstacle.trunkRadius * 0.72,
          obstacle.canopyRadius * 1.55,
          obstacle.canopyRadius * 0.55,
        );
      } else if (obstacle.kind === 'log') {
        g.fillStyle(0x172216, 0.25).fillEllipse(
          obstacle.position.x + 5,
          obstacle.position.y + 7,
          obstacle.visualWidth,
          obstacle.visualHeight,
        );
      } else {
        g.fillStyle(0x172216, 0.25).fillEllipse(
          obstacle.position.x + 4,
          obstacle.position.y + 5,
          obstacle.visualWidth,
          obstacle.visualHeight * 0.6,
        );
      }
    }
  }

  private drawActors(deltaMs: number): void {
    const g = this.actorGraphics.clear();
    this.drawShrine(g);
    const visibleUnits = this.simulation.units.filter(
      (unit) => unit.alive || unit.deathTransitionRemainingMs > 0,
    );
    const drawables: Array<
      | { kind: 'unit'; sortY: number; unit: Unit }
      | { kind: 'obstacle'; sortY: number; obstacle: MapObstacle }
    > = [
      ...visibleUnits.map((unit) => ({ kind: 'unit' as const, sortY: unit.position.y, unit })),
      ...this.map.obstacles.map((obstacle) => ({
        kind: 'obstacle' as const,
        sortY:
          obstacle.position.y +
          (obstacle.kind === 'tree' ? obstacle.trunkRadius * 0.72 : obstacle.visualHeight * 0.45),
        obstacle,
      })),
    ];
    drawables.sort((a, b) => a.sortY - b.sortY);
    const dashActive = this.simulation.snapshot().dash.phase === 'active';
    for (const drawable of drawables) {
      if (drawable.kind === 'obstacle') this.drawObstacle(g, drawable.obstacle);
      else this.drawUnit(g, drawable.unit, deltaMs, dashActive);
    }
    this.animationController.cleanup(new Set(visibleUnits.map((unit) => unit.id)));

    for (const particle of this.simulation.particles) {
      const shrineEffect = particle.effect === 'shrine';
      const shrineDeathEffect = particle.effect === 'shrine-death';
      const dashEffect = particle.effect === 'dash';
      const movementEffect = particle.effect === 'movement';
      const advantageEffect = particle.effect === 'hit-advantage';
      const disadvantageEffect = particle.effect === 'hit-disadvantage';
      const metalEffect = particle.effect === 'metal';
      const deathColor =
        particle.faction === 'paper'
          ? 0xf7edce
          : particle.faction === 'scissors'
            ? 0xb9c9cd
            : 0x7a817d;
      g.fillStyle(
        shrineDeathEffect
          ? 0xff6f61
          : shrineEffect
            ? 0xffe38a
            : advantageEffect
              ? 0xfff09a
              : disadvantageEffect
                ? 0xd7b9a0
                : metalEffect
                  ? 0xe8f4f5
                  : movementEffect
                    ? 0xb6a77a
                    : dashEffect
                      ? 0xd8c990
                      : deathColor,
        particle.remainingMs / particle.lifetimeMs,
      );
      if (movementEffect) g.fillEllipse(particle.position.x, particle.position.y, 3, 2);
      else if (metalEffect) g.fillRect(particle.position.x - 1, particle.position.y - 3, 2, 6);
      else if (particle.effect === 'death' && particle.faction === 'paper')
        g.fillRect(particle.position.x - 3, particle.position.y - 1, 6, 2);
      else
        g.fillRect(
          particle.position.x - (shrineDeathEffect ? 4 : shrineEffect ? 3 : 2),
          particle.position.y - (shrineDeathEffect ? 4 : shrineEffect ? 3 : 2),
          shrineDeathEffect ? 8 : shrineEffect ? 6 : advantageEffect ? 6 : dashEffect ? 3 : 4,
          shrineDeathEffect ? 8 : shrineEffect ? 6 : advantageEffect ? 6 : dashEffect ? 3 : 4,
        );
    }
    if (import.meta.env.DEV) {
      const center = this.simulation.swarmCenter();
      g.lineStyle(1, 0x9ee8ff, 0.18).strokeCircle(
        center.x,
        center.y,
        this.simulation.currentRecruitmentRadius(),
      );
    }
  }

  private drawUnit(
    g: Phaser.GameObjects.Graphics,
    unit: Unit,
    deltaMs: number,
    dashActive: boolean,
  ): void {
    const pose = this.animationController.update(
      unit,
      {
        dashActive,
        shrineTransformActive: unit.shrineTransformRemainingMs > 0,
        reducedMotion: this.visualSettings.reducedMotion,
      },
      deltaMs,
    );
    const alpha = unit.alive
      ? 1
      : Math.max(
          0,
          unit.deathTransitionRemainingMs / GAME_CONFIG.visuals.animation.deathTransitionMs,
        );
    const spriteDefinition = UNIT_SPRITE_MANIFEST.factions[unit.faction];
    const visualRadius = UNIT_FRAME_CONTRACT.boundaryRadius;
    if (unit.recruited && unit.alive)
      g.lineStyle(2, 0xffdc62, 0.85).strokeCircle(
        unit.position.x,
        unit.position.y,
        visualRadius + 2,
      );
    if (unit.recruitEffectRemainingMs > 0 && !this.visualSettings.reducedMotion) {
      const progress =
        1 - unit.recruitEffectRemainingMs / GAME_CONFIG.visuals.animation.recruitmentEffectMs;
      g.lineStyle(2, FACTION_COLORS[unit.faction], 1 - progress).strokeCircle(
        unit.position.x,
        unit.position.y,
        visualRadius + 2 + progress * 13,
      );
    }
    if (unit.knockbackRemainingMs > 0) {
      const knockbackMagnitude = Math.hypot(unit.knockback.x, unit.knockback.y);
      if (knockbackMagnitude > 0) {
        const trailLength = visualRadius + 5;
        const trailAlpha = Math.min(
          1,
          unit.knockbackRemainingMs / GAME_CONFIG.combat.knockbackDurationMs,
        );
        g.lineStyle(3, 0xffefb0, trailAlpha).lineBetween(
          unit.position.x,
          unit.position.y,
          unit.position.x - (unit.knockback.x / knockbackMagnitude) * trailLength,
          unit.position.y - (unit.knockback.y / knockbackMagnitude) * trailLength,
        );
      }
    }
    const crowding = this.simulation.units.filter(
      (candidate) =>
        candidate !== unit &&
        candidate.alive &&
        candidate.faction === unit.faction &&
        Phaser.Math.Distance.Between(
          candidate.position.x,
          candidate.position.y,
          unit.position.x,
          unit.position.y,
        ) < GAME_CONFIG.swarm.separationRadius,
    ).length;
    const compression = crowding >= 3 ? 0.92 : 1;
    const speedStretch = this.visualSettings.reducedMotion
      ? 1
      : 1 + Math.min(0.06, Math.hypot(unit.velocity.x, unit.velocity.y) / 2500);
    g.fillStyle(0x172216, 0.28 * alpha).fillEllipse(
      unit.position.x + 2,
      unit.position.y + 10,
      27 * spriteDefinition.renderScale * compression,
      8,
    );
    this.drawPixelFrame(
      g,
      unit,
      pose,
      pose.scaleX * spriteDefinition.renderScale * compression * speedStretch,
      pose.scaleY * spriteDefinition.renderScale * compression,
      alpha,
    );
    if (unit.health < unit.maxHealth && unit.alive) {
      const healthWidth = 28;
      const healthY = unit.position.y - visualRadius - 5;
      g.fillStyle(0x263024, 0.9).fillRect(
        unit.position.x - healthWidth / 2,
        healthY,
        healthWidth,
        3,
      );
      g.fillStyle(0xd8e46c, 0.95).fillRect(
        unit.position.x - healthWidth / 2,
        healthY,
        healthWidth * (unit.health / unit.maxHealth),
        3,
      );
    }
  }

  private drawPixelFrame(
    g: Phaser.GameObjects.Graphics,
    unit: Unit,
    pose: UnitAnimationPose,
    scaleX: number,
    scaleY: number,
    alpha: number,
  ): void {
    const palette = UNIT_SPRITE_MANIFEST.factions[unit.faction].palette;
    const centerX = unit.position.x;
    const centerY = unit.position.y + pose.offsetY;
    for (const pixel of pose.frame.pixels) {
      const left =
        (pixel.x - UNIT_FRAME_CONTRACT.originX) * UNIT_FRAME_CONTRACT.displayScale * scaleX;
      const top =
        (pixel.y - UNIT_FRAME_CONTRACT.originY) * UNIT_FRAME_CONTRACT.displayScale * scaleY;
      const width = pixel.width * UNIT_FRAME_CONTRACT.displayScale * scaleX;
      const height = pixel.height * UNIT_FRAME_CONTRACT.displayScale * scaleY;
      const points = [
        { x: left, y: top },
        { x: left + width, y: top },
        { x: left + width, y: top + height },
        { x: left, y: top + height },
      ].map((point) => ({
        x: centerX + point.x * Math.cos(pose.rotation) - point.y * Math.sin(pose.rotation),
        y: centerY + point.x * Math.sin(pose.rotation) + point.y * Math.cos(pose.rotation),
      }));
      g.fillStyle(unit.flashRemainingMs > 0 ? 0xffffff : palette[pixel.tone], alpha)
        .beginPath()
        .moveTo(points[0]!.x, points[0]!.y)
        .lineTo(points[1]!.x, points[1]!.y)
        .lineTo(points[2]!.x, points[2]!.y)
        .lineTo(points[3]!.x, points[3]!.y)
        .closePath()
        .fillPath();
    }
  }

  private drawObstacle(g: Phaser.GameObjects.Graphics, obstacle: MapObstacle): void {
    if (obstacle.kind === 'tree') {
      const { x, y } = obstacle.position;
      g.fillStyle(0x6f4d2d).fillRoundedRect(
        x - obstacle.trunkRadius * 0.42,
        y - obstacle.trunkRadius * 0.2,
        obstacle.trunkRadius * 0.84,
        obstacle.trunkRadius * 1.35,
        6,
      );
      g.fillStyle(0x35271c, 0.8).fillRect(
        x - obstacle.trunkRadius * 0.34,
        y + obstacle.trunkRadius * 0.62,
        obstacle.trunkRadius * 0.68,
        5,
      );
      g.fillStyle(0x1f482b).fillCircle(x, y - obstacle.canopyRadius * 0.38, obstacle.canopyRadius);
      g.fillStyle(obstacle.canopyColor).fillCircle(
        x - obstacle.canopyRadius * 0.38,
        y - obstacle.canopyRadius * 0.48,
        obstacle.canopyRadius * 0.62,
      );
      g.fillStyle(0x4b7c45, 0.9).fillCircle(
        x + obstacle.canopyRadius * 0.4,
        y - obstacle.canopyRadius * 0.34,
        obstacle.canopyRadius * 0.54,
      );
    } else if (obstacle.kind === 'log') {
      g.fillStyle(0x6f4d2d).fillRoundedRect(
        obstacle.position.x - obstacle.visualWidth / 2,
        obstacle.position.y - obstacle.visualHeight / 2,
        obstacle.visualWidth,
        obstacle.visualHeight,
        8,
      );
    } else
      g.fillStyle(0x777d76).fillEllipse(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.visualWidth,
        obstacle.visualHeight,
      );
  }

  private handleEffectEvents(): void {
    for (const event of this.simulation.drainEffectEvents()) {
      if ('soundHook' in event) this.events.emit('sound-hook', event.soundHook);
      if (
        (event.kind === 'hit' || event.kind === 'clash') &&
        shouldApplyScreenShake(this.visualSettings, event.shakeStrength)
      )
        this.cameras.main.shake(GAME_CONFIG.camera.shakeDurationMs, event.shakeStrength, true);
    }
  }

  private drawShrine(g: Phaser.GameObjects.Graphics): void {
    const center = this.map.shrine;
    const state = this.simulation.snapshot().shrine;
    const inactive = state.status === 'used';
    const glowAlpha = inactive
      ? 0.08
      : this.visualSettings.reducedMotion
        ? 0.18
        : 0.16 + (Math.sin(this.simulation.elapsedMs / 260) + 1) * 0.08;
    g.lineStyle(3, inactive ? 0x6f746c : 0xf4d56f, glowAlpha).strokeCircle(
      center.x,
      center.y,
      GAME_CONFIG.shrine.outerRingRadius + 4,
    );
    g.lineStyle(1, inactive ? 0x777c72 : 0xe7cb70, inactive ? 0.28 : 0.38).strokeCircle(
      center.x,
      center.y,
      GAME_CONFIG.shrine.activationRadius,
    );

    for (const [index, faction] of FACTIONS.entries()) {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / FACTIONS.length;
      const position = {
        x: center.x + Math.cos(angle) * GAME_CONFIG.shrine.symbolOrbitRadius,
        y: center.y + Math.sin(angle) * GAME_CONFIG.shrine.symbolOrbitRadius,
      };
      const selected = state.selectedFaction === faction && !inactive;
      const current = this.simulation.playerFaction === faction;
      if (selected)
        g.lineStyle(2, 0xffe68b, 1).strokeCircle(
          position.x,
          position.y,
          GAME_CONFIG.shrine.symbolSize + 5,
        );
      this.drawFactionGlyph(
        g,
        faction,
        position.x,
        position.y,
        GAME_CONFIG.shrine.symbolSize,
        inactive || current ? 0x777c72 : FACTION_COLORS[faction],
        inactive ? 0.45 : current ? 0.35 : 1,
      );
      if (current && !inactive)
        g.lineStyle(2, 0x777c72, 0.8).lineBetween(
          position.x - GAME_CONFIG.shrine.symbolSize - 2,
          position.y - GAME_CONFIG.shrine.symbolSize - 2,
          position.x + GAME_CONFIG.shrine.symbolSize + 2,
          position.y + GAME_CONFIG.shrine.symbolSize + 2,
        );
    }

    if (state.selectedFaction && !inactive)
      this.drawFactionGlyph(
        g,
        state.selectedFaction,
        center.x,
        center.y,
        GAME_CONFIG.shrine.symbolSize + 2,
        FACTION_COLORS[state.selectedFaction],
        state.status === 'channeling' ? 1 : 0.7,
      );

    if (state.status === 'channeling') {
      const progress = state.channelProgressMs / state.channelDurationMs;
      g.lineStyle(4, 0xffe27b, 1)
        .beginPath()
        .arc(
          center.x,
          center.y,
          GAME_CONFIG.shrine.outerRingRadius + 7,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * progress,
        )
        .strokePath();
    }
    if (inactive)
      g.lineStyle(3, 0x6f746c, 0.8)
        .lineBetween(center.x - 17, center.y - 17, center.x + 17, center.y + 17)
        .lineBetween(center.x + 17, center.y - 17, center.x - 17, center.y + 17);

    if (state.transformationEffectRemainingMs > 0) {
      const progress =
        1 - state.transformationEffectRemainingMs / GAME_CONFIG.shrine.effectLifetimeMs;
      g.lineStyle(4, 0xffefae, 1 - progress).strokeCircle(
        center.x,
        center.y,
        GAME_CONFIG.shrine.outerRingRadius + progress * 70,
      );
    }
    if (state.cancelledFeedbackRemainingMs > 0) {
      const alpha = state.cancelledFeedbackRemainingMs / GAME_CONFIG.shrine.cancelledFeedbackMs;
      g.lineStyle(3, 0xff6f61, alpha).strokeCircle(
        center.x,
        center.y,
        GAME_CONFIG.shrine.outerRingRadius + 10,
      );
    }
  }

  private drawFactionGlyph(
    g: Phaser.GameObjects.Graphics,
    faction: Faction,
    x: number,
    y: number,
    size: number,
    color: number,
    alpha: number,
  ): void {
    if (faction === 'rock') {
      g.fillStyle(color, alpha)
        .fillCircle(x, y, size)
        .fillStyle(0xffffff, alpha * 0.28)
        .fillCircle(x - size * 0.3, y - size * 0.3, size * 0.28);
    } else if (faction === 'paper') {
      const width = size * 1.7;
      const height = size * 2.2;
      g.fillStyle(color, alpha)
        .fillRect(x - width / 2, y - height / 2, width, height)
        .lineStyle(Math.max(1, size * 0.2), 0x252820, alpha * 0.75)
        .strokeRect(x - width / 2, y - height / 2, width, height)
        .lineBetween(x + width * 0.1, y - height / 2, x + width / 2, y - height * 0.12)
        .lineBetween(x + width * 0.1, y - height / 2, x + width * 0.1, y - height * 0.12);
    } else {
      const handleX = x - size * 0.55;
      const handleOffsetY = size * 0.48;
      const handleRadius = size * 0.32;
      g.lineStyle(Math.max(1.5, size * 0.32), color, alpha)
        .strokeCircle(handleX, y - handleOffsetY, handleRadius)
        .strokeCircle(handleX, y + handleOffsetY, handleRadius)
        .lineBetween(x - size * 0.22, y - size * 0.2, x + size, y + size * 0.78)
        .lineBetween(x - size * 0.22, y + size * 0.2, x + size, y - size * 0.78)
        .fillStyle(color, alpha)
        .fillCircle(x - size * 0.1, y, Math.max(1.2, size * 0.2));
    }
  }
}
