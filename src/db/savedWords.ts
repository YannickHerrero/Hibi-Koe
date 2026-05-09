import { getDb } from "./client";

export type SyncState = "pending" | "syncing" | "synced" | "failed";

export type SavedWord = {
  id: string;
  trackId: string;
  cueIndex: number;
  surface: string;
  reading: string | null;
  lemma: string | null;
  pos: string | null;
  glosses: string[];
  sentenceJp: string;
  sentenceEn: string | null;
  grammarNote: string | null;
  audioStartMs: number;
  audioEndMs: number;
  audioClipPath: string | null;
  artworkPath: string | null;
  createdAt: number;
  exportedAt: number | null;
  syncState: SyncState | null;
  syncError: string | null;
};

type Row = {
  id: string;
  track_id: string;
  cue_index: number;
  surface: string;
  reading: string | null;
  lemma: string | null;
  pos: string | null;
  glosses_json: string;
  sentence_jp: string;
  sentence_en: string | null;
  grammar_note: string | null;
  audio_start_ms: number;
  audio_end_ms: number;
  audio_clip_path: string | null;
  artwork_path: string | null;
  created_at: number;
  exported_at: number | null;
  sync_state: SyncState | null;
  sync_error: string | null;
};

function fromRow(row: Row): SavedWord {
  let glosses: string[] = [];
  try {
    const parsed = JSON.parse(row.glosses_json);
    if (Array.isArray(parsed)) glosses = parsed.filter((g): g is string => typeof g === "string");
  } catch {
    // best-effort; corrupt JSON yields an empty list rather than a crash
  }
  return {
    id: row.id,
    trackId: row.track_id,
    cueIndex: row.cue_index,
    surface: row.surface,
    reading: row.reading,
    lemma: row.lemma,
    pos: row.pos,
    glosses,
    sentenceJp: row.sentence_jp,
    sentenceEn: row.sentence_en,
    grammarNote: row.grammar_note,
    audioStartMs: row.audio_start_ms,
    audioEndMs: row.audio_end_ms,
    audioClipPath: row.audio_clip_path,
    artworkPath: row.artwork_path,
    createdAt: row.created_at,
    exportedAt: row.exported_at,
    syncState: row.sync_state,
    syncError: row.sync_error,
  };
}

export type NewSavedWord = Omit<
  SavedWord,
  "createdAt" | "exportedAt" | "syncState" | "syncError"
>;

export async function listSavedWords(): Promise<SavedWord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM saved_words ORDER BY created_at DESC;");
  return rows.map(fromRow);
}

export async function getSavedWord(id: string): Promise<SavedWord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>("SELECT * FROM saved_words WHERE id = ?;", id);
  return row ? fromRow(row) : null;
}

export async function countSavedWords(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM saved_words;");
  return row?.n ?? 0;
}

export async function insertSavedWord(word: NewSavedWord): Promise<SavedWord> {
  const db = await getDb();
  const createdAt = Date.now();
  await db.runAsync(
    `INSERT INTO saved_words
     (id, track_id, cue_index, surface, reading, lemma, pos, glosses_json,
      sentence_jp, sentence_en, grammar_note,
      audio_start_ms, audio_end_ms, audio_clip_path, artwork_path,
      created_at, exported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
    word.id,
    word.trackId,
    word.cueIndex,
    word.surface,
    word.reading,
    word.lemma,
    word.pos,
    JSON.stringify(word.glosses),
    word.sentenceJp,
    word.sentenceEn,
    word.grammarNote,
    word.audioStartMs,
    word.audioEndMs,
    word.audioClipPath,
    word.artworkPath,
    createdAt,
  );
  return { ...word, createdAt, exportedAt: null, syncState: null, syncError: null };
}

export async function listUnsyncedSavedWords(): Promise<SavedWord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM saved_words
     WHERE sync_state IS NULL OR sync_state IN ('pending', 'failed')
     ORDER BY created_at ASC;`,
  );
  return rows.map(fromRow);
}

export async function markSavedWordSyncing(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE saved_words SET sync_state = 'syncing', sync_error = NULL WHERE id = ?;`,
    id,
  );
}

export async function markSavedWordSynced(id: string, exportedAt: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE saved_words
     SET sync_state = 'synced', sync_error = NULL, exported_at = ?
     WHERE id = ?;`,
    exportedAt,
    id,
  );
}

export async function markSavedWordFailed(id: string, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE saved_words SET sync_state = 'failed', sync_error = ? WHERE id = ?;`,
    error,
    id,
  );
}

export async function deleteSavedWord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM saved_words WHERE id = ?;", id);
}

export async function deleteSavedWordsForTrack(trackId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM saved_words WHERE track_id = ?;", trackId);
}
