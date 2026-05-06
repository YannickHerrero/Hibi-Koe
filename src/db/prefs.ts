import { getDb } from "./client";

// Keys are namespaced with a dot to keep the table grep-able.
export type PrefKey = "theme" | "lastPlayedTrackId";

export async function getPref(key: PrefKey): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM prefs WHERE key = ?;",
    key,
  );
  return row?.value ?? null;
}

export async function setPref(key: PrefKey, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;",
    key,
    value,
  );
}

export async function deletePref(key: PrefKey): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM prefs WHERE key = ?;", key);
}
