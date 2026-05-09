// Ported from Pureyaa src/analysis/dict.ts. Hibi Koe stores the bundles
// under Paths.document/dict/ alongside any other persistent app data.
//
// Bundles are kept in JS Maps (not plain objects) because Hermes caps a
// single object at 196,607 properties — JMnedict alone has ~750k.

import { Directory, File, Paths } from "expo-file-system";
import type { DictBundle, DictEntry, DictName, SerializedDictBundle } from "./types";

export const DICT_DIR = new Directory(Paths.document, "dict");
export const JMDICT_FILE = new File(DICT_DIR, "jmdict.dict");
export const JMNEDICT_FILE = new File(DICT_DIR, "jmnedict.dict");

let jmdict: DictBundle | null = null;
let jmnedict: DictBundle | null = null;

const EMPTY: DictBundle = { index: new Map(), entries: new Map() };

async function loadFromFile(file: File): Promise<DictBundle> {
  try {
    if (!file.exists) return EMPTY;
    const text = await file.text();
    const parsed = JSON.parse(text) as SerializedDictBundle;
    return {
      index: new Map(parsed.index),
      entries: new Map(parsed.entries),
    };
  } catch (err) {
    console.warn("[mining] failed to read dictionary file", file.uri, err);
    return EMPTY;
  }
}

export async function loadDictionaries(): Promise<void> {
  if (!jmdict) jmdict = await loadFromFile(JMDICT_FILE);
  if (!jmnedict) jmnedict = await loadFromFile(JMNEDICT_FILE);
}

export function unloadDictionaries(): void {
  jmdict = null;
  jmnedict = null;
}

export function dictsAvailable(): boolean {
  return JMDICT_FILE.exists && JMNEDICT_FILE.exists;
}

export function isLoaded(): boolean {
  return jmdict !== null && jmnedict !== null;
}

export function lookup(form: string, dict: DictName): number[] {
  const bundle = dict === "jmdict" ? jmdict : jmnedict;
  if (!bundle) return [];
  return bundle.index.get(form) ?? [];
}

export function getEntries(ids: number[], dict: DictName): DictEntry[] {
  const bundle = dict === "jmdict" ? jmdict : jmnedict;
  if (!bundle) return [];
  const out: DictEntry[] = [];
  for (const id of ids) {
    const e = bundle.entries.get(id);
    if (e) out.push(e);
  }
  return out;
}

export function serializeBundle(bundle: DictBundle): SerializedDictBundle {
  return {
    index: Array.from(bundle.index.entries()),
    entries: Array.from(bundle.entries.entries()),
  };
}
