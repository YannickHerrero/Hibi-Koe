import type { SQLiteBindValue } from "expo-sqlite";
import { getDb } from "./client";

export type AnalysisState = "pending" | "analyzing" | "completed" | "failed";

export type Track = {
  id: string;
  title: string;
  artist: string | null;
  source: string | null;
  durationMs: number;
  audioPath: string;
  subtitlePath: string | null;
  artworkPath: string | null;
  offsetMs: number;
  createdAt: number;
  analysisState: AnalysisState | null;
  analysisPath: string | null;
  analysisError: string | null;
};

type Row = {
  id: string;
  title: string;
  artist: string | null;
  source: string | null;
  duration_ms: number;
  audio_path: string;
  subtitle_path: string | null;
  artwork_path: string | null;
  offset_ms: number;
  created_at: number;
  analysis_state: string | null;
  analysis_path: string | null;
  analysis_error: string | null;
};

export type TrackRow = Row;
export function trackFromRow(row: Row): Track {
  return fromRow(row);
}
function fromRow(row: Row): Track {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    source: row.source,
    durationMs: row.duration_ms,
    audioPath: row.audio_path,
    subtitlePath: row.subtitle_path,
    artworkPath: row.artwork_path,
    offsetMs: row.offset_ms,
    createdAt: row.created_at,
    analysisState: row.analysis_state as AnalysisState | null,
    analysisPath: row.analysis_path,
    analysisError: row.analysis_error,
  };
}

export type NewTrack = Omit<
  Track,
  "createdAt" | "offsetMs" | "analysisState" | "analysisPath" | "analysisError"
> & {
  offsetMs?: number;
};

export async function listTracks(): Promise<Track[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM tracks ORDER BY created_at DESC;");
  return rows.map(fromRow);
}

export async function getTrack(id: string): Promise<Track | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>("SELECT * FROM tracks WHERE id = ?;", id);
  return row ? fromRow(row) : null;
}

export async function insertTrack(track: NewTrack): Promise<Track> {
  const db = await getDb();
  const createdAt = Date.now();
  const offsetMs = track.offsetMs ?? 0;
  await db.runAsync(
    `INSERT INTO tracks
     (id, title, artist, source, duration_ms, audio_path, subtitle_path, artwork_path, offset_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    track.id,
    track.title,
    track.artist,
    track.source,
    track.durationMs,
    track.audioPath,
    track.subtitlePath,
    track.artworkPath,
    offsetMs,
    createdAt,
  );
  return {
    ...track,
    offsetMs,
    createdAt,
    analysisState: null,
    analysisPath: null,
    analysisError: null,
  };
}

export async function updateTrack(
  id: string,
  patch: Partial<
    Pick<
      Track,
      | "title"
      | "artist"
      | "source"
      | "offsetMs"
      | "analysisState"
      | "analysisPath"
      | "analysisError"
    >
  >,
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: SQLiteBindValue[] = [];

  if (patch.title !== undefined) {
    fields.push("title = ?");
    values.push(patch.title);
  }
  if (patch.artist !== undefined) {
    fields.push("artist = ?");
    values.push(patch.artist);
  }
  if (patch.source !== undefined) {
    fields.push("source = ?");
    values.push(patch.source);
  }
  if (patch.offsetMs !== undefined) {
    fields.push("offset_ms = ?");
    values.push(patch.offsetMs);
  }
  if (patch.analysisState !== undefined) {
    fields.push("analysis_state = ?");
    values.push(patch.analysisState);
  }
  if (patch.analysisPath !== undefined) {
    fields.push("analysis_path = ?");
    values.push(patch.analysisPath);
  }
  if (patch.analysisError !== undefined) {
    fields.push("analysis_error = ?");
    values.push(patch.analysisError);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.runAsync(`UPDATE tracks SET ${fields.join(", ")} WHERE id = ?;`, ...values);
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM tracks WHERE id = ?;", id);
}
