import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig';
import { getMapDefinition, type MapId } from './maps/maps';
import { ArenaScene } from './scenes/ArenaScene';
import type { VisualSettings } from './systems/gameFeel';

export function createGameConfig(
  parent: HTMLElement,
  mapId: MapId = 'meadow',
  visualSettings: Partial<VisualSettings> = {},
): Phaser.Types.Core.GameConfig {
  const map = getMapDefinition(mapId);
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_CONFIG.viewport.width,
    height: GAME_CONFIG.viewport.height,
    backgroundColor: map.preview.baseColor,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    render: { antialias: false, pixelArt: true, roundPixels: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [new ArenaScene(mapId, undefined, visualSettings)],
  };
}

export function createGame(
  parent: HTMLElement,
  mapId: MapId = 'meadow',
  visualSettings: Partial<VisualSettings> = {},
): Phaser.Game {
  return new Phaser.Game(createGameConfig(parent, mapId, visualSettings));
}
