import { GAME_CONFIG } from '../config/gameConfig';

export interface VisualSettings {
  screenShake: boolean;
  particleIntensity: number;
  reducedMotion: boolean;
  reducedFlashes: boolean;
}

export interface HitEffectProfile {
  kind: 'advantage' | 'disadvantage';
  particleCount: number;
  flashMs: number;
  hitPauseMs: number;
  shakeStrength: number;
}

export interface CameraFeel {
  smoothing: number;
  targetZoom: number;
}

export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  screenShake: true,
  particleIntensity: 1,
  reducedMotion: false,
  reducedFlashes: false,
};

export function resolveVisualSettings(settings: Partial<VisualSettings> = {}): VisualSettings {
  const particleIntensity = Number.isFinite(settings.particleIntensity)
    ? Math.max(0, Math.min(4, settings.particleIntensity!))
    : DEFAULT_VISUAL_SETTINGS.particleIntensity;
  return {
    ...DEFAULT_VISUAL_SETTINGS,
    ...settings,
    particleIntensity,
  };
}

export function hitEffectProfile(advantaged: boolean, settings: VisualSettings): HitEffectProfile {
  const config = GAME_CONFIG.visuals;
  const baseCount = advantaged
    ? config.particles.advantageHitCount
    : config.particles.disadvantageHitCount;
  const flashMs = advantaged ? config.combat.advantageFlashMs : config.combat.disadvantageFlashMs;
  return {
    kind: advantaged ? 'advantage' : 'disadvantage',
    particleCount: Math.max(0, Math.round(baseCount * settings.particleIntensity)),
    flashMs: settings.reducedFlashes ? Math.min(45, flashMs) : flashMs,
    hitPauseMs:
      settings.reducedMotion || !advantaged
        ? config.combat.disadvantageHitPauseMs
        : config.combat.advantageHitPauseMs,
    shakeStrength:
      settings.reducedMotion || !settings.screenShake || !advantaged
        ? 0
        : GAME_CONFIG.camera.shakeIntensity,
  };
}

export function shouldApplyScreenShake(settings: VisualSettings, strength: number): boolean {
  return settings.screenShake && !settings.reducedMotion && strength > 0;
}

export function cameraFeelFor(
  recruitedCount: number,
  swarmSpeed: number,
  settings: VisualSettings,
): CameraFeel {
  if (settings.reducedMotion) return { smoothing: GAME_CONFIG.camera.smoothing, targetZoom: 1 };
  const speedRatio = Math.min(1, Math.max(0, swarmSpeed) / 180);
  const smoothing = Math.max(
    GAME_CONFIG.camera.minimumSmoothing,
    GAME_CONFIG.camera.smoothing * (1 - speedRatio * GAME_CONFIG.camera.velocityLagStrength),
  );
  const zoomProgress = Math.min(
    1,
    Math.max(
      0,
      (recruitedCount - GAME_CONFIG.camera.zoomOutStartCount) /
        (GAME_CONFIG.camera.zoomOutFullCount - GAME_CONFIG.camera.zoomOutStartCount),
    ),
  );
  return {
    smoothing,
    targetZoom: 1 - (1 - GAME_CONFIG.camera.minimumZoom) * zoomProgress,
  };
}
