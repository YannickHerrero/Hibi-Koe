import * as Crypto from "expo-crypto";
import { getDb } from "./client";

export type SessionSyncState = "pending" | "syncing" | "synced" | "failed";

export type ListeningSession = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  trackId: string | null;
  syncState: SessionSyncState | null;
  syncError: string | null;
  createdAt: number;
};

type Row = {
  id: string;
  started_at: number;
  ended_at: number;
  duration_ms: number;
  track_id: string | null;
  sync_state: SessionSyncState | null;
  sync_error: string | null;
  created_at: number;
};

function fromRow(row: Row): ListeningSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    trackId: row.track_id,
    syncState: row.sync_state,
    syncError: row.sync_error,
    createdAt: row.created_at,
  };
}

export type NewListeningSession = {
  startedAt: number;
  endedAt: number;
  durationMs: number;
  trackId?: string | null;
};

export async function insertListeningSession(
  input: NewListeningSession,
): Promise<ListeningSession> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const createdAt = Date.now();
  await db.runAsync(
    `INSERT INTO listening_sessions
     (id, started_at, ended_at, duration_ms, track_id, sync_state, sync_error, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?);`,
    id,
    input.startedAt,
    input.endedAt,
    input.durationMs,
    input.trackId ?? null,
    createdAt,
  );
  return {
    id,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationMs: input.durationMs,
    trackId: input.trackId ?? null,
    syncState: "pending",
    syncError: null,
    createdAt,
  };
}

export async function listUnsyncedListeningSessions(): Promise<ListeningSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM listening_sessions
     WHERE sync_state IS NULL OR sync_state IN ('pending', 'failed')
     ORDER BY started_at ASC;`,
  );
  return rows.map(fromRow);
}

export async function getListeningSession(id: string): Promise<ListeningSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    "SELECT * FROM listening_sessions WHERE id = ?;",
    id,
  );
  return row ? fromRow(row) : null;
}

export async function markListeningSessionSyncing(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE listening_sessions SET sync_state = 'syncing', sync_error = NULL WHERE id = ?;",
    id,
  );
}

export async function markListeningSessionSynced(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE listening_sessions SET sync_state = 'synced', sync_error = NULL WHERE id = ?;",
    id,
  );
}

export async function markListeningSessionFailed(id: string, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE listening_sessions SET sync_state = 'failed', sync_error = ? WHERE id = ?;",
    error,
    id,
  );
}

// Sum of durations whose started_at falls in [fromMs, toMs). Used by
// the Settings card to show "today" and "past 7 days".
export async function totalListeningMsBetween(fromMs: number, toMs: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(duration_ms), 0) AS total
     FROM listening_sessions
     WHERE started_at >= ? AND started_at < ?;`,
    fromMs,
    toMs,
  );
  return row?.total ?? 0;
}

export async function countUnsyncedListeningSessions(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM listening_sessions
     WHERE sync_state IS NULL OR sync_state IN ('pending', 'failed');`,
  );
  return row?.n ?? 0;
}
