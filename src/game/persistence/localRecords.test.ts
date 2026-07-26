import {
  createRecordKey,
  loadLocalRecords,
  saveLocalRecord,
  type StorageLike,
} from './localRecords';

class MemoryStorage implements StorageLike {
  private value: string | null = null;

  getItem(): string | null {
    return this.value;
  }

  setItem(_key: string, value: string): void {
    this.value = value;
  }
}

const meadowRock = {
  mapId: 'meadow' as const,
  startingFaction: 'rock' as const,
  difficulty: 'normal' as const,
  mode: 'last-faction-standing' as const,
};

describe('versioned local records', () => {
  it('isolates records by map, starting faction, difficulty, and mode', () => {
    const storage = new MemoryStorage();
    saveLocalRecord(storage, meadowRock, {
      score: 1_000,
      completionTimeMs: 90_000,
      achievedAt: '2026-07-26T10:00:00.000Z',
      finalSurvivingUnitCount: 4,
    });
    const other = { ...meadowRock, mode: 'blitz' as const };
    saveLocalRecord(storage, other, {
      score: 2_000,
      completionTimeMs: 70_000,
      achievedAt: '2026-07-26T10:01:00.000Z',
      finalSurvivingUnitCount: 5,
    });

    const records = loadLocalRecords(storage);
    expect(records[createRecordKey(meadowRock)]?.bestScore).toBe(1_000);
    expect(records[createRecordKey(other)]?.bestScore).toBe(2_000);
  });

  it('keeps independent best score and completion time and ignores wholly worse results', () => {
    const storage = new MemoryStorage();
    saveLocalRecord(storage, meadowRock, {
      score: 1_000,
      completionTimeMs: 90_000,
      achievedAt: '2026-07-26T10:00:00.000Z',
      finalSurvivingUnitCount: 4,
    });
    saveLocalRecord(storage, meadowRock, {
      score: 1_200,
      completionTimeMs: 100_000,
      achievedAt: '2026-07-26T10:01:00.000Z',
      finalSurvivingUnitCount: 6,
    });
    saveLocalRecord(storage, meadowRock, {
      score: 900,
      completionTimeMs: 80_000,
      achievedAt: '2026-07-26T10:02:00.000Z',
      finalSurvivingUnitCount: 3,
    });
    saveLocalRecord(storage, meadowRock, {
      score: 800,
      completionTimeMs: 110_000,
      achievedAt: '2026-07-26T10:03:00.000Z',
      finalSurvivingUnitCount: 2,
    });

    expect(loadLocalRecords(storage)[createRecordKey(meadowRock)]).toEqual({
      bestScore: 1_200,
      bestCompletionTimeMs: 80_000,
      dateAchieved: '2026-07-26T10:01:00.000Z',
      finalSurvivingUnitCount: 6,
    });
  });

  it('falls back safely for corrupted and outdated data', () => {
    const corrupted = new MemoryStorage();
    corrupted.setItem('ignored', '{nope');
    expect(loadLocalRecords(corrupted)).toEqual({});

    const outdated = new MemoryStorage();
    outdated.setItem('ignored', JSON.stringify({ version: 0, records: { bad: {} } }));
    expect(loadLocalRecords(outdated)).toEqual({});

    const invalid = new MemoryStorage();
    invalid.setItem(
      'ignored',
      JSON.stringify({
        version: 1,
        records: {
          invalid: {
            bestScore: -1,
            bestCompletionTimeMs: 90_000,
            dateAchieved: 'not-a-date',
            finalSurvivingUnitCount: 2.5,
          },
        },
      }),
    );
    expect(loadLocalRecords(invalid)).toEqual({});
  });
});
