import {
  DEFAULT_PLAYER_SETTINGS,
  PLAYER_PREFERENCES_KEY,
  loadPlayerPreferences,
  saveMatchSelection,
  savePlayerSettings,
  setTutorialCompleted,
} from './playerPreferences';

describe('player preferences', () => {
  beforeEach(() => localStorage.clear());

  it('falls back safely for missing, corrupt, and outdated data', () => {
    expect(loadPlayerPreferences(localStorage)).toEqual({
      settings: DEFAULT_PLAYER_SETTINGS,
      tutorialCompleted: false,
    });

    localStorage.setItem(PLAYER_PREFERENCES_KEY, '{nope');
    expect(loadPlayerPreferences(localStorage).tutorialCompleted).toBe(false);

    localStorage.setItem(
      PLAYER_PREFERENCES_KEY,
      JSON.stringify({ version: 0, tutorialCompleted: true }),
    );
    expect(loadPlayerPreferences(localStorage).tutorialCompleted).toBe(false);
  });

  it('persists a complete match selection independently from settings', () => {
    const selection = {
      mapId: 'forest' as const,
      startingFaction: 'paper' as const,
      difficulty: 'chaos' as const,
      mode: 'blitz' as const,
    };
    saveMatchSelection(localStorage, selection);
    savePlayerSettings(localStorage, {
      ...DEFAULT_PLAYER_SETTINGS,
      minimapOpacity: 0.45,
      reducedMotion: true,
    });

    expect(loadPlayerPreferences(localStorage)).toMatchObject({
      selection,
      settings: { minimapOpacity: 0.45, reducedMotion: true },
      tutorialCompleted: false,
    });
  });

  it('marks tutorial completion without losing the saved setup', () => {
    saveMatchSelection(localStorage, {
      mapId: 'marsh',
      startingFaction: 'scissors',
      difficulty: 'casual',
      mode: 'last-faction-standing',
    });
    setTutorialCompleted(localStorage, true);

    expect(loadPlayerPreferences(localStorage)).toMatchObject({
      tutorialCompleted: true,
      selection: { mapId: 'marsh', startingFaction: 'scissors' },
    });
  });
});
