// SQLite-backed JMdict / JMnedict store.
//
// Why SQLite instead of a JSON file: JMnedict's serialised bundle is
// ~250 MB. file.text() on Android allocates the whole thing in one
// chunk, which OOMs on devices with a tight heap. Splitting into rows
// also lets us index dict_index.form so lookups stay O(log n) without
// holding the bundle in memory.

import type { SQLiteBindValue } from "expo-sqlite";
import { getDb } from "./client";

export type DictName = "jmdict" | "jmnedict";

// Insert a batch of entry rows. Caller is responsible for the
// transaction (we batch hundreds of thousands of rows during the
// installer; one tx per call would melt the disk).
export async function insertDictEntriesBatch(
  dict: DictName,
  rows: Array<{ id: number; payload: string }>,
): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  const placeholders = rows.map(() => "(?, ?, ?)").join(",");
  const values: SQLiteBindValue[] = [];
  for (const r of rows) values.push(dict, r.id, r.payload);
  await db.runAsync(
    `INSERT OR REPLACE INTO dict_entries (dict_name, entry_id, payload_json) VALUES ${placeholders};`,
    ...values,
  );
}

// Insert a batch of (form, entry_id) index rows.
export async function insertDictIndexBatch(
  dict: DictName,
  rows: Array<{ form: string; entryId: number }>,
): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  const placeholders = rows.map(() => "(?, ?, ?)").join(",");
  const values: SQLiteBindValue[] = [];
  for (const r of rows) values.push(r.form, dict, r.entryId);
  await db.runAsync(
    `INSERT INTO dict_index (form, dict_name, entry_id) VALUES ${placeholders};`,
    ...values,
  );
}

// Wipe a dictionary clean before a re-install.
export async function clearDict(dict: DictName): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM dict_index WHERE dict_name = ?;", dict);
  await db.runAsync("DELETE FROM dict_entries WHERE dict_name = ?;", dict);
}

// Are the dict tables populated for the named dictionary?
export async function dictHasRows(dict: DictName): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM dict_entries WHERE dict_name = ? LIMIT 1;",
    dict,
  );
  return (row?.n ?? 0) > 0;
}

// Look up entry ids matching a single form. Hot-path query during
// analysis; uses idx_dict_index_form, sub-millisecond on a typical
// phone.
export async function lookupEntryIds(form: string, dict: DictName): Promise<number[]> {
  if (!form) return [];
  const db = await getDb();
  const rows = await db.getAllAsync<{ entry_id: number }>(
    "SELECT entry_id FROM dict_index WHERE form = ? AND dict_name = ?;",
    form,
    dict,
  );
  return rows.map((r) => r.entry_id);
}

// Batch variant: look up many forms at once during analysis. Returns a
// Map keyed by the input form so callers can dedupe / order their
// results in JS without N round-trips.
export async function lookupEntryIdsBatch(
  forms: ReadonlyArray<string>,
  dict: DictName,
): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  if (forms.length === 0) return out;
  const db = await getDb();
  // SQLite's parameter limit defaults to 999; chunk to stay well under.
  const CHUNK = 800;
  for (let start = 0; start < forms.length; start += CHUNK) {
    const slice = forms.slice(start, start + CHUNK);
    const placeholders = slice.map(() => "?").join(",");
    const rows = await db.getAllAsync<{ form: string; entry_id: number }>(
      `SELECT form, entry_id FROM dict_index
       WHERE dict_name = ? AND form IN (${placeholders});`,
      dict,
      ...(slice as string[]),
    );
    for (const r of rows) {
      const list = out.get(r.form);
      if (list) list.push(r.entry_id);
      else out.set(r.form, [r.entry_id]);
    }
  }
  return out;
}

// Fetch full payloads for a list of ids.
export async function getDictEntryPayloads(
  dict: DictName,
  ids: ReadonlyArray<number>,
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (ids.length === 0) return out;
  const db = await getDb();
  const CHUNK = 800;
  for (let start = 0; start < ids.length; start += CHUNK) {
    const slice = ids.slice(start, start + CHUNK);
    const placeholders = slice.map(() => "?").join(",");
    const rows = await db.getAllAsync<{ entry_id: number; payload_json: string }>(
      `SELECT entry_id, payload_json FROM dict_entries
       WHERE dict_name = ? AND entry_id IN (${placeholders});`,
      dict,
      ...(slice as number[]),
    );
    for (const r of rows) out.set(r.entry_id, r.payload_json);
  }
  return out;
}
