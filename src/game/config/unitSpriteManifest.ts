import { FACTIONS, type Faction } from './factions';

export const ANIMATION_STATES = ['idle', 'move', 'dash', 'hit', 'death', 'shrine'] as const;
export type UnitAnimationState = (typeof ANIMATION_STATES)[number];
export type PixelTone = 'outline' | 'base' | 'light' | 'shade' | 'accent';

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  tone: PixelTone;
}

export interface PixelSpriteFrame {
  id: string;
  pixels: readonly PixelRect[];
}

export interface AnimationDefinition {
  frames: readonly string[];
  frameDurationMs: number;
  loop: boolean;
}

export interface FactionSpriteDefinition {
  silhouette: 'uneven-stone-cracks' | 'folded-fluttering-sheet' | 'handled-scissors-blades';
  renderScale: number;
  fallbackFrame: string;
  palette: Record<PixelTone, number>;
  frames: Readonly<Record<string, PixelSpriteFrame>>;
  animations: Record<UnitAnimationState, AnimationDefinition>;
}

export interface UnitSpriteManifest {
  contract: typeof UNIT_FRAME_CONTRACT;
  factions: Record<Faction, FactionSpriteDefinition>;
}

export const UNIT_FRAME_CONTRACT = {
  width: 16,
  height: 16,
  originX: 8,
  originY: 8,
  displayScale: 1.7,
  boundaryRadius: 23,
  filtering: 'nearest',
} as const;

const rect = (x: number, y: number, width: number, height: number, tone: PixelTone): PixelRect => ({
  x,
  y,
  width,
  height,
  tone,
});

function frame(id: string, pixels: readonly PixelRect[]): PixelSpriteFrame {
  return { id, pixels };
}

const ROCK_FRAMES = {
  'rock-idle-0': frame('rock-idle-0', [
    rect(4, 2, 8, 1, 'outline'),
    rect(2, 4, 12, 8, 'outline'),
    rect(4, 13, 8, 1, 'outline'),
    rect(3, 3, 10, 10, 'base'),
    rect(4, 3, 6, 2, 'light'),
    rect(4, 5, 2, 1, 'light'),
    rect(4, 11, 8, 2, 'shade'),
    rect(11, 6, 2, 6, 'shade'),
    rect(7, 6, 1, 3, 'accent'),
    rect(8, 8, 2, 1, 'accent'),
    rect(9, 9, 1, 2, 'accent'),
  ]),
  'rock-idle-1': frame('rock-idle-1', [
    rect(3, 3, 9, 1, 'outline'),
    rect(2, 5, 12, 7, 'outline'),
    rect(4, 13, 8, 1, 'outline'),
    rect(3, 4, 10, 9, 'base'),
    rect(4, 4, 6, 2, 'light'),
    rect(5, 11, 8, 2, 'shade'),
    rect(11, 7, 2, 5, 'shade'),
    rect(6, 7, 3, 1, 'accent'),
    rect(8, 8, 1, 3, 'accent'),
    rect(9, 10, 2, 1, 'accent'),
  ]),
  'rock-dash': frame('rock-dash', [
    rect(1, 5, 14, 7, 'outline'),
    rect(3, 3, 9, 11, 'outline'),
    rect(2, 6, 12, 6, 'base'),
    rect(4, 4, 7, 2, 'light'),
    rect(5, 11, 8, 2, 'shade'),
    rect(10, 7, 1, 4, 'accent'),
    rect(8, 9, 3, 1, 'accent'),
  ]),
  'rock-hit': frame('rock-hit', [
    rect(2, 6, 12, 6, 'outline'),
    rect(4, 4, 8, 10, 'outline'),
    rect(3, 6, 10, 7, 'base'),
    rect(4, 6, 6, 2, 'light'),
    rect(5, 11, 7, 2, 'shade'),
    rect(6, 8, 4, 1, 'accent'),
    rect(8, 9, 1, 3, 'accent'),
  ]),
  'rock-death': frame('rock-death', [
    rect(1, 10, 5, 3, 'outline'),
    rect(6, 8, 4, 4, 'outline'),
    rect(11, 10, 4, 3, 'outline'),
    rect(2, 10, 3, 2, 'base'),
    rect(7, 9, 2, 2, 'shade'),
    rect(12, 10, 2, 2, 'base'),
  ]),
  'rock-shrine': frame('rock-shrine', [
    rect(4, 1, 8, 1, 'accent'),
    rect(2, 4, 12, 8, 'outline'),
    rect(4, 14, 8, 1, 'accent'),
    rect(3, 3, 10, 10, 'light'),
    rect(4, 5, 8, 7, 'base'),
    rect(7, 6, 1, 4, 'accent'),
    rect(8, 9, 3, 1, 'accent'),
  ]),
} as const;

