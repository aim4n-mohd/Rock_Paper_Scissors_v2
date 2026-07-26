import { FACTIONS } from '../config/factions';
import { DIFFICULTY_IDS, GAME_MODE_IDS } from '../config/gameConfig';
import { MAP_IDS } from '../maps/maps';
import type { RecordSelection, StorageLike } from './localRecords';

export const PLAYER_PREFERENCES_KEY = 'rps2:player-preferences';
const SCHEMA_VERSION = 1;

export interface PlayerSettings {
  masterVolume: number;
  musicVolume: number;
  soundEffectsVolume: number;
  screenShake: boolean;
  particleIntensity: number;
  fullscreen: boolean;
  minimapOpacity: number;
  reducedMotion: boolean;
  reducedFlashes: boolean;
}

export interface PlayerPreferences {
  selection?: RecordSelection;
  settings: PlayerSettings;
  tutorialCompleted: boolean;
}

interface StoredPreferences extends PlayerPreferences {
  version: number;
}

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  masterVolume: 0.8,
  musicVolume: 0.65,
  soundEffectsVolume: 0.8,
  screenShake: true,
  particleIntensity: 1,
  fullscreen: false,
  minimapOpacity: 1,
  reducedMotion: false,
  reducedFlashes: false,
};

function clamp(value: unknown, fallback: number, maximum = 1): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(maximum, value))
    : fallback;
}

function validSelection(value: unknown): value is RecordSelection {
  if (!value || typeof value !== 'object') return false;
  const selection = value as Partial<RecordSelection>;
  return (
    MAP_IDS.includes(selection.mapId as (typeof MAP_IDS)[number]) &&
    FACTIONS.includes(selection.startingFaction as (typeof FACTIONS)[number]) &&
    DIFFICULTY_IDS.includes(selection.difficulty as (typeof DIFFICULTY_IDS)[number]) &&
    GAME_MODE_IDS.includes(selection.mode as (typeof GAME_MODE_IDS)[number])
  );
}

function resolveSettings(value: unknown): PlayerSettings {
  const settings = value && typeof value === 'object' ? (value as Partial<PlayerSettings>) : {};
  return {
    masterVolume: clamp(settings.masterVolume, DEFAULT_PLAYER_SETTINGS.masterVolume),
    musicVolume: clamp(settings.musicVolume, DEFAULT_PLAYER_SETTINGS.musicVolume),
    soundEffectsVolume: clamp(
      settings.soundEffectsVolume,
      DEFAULT_PLAYER_SETTINGS.soundEffectsVolume,
    ),
    screenShake:
      typeof settings.screenShake === 'boolean'
        ? settings.screenShake
        : DEFAULT_PLAYER_SETTINGS.screenShake,
    particleIntensity: clamp(
      settings.particleIntensity,
      DEFAULT_PLAYER_SETTINGS.particleIntensity,
      2,
    ),
    fullscreen:
      typeof settings.fullscreen === 'boolean'
        ? settings.fullscreen
        : DEFAULT_PLAYER_SETTINGS.fullscreen,
    minimapOpacity: clamp(settings.minimapOpacity, DEFAULT_PLAYER_SETTINGS.minimapOpacity),
    reducedMotion:
      typeof settings.reducedMotion === 'boolean'
        ? settings.reducedMotion
        : DEFAULT_PLAYER_SETTINGS.reducedMotion,
    reducedFlashes:
      typeof settings.reducedFlashes === 'boolean'
        ? settings.reducedFlashes
        : DEFAULT_PLAYER_SETTINGS.reducedFlashes,
  };
}

export function loadPlayerPreferences(storage: StorageLike): PlayerPreferences {
  try {
    const raw = storage.getItem(PLAYER_PREFERENCES_KEY);
    if (!raw) return { settings: { ...DEFAULT_PLAYER_SETTINGS }, tutorialCompleted: false };
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    if (parsed.version !== SCHEMA_VERSION)
      return { settings: { ...DEFAULT_PLAYER_SETTINGS }, tutorialCompleted: false };
    return {
      ...(validSelection(parsed.selection) ? { selection: parsed.selection } : {}),
      settings: resolveSettings(parsed.settings),
      tutorialCompleted: parsed.tutorialCompleted === true,
    };
  } catch {
    return { settings: { ...DEFAULT_PLAYER_SETTINGS }, tutorialCompleted: false };
  }
}

function save(storage: StorageLike, preferences: PlayerPreferences): void {
  try {
    storage.setItem(
      PLAYER_PREFERENCES_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, ...preferences }),
    );
  } catch {
    // Preferences remain applied for this session when storage is unavailable.
  }
}

export function saveMatchSelection(storage: StorageLike, selection: RecordSelection): void {
  save(storage, { ...loadPlayerPreferences(storage), selection });
}

export function savePlayerSettings(storage: StorageLike, settings: PlayerSettings): void {
  save(storage, { ...loadPlayerPreferences(storage), settings: resolveSettings(settings) });
}

export function setTutorialCompleted(storage: StorageLike, tutorialCompleted: boolean): void {
  save(storage, { ...loadPlayerPreferences(storage), tutorialCompleted });
}
