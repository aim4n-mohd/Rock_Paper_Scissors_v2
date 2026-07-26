import {
  DEFAULT_VISUAL_SETTINGS,
  cameraFeelFor,
  hitEffectProfile,
  resolveVisualSettings,
  shouldApplyScreenShake,
} from './gameFeel';

describe('configurable game-feel profiles', () => {
  it('makes advantage hits stronger and visually distinct', () => {
    const weak = hitEffectProfile(false, DEFAULT_VISUAL_SETTINGS);
    const strong = hitEffectProfile(true, DEFAULT_VISUAL_SETTINGS);

    expect(strong.kind).toBe('advantage');
    expect(weak.kind).toBe('disadvantage');
    expect(strong.particleCount).toBeGreaterThan(weak.particleCount);
    expect(strong.flashMs).toBeGreaterThan(weak.flashMs);
    expect(strong.hitPauseMs).toBeGreaterThan(weak.hitPauseMs);
  });

  it('accepts future settings safely', () => {
    expect(resolveVisualSettings({ particleIntensity: 0.25, reducedFlashes: true })).toEqual({
      screenShake: true,
      particleIntensity: 0.25,
      minimapOpacity: 1,
      reducedMotion: false,
      reducedFlashes: true,
    });
  });

  it('prevents shake when disabled and suppresses nonessential camera motion', () => {
    expect(shouldApplyScreenShake({ ...DEFAULT_VISUAL_SETTINGS, screenShake: false }, 1)).toBe(
      false,
    );
    expect(
      cameraFeelFor(30, 140, { ...DEFAULT_VISUAL_SETTINGS, reducedMotion: true }).targetZoom,
    ).toBe(1);
  });
});