const PAPER_FRAMES = {
  'paper-idle-0': frame('paper-idle-0', [
    rect(3, 0, 8, 2, 'outline'),
    rect(1, 2, 2, 11, 'outline'),
    rect(3, 13, 9, 2, 'outline'),
    rect(12, 4, 2, 9, 'outline'),
    rect(10, 1, 4, 4, 'outline'),
    rect(3, 2, 9, 11, 'base'),
    rect(2, 4, 2, 7, 'base'),
    rect(4, 2, 6, 3, 'light'),
    rect(10, 2, 2, 2, 'light'),
    rect(4, 11, 8, 2, 'shade'),
    rect(11, 5, 1, 7, 'shade'),
    rect(10, 1, 1, 4, 'accent'),
    rect(10, 4, 3, 1, 'accent'),
    rect(6, 6, 2, 1, 'accent'),
    rect(7, 7, 1, 5, 'accent'),
  ]),
  'paper-idle-1': frame('paper-idle-1', [
    rect(4, 0, 8, 2, 'outline'),
    rect(2, 2, 2, 10, 'outline'),
    rect(1, 11, 3, 3, 'outline'),
    rect(4, 13, 9, 2, 'outline'),
    rect(12, 4, 2, 9, 'outline'),
    rect(10, 1, 4, 4, 'outline'),
    rect(4, 2, 8, 11, 'base'),
    rect(3, 4, 2, 7, 'base'),
    rect(2, 11, 3, 2, 'light'),
    rect(5, 2, 5, 3, 'light'),
    rect(10, 2, 2, 2, 'light'),
    rect(5, 11, 7, 2, 'shade'),
    rect(11, 5, 1, 7, 'shade'),
    rect(10, 1, 1, 4, 'accent'),
    rect(10, 4, 3, 1, 'accent'),
    rect(6, 6, 1, 6, 'accent'),
  ]),
  'paper-flutter-0': frame('paper-flutter-0', [
    rect(2, 1, 10, 2, 'outline'),
    rect(0, 3, 3, 9, 'outline'),
    rect(2, 12, 4, 3, 'outline'),
    rect(6, 13, 8, 2, 'outline'),
    rect(13, 5, 2, 8, 'outline'),
    rect(10, 2, 4, 4, 'outline'),
    rect(3, 3, 10, 10, 'base'),
    rect(1, 5, 3, 6, 'base'),
    rect(3, 12, 3, 2, 'light'),
    rect(4, 3, 6, 3, 'light'),
    rect(11, 3, 2, 2, 'light'),
    rect(11, 7, 2, 6, 'shade'),
    rect(6, 6, 2, 1, 'accent'),
    rect(7, 7, 1, 5, 'accent'),
    rect(10, 2, 1, 4, 'accent'),
    rect(10, 5, 4, 1, 'accent'),
  ]),
  'paper-flutter-1': frame('paper-flutter-1', [
    rect(3, 0, 10, 2, 'outline'),
    rect(1, 2, 2, 10, 'outline'),
    rect(0, 11, 4, 3, 'outline'),
    rect(4, 13, 8, 2, 'outline'),
    rect(11, 4, 3, 9, 'outline'),
    rect(10, 1, 4, 4, 'outline'),
    rect(3, 2, 9, 11, 'base'),
    rect(2, 4, 2, 7, 'base'),
    rect(1, 11, 3, 2, 'light'),
    rect(4, 2, 6, 3, 'light'),
    rect(10, 2, 2, 2, 'light'),
    rect(10, 6, 2, 7, 'shade'),
    rect(5, 6, 2, 1, 'accent'),
    rect(6, 7, 1, 5, 'accent'),
    rect(10, 1, 1, 4, 'accent'),
    rect(10, 4, 3, 1, 'accent'),
  ]),
  'paper-dash': frame('paper-dash', [
    rect(0, 3, 14, 2, 'outline'),
    rect(0, 5, 2, 7, 'outline'),
    rect(2, 12, 13, 2, 'outline'),
    rect(14, 6, 2, 6, 'outline'),
    rect(12, 4, 4, 4, 'outline'),
    rect(2, 5, 12, 7, 'base'),
    rect(3, 5, 8, 2, 'light'),
    rect(12, 5, 2, 2, 'light'),
    rect(3, 10, 11, 2, 'shade'),
    rect(12, 4, 1, 4, 'accent'),
    rect(12, 7, 3, 1, 'accent'),
    rect(6, 7, 2, 1, 'accent'),
    rect(7, 8, 1, 3, 'accent'),
  ]),
  'paper-hit': frame('paper-hit', [
    rect(2, 3, 11, 2, 'outline'),
    rect(1, 5, 3, 7, 'outline'),
    rect(3, 12, 9, 3, 'outline'),
    rect(11, 5, 3, 8, 'outline'),
    rect(4, 5, 7, 7, 'base'),
    rect(2, 7, 10, 3, 'shade'),
    rect(5, 5, 6, 2, 'light'),
    rect(6, 9, 4, 3, 'accent'),
  ]),
  'paper-death': frame('paper-death', [
    rect(1, 9, 5, 1, 'outline'),
    rect(2, 10, 3, 3, 'base'),
    rect(6, 7, 4, 1, 'outline'),
    rect(7, 8, 2, 4, 'shade'),
    rect(11, 10, 4, 1, 'outline'),
    rect(12, 11, 2, 3, 'base'),
  ]),
  'paper-shrine': frame('paper-shrine', [
    rect(2, 0, 11, 2, 'accent'),
    rect(1, 2, 2, 12, 'outline'),
    rect(3, 14, 10, 2, 'accent'),
    rect(12, 4, 2, 10, 'outline'),
    rect(3, 2, 9, 12, 'light'),
    rect(4, 5, 8, 8, 'base'),
    rect(10, 2, 3, 3, 'accent'),
    rect(6, 6, 2, 7, 'shade'),
  ]),
} as const;

