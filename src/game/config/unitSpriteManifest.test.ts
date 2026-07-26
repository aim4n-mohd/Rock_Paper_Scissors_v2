import { FACTIONS } from './factions';
import {
  ANIMATION_STATES,
  UNIT_FRAME_CONTRACT,
  UNIT_SPRITE_MANIFEST,
  resolveSpriteFrame,
  validateUnitSpriteManifest,
} from './unitSpriteManifest';

describe('unit sprite manifest', () => {
  it('defines every required animation for every faction', () => {
    expect(() => validateUnitSpriteManifest(UNIT_SPRITE_MANIFEST)).not.toThrow();
    for (const faction of FACTIONS) {
      const definition = UNIT_SPRITE_MANIFEST.factions[faction];
      expect(definition.silhouette).toMatch(/stone|sheet|scissors/);
      for (const state of ANIMATION_STATES)
        expect(definition.animations[state].frames.length, `${faction}:${state}`).toBeGreaterThan(
          0,
        );
    }
  });

  it('establishes a fixed small nearest-neighbour frame contract', () => {
    expect(UNIT_FRAME_CONTRACT).toEqual({
      width: 16,
      height: 16,
      originX: 8,
      originY: 8,
      displayScale: 1.5,
      filtering: 'nearest',
    });
  });

  it('returns a safe faction fallback and warns in development for a missing frame', () => {
    const warn = vi.fn();
    const resolved = resolveSpriteFrame('paper', 'move', 999, warn);

    expect(resolved.id).toBe(UNIT_SPRITE_MANIFEST.factions.paper.fallbackFrame);
    expect(warn).toHaveBeenCalledOnce();
  });
});
