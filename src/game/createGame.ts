import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig';
import { MeadowScene } from './scenes/MeadowScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_CONFIG.viewport.width,
    height: GAME_CONFIG.viewport.height,
    backgroundColor: '#73964b',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [MeadowScene],
  };
}

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game(createGameConfig(parent));
}
