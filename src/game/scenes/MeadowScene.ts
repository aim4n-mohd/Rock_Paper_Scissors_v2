import Phaser from 'phaser';
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
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      releaseController();
      this.minimap?.destroy();
      this.minimap = undefined;
    });
    this.publish();
  }

  update(_time: number, delta: number): void {
    this.simulation.update(delta, gameBridge.input);
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
    g.fillStyle(0x50482f, 0.5).fillCircle(shrine.x, shrine.y + 5, 25);
    g.fillStyle(0xf2c95c, 0.9).fillCircle(shrine.x, shrine.y, 13);
    g.lineStyle(3, 0x8a6c2d, 0.95).strokeCircle(shrine.x, shrine.y, 17);
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
      g.fillStyle(
        FACTION_COLORS[particle.faction],
        particle.remainingMs / particle.lifetimeMs,
      ).fillRect(particle.position.x - 2, particle.position.y - 2, 4, 4);
    }
  }
}
