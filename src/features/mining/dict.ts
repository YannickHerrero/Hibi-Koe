// SQLite-backed JMdict / JMnedict access. Replaces the previous
// JSON-file bundle which OOM'd Android on file.text() for the
// ~250 MB JMnedict payload.
//
// All accessors are async; lookups go through dict_index, payloads
// come from dict_entries on demand.

import { Directory, File, Paths } from "expo-file-system";
import { dictHasRows, getDictEntryPayloads, lookupEntryIds, lookupEntryIdsBatch } from "../../db";
import type { DictBundle, DictEntry, DictName, SerializedDictBundle } from "./types";

// Legacy file locations — only kept so the installer can clean up the
// old JSON bundles on a re-install.
export const DICT_DIR = new Directory(Paths.document, "dict");
export const JMDICT_FILE = new File(DICT_DIR, "jmdict.dict");
export const JMNEDICT_FILE = new File(DICT_DIR, "jmnedict.dict");

// No-op now — left in place so callers compile while we migrate.
// SQLite is always available once migrations have run.
export async function loadDictionaries(): Promise<void> {
  return;
}

export function unloadDictionaries(): void {
  return;
}

export async function dictsAvailable(): Promise<boolean> {
  const [a, b] = await Promise.all([dictHasRows("jmdict"), dictHasRows("jmnedict")]);
  return a && b;
}

// Quick boolean for sync paths (e.g. import wizard's pre-flight). The
// async dictsAvailable() is the source of truth; this is a cached
// snapshot that becomes accurate after a one-shot warmup call.
let cachedAvailable = false;
export function dictsAvailableSync(): boolean {
  return cachedAvailable;
}
export async function refreshDictsAvailableCache(): Promise<boolean> {
  cachedAvailable = await dictsAvailable();
  return cachedAvailable;
}

// Returns true once the runtime has confirmed the dict tables are
// populated. Mirrors the old isLoaded() boolean for callers that just
// want a guard.
export async function isLoaded(): Promise<boolean> {
  return dictsAvailable();
}

export async function lookup(form: string, dict: DictName): Promise<number[]> {
  return lookupEntryIds(form, dict);
}

export async function lookupBatch(
  forms: ReadonlyArray<string>,
  dict: DictName,
): Promise<Map<string, number[]>> {
  return lookupEntryIdsBatch(forms, dict);
}

export async function getEntries(ids: ReadonlyArray<number>, dict: DictName): Promise<DictEntry[]> {
  if (ids.length === 0) return [];
  const payloads = await getDictEntryPayloads(dict, ids);
  const out: DictEntry[] = [];
  for (const id of ids) {
    const payload = payloads.get(id);
    if (!payload) continue;
    try {
      out.push(JSON.parse(payload) as DictEntry);
    } catch (err) {
      console.warn("[mining] failed to parse dict entry", dict, id, err);
    }
  }
  return out;
}

// Kept for parity with the older API; serialising bundles is no longer
// part of the install path but the helper is fine to keep around.
export function serializeBundle(bundle: DictBundle): SerializedDictBundle {
  return {
    index: Array.from(bundle.index.entries()),
    entries: Array.from(bundle.entries.entries()),
  };
}
