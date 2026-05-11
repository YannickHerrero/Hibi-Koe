// Reactive global cache of the user's word statuses, mirroring the
// server's /v1/known-words view. Mirrors the useFurigana / useMatchUnderline
// pattern: module-level state, useSyncExternalStore, listener set.
//
// Three responsibilities:
//   - hydrateWordStatuses() loads the local cache at boot,
//   - useWordStatuses() returns a stable lookup function for renderers,
//   - setManualWordStatus() / refreshKnownWords() write through to the
//     server and update the local mirror.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  deleteKnownWord,
  type KnownWord,
  listKnownWords,
  replaceAllKnownWords,
  upsertManualKnownWord,
  type WordStatus,
} from "../../db";
import { getHibiClient } from "./hibiClient";

type LookupKey = string;

function key(lemma: string, reading: string): LookupKey {
  return `${lemma}${reading}`;
}

let cache = new Map<LookupKey, KnownWord>();
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Map<LookupKey, KnownWord> {
  return cache;
}

function replaceCache(rows: KnownWord[]) {
  const next = new Map<LookupKey, KnownWord>();
  for (const r of rows) next.set(key(r.lemma, r.reading), r);
  cache = next;
  notify();
}

export async function hydrateWordStatuses(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const rows = await listKnownWords();
    replaceCache(rows);
  } catch (err) {
    console.warn("[mining] hydrateWordStatuses failed", err);
  }
}

// Pull the merged view from Hibi and replace the local cache. Safe to
// call repeatedly; bails silently if the API key isn't configured.
let refreshing: Promise<void> | null = null;
export function refreshKnownWords(): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const client = await getHibiClient();
      if (!client) return;
      const all: KnownWord[] = [];
      let cursor: string | undefined;
      // The server caps page size at 200; loop until we drain it.
      // Realistic ceiling is a few thousand rows per user, so this is
      // a single round-trip in practice.
      do {
        const page = await client.knownWords.list({ limit: 200, cursor });
        for (const item of page.items) {
          all.push({
            lemma: item.lemma,
            reading: item.reading,
            status: item.status,
            source: item.source,
            cardId: item.cardId,
            intervalDays: item.intervalDays,
            updatedAt: Date.parse(item.updatedAt),
          });
        }
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      await replaceAllKnownWords(all);
      replaceCache(all);
    } catch (err) {
      console.warn("[mining] refreshKnownWords failed", err);
    } finally {
      refreshing = null;
      lastRefreshAt = Date.now();
    }
  })();
  return refreshing;
}

// Listen to AppState transitions and refresh on foreground, but no more
// than once per REFRESH_DEBOUNCE_MS. Idempotent: can be called multiple
// times; only attaches a listener the first time.
const REFRESH_DEBOUNCE_MS = 5 * 60 * 1000;
let lastRefreshAt = 0;
let appStateAttached = false;

function maybeRefreshOnForeground(state: AppStateStatus) {
  if (state !== "active") return;
  const now = Date.now();
  if (now - lastRefreshAt < REFRESH_DEBOUNCE_MS) return;
  lastRefreshAt = now;
  refreshKnownWords().catch(() => {});
}

export function attachKnownWordsAppStateRefresh(): void {
  if (appStateAttached) return;
  appStateAttached = true;
  AppState.addEventListener("change", maybeRefreshOnForeground);
}

// Manual write path. Optimistic: update the local cache + DB first,
// then PUT to the server. On error we leave the optimistic state in
// place — the next refresh will reconcile with the server's truth.
export async function setManualWordStatus(
  lemma: string,
  reading: string,
  status: WordStatus | null,
): Promise<void> {
  const k = key(lemma, reading);
  if (status === null) {
    cache.delete(k);
    cache = new Map(cache);
    notify();
    await deleteKnownWord(lemma, reading).catch((err) =>
      console.warn("[mining] local delete failed", err),
    );
  } else {
    const optimistic: KnownWord = {
      lemma,
      reading,
      status,
      source: "manual",
      cardId: null,
      intervalDays: null,
      updatedAt: Date.now(),
    };
    cache = new Map(cache).set(k, optimistic);
    notify();
    await upsertManualKnownWord({ lemma, reading, status }).catch((err) =>
      console.warn("[mining] local upsert failed", err),
    );
  }

  try {
    const client = await getHibiClient();
    if (!client) return; // local-only when no Hibi key
    await client.wordStatus.set({ lemma, reading, status });
  } catch (err) {
    console.warn("[mining] setManualWordStatus server PUT failed", err);
  }
}

export type WordStatusLookup = (lemma: string, reading: string) => KnownWord | null;

// Hook returns a memoised lookup; consumers re-render only when the
// underlying map identity changes (i.e. after refresh / manual write).
export function useWordStatuses(): { lookup: WordStatusLookup } {
  const map = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    hydrateWordStatuses().catch((err) => console.warn("[mining] hydrate failed", err));
  }, []);

  const lookup = useCallback<WordStatusLookup>(
    (lemma, reading) => map.get(key(lemma, reading)) ?? null,
    [map],
  );
  return { lookup };
}
