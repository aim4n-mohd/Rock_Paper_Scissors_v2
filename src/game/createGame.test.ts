const phaserMocks = vi.hoisted(() => ({
  Game: vi.fn(function MockGame(this: { config: unknown }, config: unknown) {
    this.config = config;
  }),
}));

vi.mock('phaser', () => ({
  default: {
    AUTO: 'AUTO',
    Game: phaserMocks.Game,
    Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
  },
}));

vi.mock('./scenes/ArenaScene', () => ({ ArenaScene: class ArenaScene {} }));

import { GAME_CONFIG } from './config/gameConfig';
import { createGame, createGameConfig } from './createGame';

describe('Phaser game factory', () => {
  it('builds a crisp, responsive game config and constructs Phaser once', () => {
    const parent = document.createElement('div');
    const config = createGameConfig(parent);

    expect(config).toMatchObject({
      parent,
      width: GAME_CONFIG.viewport.width,
      height: GAME_CONFIG.viewport.height,
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      render: { antialias: false, pixelArt: true, roundPixels: true },
    });

    const game = createGame(parent);
    expect(phaserMocks.Game).toHaveBeenCalledOnce();
    expect(game).toBeInstanceOf(phaserMocks.Game);

    expect(createGameConfig(parent, 'forest').backgroundColor).not.toBe(config.backgroundColor);
  });
});
