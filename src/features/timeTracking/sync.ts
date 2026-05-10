// Push closed listening sessions to Hibi. Mirrors features/mining/sync.ts:
// per-row, queued offline, retried on demand.

import {
  getListeningSession,
  type ListeningSession,
  listUnsyncedListeningSessions,
  markListeningSessionFailed,
  markListeningSessionSynced,
  markListeningSessionSyncing,
} from "../../db";
import { getHibiClient } from "../mining/hibiClient";

const KIND = "passive-listening";
const SOURCE = "hibi-koe";

export type SessionSyncProgress = {
  done: number;
  total: number;
  current: ListeningSession;
};

export async function syncSession(id: string): Promise<void> {
  const session = await getListeningSession(id);
  if (!session) return;
  await pushSession(session);
}

export async function syncAllPendingSessions(opts?: {
  onProgress?: (p: SessionSyncProgress) => void;
}): Promise<{ ok: number; failed: number; total: number }> {
  const pending = await listUnsyncedListeningSessions();
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < pending.length; i++) {
    const s = pending[i];
    opts?.onProgress?.({ done: i, total: pending.length, current: s });
    try {
      await pushSession(s);
      ok += 1;
    } catch (err) {
      failed += 1;
      console.warn("[time-tracking] session sync failed", s.id, err);
    }
  }
  return { ok, failed, total: pending.length };
}

async function pushSession(session: ListeningSession): Promise<void> {
  await markListeningSessionSyncing(session.id);
  try {
    const client = await getHibiClient();
    if (!client) {
      // No key: leave row pending so next sync attempt picks it up.
      await markListeningSessionFailed(session.id, "Hibi API key not configured.");
      return;
    }
    await client.sessions.create({
      kind: KIND,
      source: SOURCE,
      startedAt: new Date(session.startedAt).toISOString(),
      endedAt: new Date(session.endedAt).toISOString(),
      durationMs: session.durationMs,
      metadata: session.trackId ? { trackId: session.trackId } : undefined,
    });
    await markListeningSessionSynced(session.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markListeningSessionFailed(session.id, message);
    throw err;
  }
}
