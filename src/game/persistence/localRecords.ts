import { GAME_CONFIG, type MatchOptions } from '../config/gameConfig';
import type { MapId } from '../maps/maps';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RecordSelection extends MatchOptions {
  mapId: MapId;
}

export interface MatchRecord {
  bestScore: number;
  bestCompletionTimeMs: number;
  dateAchieved: string;
  finalSurvivingUnitCount: number;
}

export interface RecordCandidate {
  score: number;
  completionTimeMs: number;
  achievedAt: string;
  finalSurvivingUnitCount: number;
}

export type LocalRecords = Record<string, MatchRecord>;

interface StoredRecordSchema {
  version: number;
  records: LocalRecords;
}

export function createRecordKey(selection: RecordSelection): string {
  return [selection.mapId, selection.startingFaction, selection.difficulty, selection.mode].join(
    '|',
  );
}

function validRecord(value: unknown): value is MatchRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<MatchRecord>;
  return (
    Number.isFinite(record.bestScore) &&
    record.bestScore! >= 0 &&
    Number.isFinite(record.bestCompletionTimeMs) &&
    record.bestCompletionTimeMs! >= 0 &&
    typeof record.dateAchieved === 'string' &&
    Number.isFinite(Date.parse(record.dateAchieved)) &&
    Number.isInteger(record.finalSurvivingUnitCount) &&
    record.finalSurvivingUnitCount! >= 0
  );
}

export function loadLocalRecords(storage: StorageLike): LocalRecords {
  try {
    const raw = storage.getItem(GAME_CONFIG.records.storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<StoredRecordSchema>;
    if (
      parsed.version !== GAME_CONFIG.records.schemaVersion ||
      !parsed.records ||
      typeof parsed.records !== 'object'
    )
      return {};
    return Object.fromEntries(
      Object.entries(parsed.records).filter((entry): entry is [string, MatchRecord] =>
        validRecord(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

export function saveLocalRecord(
  storage: StorageLike,
  selection: RecordSelection,
  candidate: RecordCandidate,
): MatchRecord {
  const records = loadLocalRecords(storage);
  const key = createRecordKey(selection);
  const previous = records[key];
  const scoreImproved = !previous || candidate.score > previous.bestScore;
  const timeImproved = !previous || candidate.completionTimeMs < previous.bestCompletionTimeMs;
  const next: MatchRecord = {
    bestScore: scoreImproved ? candidate.score : previous.bestScore,
    bestCompletionTimeMs: timeImproved ? candidate.completionTimeMs : previous.bestCompletionTimeMs,
    dateAchieved: scoreImproved ? candidate.achievedAt : previous.dateAchieved,
    finalSurvivingUnitCount: scoreImproved
      ? candidate.finalSurvivingUnitCount
      : previous.finalSurvivingUnitCount,
  };
  records[key] = next;
  try {
    storage.setItem(
      GAME_CONFIG.records.storageKey,
      JSON.stringify({ version: GAME_CONFIG.records.schemaVersion, records }),
    );
  } catch {
    // Storage may be disabled or full; the match result remains valid in memory.
  }
  return next;
}
