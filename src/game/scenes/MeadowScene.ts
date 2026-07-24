import Phaser from 'phaser';
import { FACTIONS, type Faction } from '../config/factions';
import { FACTION_COLORS } from '../config/factionVisuals';
import { GAME_CONFIG } from '../config/gameConfig';
import { gameBridge } from '../events/gameBridge';
import { MinimapSystem } from '../minimap/MinimapSystem';
import { Simulation } from '../simulation/Simulation';

export class MeadowScene extends Phaser.Scene {
  private simulation = new Simulation(Date.now() & 0xffff);
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private actorGraphics!: Phaser.GameObjects.Graphics;
  private minimap?: MinimapSystem;
  private lastPublish = 0;

  constructor() {
    super('meadow');
  }

  create(): void {
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.world.width, GAME_CONFIG.world.height);
    this.worldGraphics = this.add.graphics();
    this.actorGraphics = this.add.graphics();
    this.drawWorld();
    this.minimap = new MinimapSystem(this, {
      config: GAME_CONFIG.minimap,
      world: { x: 0, y: 0, width: GAME_CONFIG.world.width, height: GAME_CONFIG.world.height },
      trees: GAME_CONFIG.trees.positions,
      shrine: GAME_CONFIG.landmarks.shrine,
    });
    this.minimap.initialize({ width: this.scale.width, height: this.scale.height });
    const releaseController = gameBridge.bindController({
      togglePause: () => {
        this.simulation.togglePaused();
        this.publish();
      },
      restart: () => {
        this.simulation.restart(Date.now() & 0xffff);
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
      requestDash: () => {
        this.simulation.requestDash(gameBridge.input);
        this.publish();
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
    this.drawActors();
    const target = this.simulation.swarmCenter();
    const desiredX = Phaser.Math.Clamp(
      target.x - this.scale.width / 2,
      0,
      GAME_CONFIG.world.width - this.scale.width,
    );
    const desiredY = Phaser.Math.Clamp(
      target.y - this.scale.height / 2,
      0,
      GAME_CONFIG.world.height - this.scale.height,
    );
    this.cameras.main.scrollX = Phaser.Math.Linear(
      this.cameras.main.scrollX,
      desiredX,
      GAME_CONFIG.camera.smoothing,
    );
    this.cameras.main.scrollY = Phaser.Math.Linear(
      this.cameras.main.scrollY,
      desiredY,
      GAME_CONFIG.camera.smoothing,
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
      this.simulation.snapshot().dash,
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

  private drawWorld(): void {
    const g = this.worldGraphics;
    g.fillStyle(0x73964b).fillRect(0, 0, GAME_CONFIG.world.width, GAME_CONFIG.world.height);
    for (let y = 45; y < GAME_CONFIG.world.height; y += 90) {
      for (let x = 40 + ((y / 90) % 2) * 35; x < GAME_CONFIG.world.width; x += 115) {
        g.fillStyle(0x6b8d45, 0.55).fillRect(x, y, 3, 8);
        g.fillStyle(0x9dbb62, 0.45).fillRect(x + 5, y + 4, 2, 6);
      }
    }
    g.lineStyle(8, 0x445f32).strokeRect(
      4,
      4,
      GAME_CONFIG.world.width - 8,
      GAME_CONFIG.world.height - 8,
    );
    const shrine = GAME_CONFIG.landmarks.shrine;
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
    for (const tree of GAME_CONFIG.trees.positions) {
      g.fillStyle(0x304421, 0.35).fillEllipse(tree.x + 10, tree.y + 19, 70, 32);
      g.fillStyle(0x735232).fillRect(tree.x - 7, tree.y + 5, 14, 32);
      g.fillStyle(0x294c27).fillCircle(tree.x, tree.y, GAME_CONFIG.trees.radius);
      g.fillStyle(0x3f7136).fillCircle(tree.x - 10, tree.y - 9, GAME_CONFIG.trees.radius * 0.7);
      g.fillStyle(0x568b43).fillCircle(tree.x + 13, tree.y - 4, GAME_CONFIG.trees.radius * 0.57);
    }
  }

  private drawActors(): void {
    const g = this.actorGraphics.clear();
    this.drawShrine(g);
    for (const unit of this.simulation.units) {
      if (!unit.alive) continue;
      const color = unit.flashRemainingMs > 0 ? 0xffffff : FACTION_COLORS[unit.faction];
      if (unit.recruited)
        g.lineStyle(2, 0xffdc62, 0.85).strokeCircle(
          unit.position.x,
          unit.position.y,
          unit.radius + 5,
        );
      g.fillStyle(0x172216, 0.3).fillEllipse(unit.position.x + 2, unit.position.y + 7, 22, 8);
      g.fillStyle(color);
      if (unit.faction === 'rock') {
        g.fillRoundedRect(unit.position.x - 9, unit.position.y - 8, 18, 16, 5);
      } else if (unit.faction === 'paper') {
        g.fillRect(unit.position.x - 8, unit.position.y - 10, 16, 20);
        g.lineStyle(2, 0xc8bfa6).lineBetween(
          unit.position.x + 2,
          unit.position.y - 10,
          unit.position.x + 8,
          unit.position.y - 4,
        );
      } else {
        g.lineStyle(5, color).lineBetween(
          unit.position.x - 7,
          unit.position.y - 9,
          unit.position.x + 7,
          unit.position.y + 9,
        );
        g.lineBetween(
          unit.position.x + 7,
          unit.position.y - 9,
          unit.position.x - 7,
          unit.position.y + 9,
        );
        g.fillStyle(color)
          .fillCircle(unit.position.x - 7, unit.position.y + 9, 3)
          .fillCircle(unit.position.x + 7, unit.position.y + 9, 3);
      }
      if (unit.health < unit.maxHealth && unit.flashRemainingMs > 0) {
        g.fillStyle(0x263024).fillRect(unit.position.x - 11, unit.position.y - 17, 22, 3);
        g.fillStyle(0xd8e46c).fillRect(
          unit.position.x - 11,
          unit.position.y - 17,
          22 * (unit.health / unit.maxHealth),
          3,
        );
      }
    }
    for (const particle of this.simulation.particles) {
      const shrineEffect = particle.effect === 'shrine';
      const dashEffect = particle.effect === 'dash';
      g.fillStyle(
        shrineEffect ? 0xffe38a : dashEffect ? 0xd8c990 : FACTION_COLORS[particle.faction],
        particle.remainingMs / particle.lifetimeMs,
      ).fillRect(
        particle.position.x - (shrineEffect ? 3 : 2),
        particle.position.y - (shrineEffect ? 3 : 2),
        shrineEffect ? 6 : dashEffect ? 3 : 4,
        shrineEffect ? 6 : dashEffect ? 3 : 4,
      );
    }
  }

  private drawShrine(g: Phaser.GameObjects.Graphics): void {
    const center = GAME_CONFIG.landmarks.shrine;
    const state = this.simulation.snapshot().shrine;
    const inactive = state.status === 'used';
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
        inactive ? 0x777c72 : FACTION_COLORS[faction],
        inactive ? 0.45 : 1,
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
    g.fillStyle(color, alpha);
    if (faction === 'rock') {
      g.fillCircle(x, y, size);
    } else if (faction === 'paper') {
      g.fillRect(x - size, y - size * 1.2, size * 2, size * 2.4);
    } else {
      g.lineStyle(Math.max(2, size * 0.55), color, alpha)
        .lineBetween(x - size, y - size, x + size, y + size)
        .lineBetween(x + size, y - size, x - size, y + size);
    }
  }
}