function scissorsFrame(id: string, open: boolean, snap = false): PixelSpriteFrame {
  return frame(id, [
    rect(0, 1, 6, 1, 'outline'),
    rect(0, 2, 1, 5, 'outline'),
    rect(5, 2, 1, 5, 'outline'),
    rect(0, 7, 6, 1, 'outline'),
    rect(1, 2, 4, 1, 'accent'),
    rect(1, 6, 4, 1, 'accent'),
    rect(0, 8, 6, 1, 'outline'),
    rect(0, 9, 1, 5, 'outline'),
    rect(5, 9, 1, 5, 'outline'),
    rect(0, 14, 6, 1, 'outline'),
    rect(1, 9, 4, 1, 'accent'),
    rect(1, 13, 4, 1, 'accent'),
    rect(5, 7, 3, 3, 'outline'),
    rect(6, 8, 1, 1, 'light'),
    ...(open
      ? [
          rect(7, 5, 3, 3, 'outline'),
          rect(9, 4, 3, 3, 'outline'),
          rect(11, 3, 3, 3, 'outline'),
          rect(13, 2, 3, 3, 'outline'),
          rect(8, 6, 2, 1, 'light'),
          rect(10, 5, 2, 1, 'light'),
          rect(12, 4, 2, 1, 'light'),
          rect(14, 3, 2, 1, 'light'),
          rect(7, 9, 3, 3, 'outline'),
          rect(9, 10, 3, 3, 'outline'),
          rect(11, 11, 3, 3, 'outline'),
          rect(13, 12, 3, 3, 'outline'),
          rect(8, 10, 2, 1, 'shade'),
          rect(10, 11, 2, 1, 'shade'),
          rect(12, 12, 2, 1, 'shade'),
          rect(14, 13, 2, 1, 'shade'),
        ]
      : [
          rect(7, 5, 9, 3, 'outline'),
          rect(8, 6, 8, 1, 'light'),
          rect(7, 9, 9, 3, 'outline'),
          rect(8, 10, 8, 1, 'shade'),
        ]),
    ...(snap ? [rect(13, 6, 3, 4, 'accent')] : []),
  ]);
}

const SCISSORS_FRAMES = {
  'scissors-idle': scissorsFrame('scissors-idle', true),
  'scissors-snip-open': scissorsFrame('scissors-snip-open', true),
  'scissors-snip-closed': scissorsFrame('scissors-snip-closed', false),
  'scissors-dash': scissorsFrame('scissors-dash', true),
  'scissors-hit': scissorsFrame('scissors-hit', false, true),
  'scissors-death': frame('scissors-death', [
    rect(1, 10, 5, 1, 'outline'),
    rect(2, 11, 3, 3, 'accent'),
    rect(6, 9, 4, 1, 'outline'),
    rect(10, 7, 5, 1, 'light'),
    rect(10, 11, 5, 1, 'shade'),
  ]),
  'scissors-shrine': frame('scissors-shrine', [
    ...scissorsFrame('base', true).pixels,
    rect(0, 1, 16, 1, 'accent'),
    rect(0, 15, 16, 1, 'accent'),
  ]),
} as const;

