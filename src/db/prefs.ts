import { getDb } from "./client";

// Keys are namespaced with a dot to keep the table grep-able.
export type PrefKey =
  | "theme"
  | "lastPlayedTrackId"
  | "subtitleOffsetPresets"
  | "loopMode"
  | "randomMode"
  | "furiganaOn"
  | "matchUnderlineOn";

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

export const OFFSET_PRESET_SLOTS = 5;

export type OffsetPresets = ReadonlyArray<number | null>;

const emptyPresets: OffsetPresets = Array.from({ length: OFFSET_PRESET_SLOTS }, () => null);

export async function getOffsetPresets(): Promise<OffsetPresets> {
  const raw = await getPref("subtitleOffsetPresets");
  if (!raw) return emptyPresets;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return emptyPresets;
    const normalised = Array.from({ length: OFFSET_PRESET_SLOTS }, (_, i) =>
      typeof parsed[i] === "number" ? (parsed[i] as number) : null,
    );
    return normalised;
  } catch {
    return emptyPresets;
  }
}

export async function setOffsetPresets(presets: OffsetPresets): Promise<void> {
  await setPref("subtitleOffsetPresets", JSON.stringify(presets));
}