const animation = (
  frames: readonly string[],
  frameDurationMs: number,
  loop = true,
): AnimationDefinition => ({ frames, frameDurationMs, loop });

export const UNIT_SPRITE_MANIFEST: UnitSpriteManifest = {
  contract: UNIT_FRAME_CONTRACT,
  factions: {
    rock: {
      silhouette: 'uneven-stone-cracks',
      renderScale: 1,
      fallbackFrame: 'rock-idle-0',
      palette: {
        outline: 0x171c1a,
        base: 0x717c79,
        light: 0xc4d1c7,
        shade: 0x3e4845,
        accent: 0x202825,
      },
      frames: ROCK_FRAMES,
      animations: {
        idle: animation(['rock-idle-0', 'rock-idle-1'], 420),
        move: animation(['rock-idle-0', 'rock-idle-1'], 180),
        dash: animation(['rock-dash', 'rock-idle-1'], 110),
        hit: animation(['rock-hit'], 150, false),
        death: animation(['rock-hit', 'rock-death'], 180, false),
        shrine: animation(['rock-shrine', 'rock-idle-1'], 160),
      },
    },
    paper: {
      silhouette: 'folded-fluttering-sheet',
      renderScale: 1.08,
      fallbackFrame: 'paper-idle-0',
      palette: {
        outline: 0x272922,
        base: 0xeee3c5,
        light: 0xfff9df,
        shade: 0xb3a688,
        accent: 0x866f4c,
      },
      frames: PAPER_FRAMES,
      animations: {
        idle: animation(['paper-idle-0', 'paper-idle-1'], 400),
        move: animation(['paper-flutter-0', 'paper-flutter-1'], 190),
        dash: animation(['paper-dash', 'paper-flutter-0'], 125),
        hit: animation(['paper-hit'], 150, false),
        death: animation(['paper-hit', 'paper-death'], 180, false),
        shrine: animation(['paper-shrine', 'paper-flutter-1'], 150),
      },
    },
    scissors: {
      silhouette: 'handled-scissors-blades',
      renderScale: 1.12,
      fallbackFrame: 'scissors-idle',
      palette: {
        outline: 0x171c1f,
        base: 0xa7b6bc,
        light: 0xf3ffff,
        shade: 0x526169,
        accent: 0xe1535c,
      },
      frames: SCISSORS_FRAMES,
      animations: {
        idle: animation(['scissors-idle'], 400),
        move: animation(['scissors-snip-open', 'scissors-snip-closed'], 175),
        dash: animation(['scissors-dash', 'scissors-snip-closed'], 110),
        hit: animation(['scissors-hit'], 130, false),
        death: animation(['scissors-hit', 'scissors-death'], 160, false),
        shrine: animation(['scissors-shrine', 'scissors-snip-open'], 140),
      },
    },
  },
};

export function resolveSpriteFrame(
  faction: Faction,
  state: UnitAnimationState,
  frameIndex: number,
  warn: (message: string) => void = import.meta.env.DEV ? console.warn : () => undefined,
): PixelSpriteFrame {
  const definition = UNIT_SPRITE_MANIFEST.factions[faction];
  const frameId = definition.animations[state].frames[frameIndex];
  const resolved = frameId ? definition.frames[frameId] : undefined;
  if (resolved) return resolved;
  warn(`Missing ${faction} ${state} frame ${frameIndex}; using ${definition.fallbackFrame}.`);
  return definition.frames[definition.fallbackFrame]!;
}

export function validateUnitSpriteManifest(manifest: UnitSpriteManifest): void {
  if (
    manifest.contract.width !== 16 ||
    manifest.contract.height !== 16 ||
    manifest.contract.filtering !== 'nearest'
  )
    throw new Error('Unit sprite contract must remain 16x16 with nearest filtering.');
  for (const faction of FACTIONS) {
    const definition = manifest.factions[faction];
    if (
      !Number.isFinite(definition.renderScale) ||
      definition.renderScale < 0.8 ||
      definition.renderScale > 1.25
    )
      throw new Error(`${faction} renderScale must stay between 0.8 and 1.25.`);
    if (!definition.frames[definition.fallbackFrame])
      throw new Error(`${faction} is missing its fallback frame.`);
    for (const state of ANIMATION_STATES) {
      const animationDefinition = definition.animations[state];
      if (!animationDefinition || animationDefinition.frames.length === 0)
        throw new Error(`${faction} is missing ${state} animation frames.`);
      for (const frameId of animationDefinition.frames)
        if (!definition.frames[frameId])
          throw new Error(`${faction} ${state} references missing frame ${frameId}.`);
    }
  }
}

validateUnitSpriteManifest(UNIT_SPRITE_MANIFEST);
