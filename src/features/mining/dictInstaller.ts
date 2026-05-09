// Downloads the latest jmdict-simplified release, extracts each .tgz,
// converts the raw JSON into our DictBundle shape, and persists the
// rows into SQLite (dict_entries + dict_index). Stages emit progress
// so the Settings UI can render a sequence of bars / spinners.
//
// Why SQLite instead of JSON files: JMnedict's serialised bundle is
// ~250 MB. file.text() on Android allocates the whole thing in one
// shot, which OOMs on devices with a tight heap. Per-row writes also
// let us index dict_index.form so lookups stay O(log n).
//
// Heavy synchronous steps (gunzip on ~10 MB, JSON.parse on ~100 MB)
// each yield to the event loop before they run so React can paint
// the new stage label — without that the UI freezes for 10–20 s and
// the install looks hung.

import pako from "pako";
import { clearDict, type DictName, insertDictEntriesBatch, insertDictIndexBatch } from "../../db";
import { convertJmdict, convertJmnedict } from "./convert";
import { DICT_DIR, JMDICT_FILE, JMNEDICT_FILE } from "./dict";
import { extractFirstFile } from "./tar";
import type { DictBundle } from "./types";

export type InstallStage =
  | "fetching-release"
  | "downloading-jmdict"
  | "decompressing-jmdict"
  | "parsing-jmdict"
  | "processing-jmdict"
  | "saving-jmdict"
  | "downloading-jmnedict"
  | "decompressing-jmnedict"
  | "parsing-jmnedict"
  | "processing-jmnedict"
  | "saving-jmnedict"
  | "done";

export type InstallProgress = {
  stage: InstallStage;
  current?: number;
  total?: number;
  unit?: "bytes" | "items";
};

const RELEASE_API = "https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest";

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

type Release = {
  tag_name: string;
  assets: ReleaseAsset[];
};

async function fetchRelease(): Promise<Release> {
  const r = await fetch(RELEASE_API, {
    headers: { accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} fetching latest release`);
  return r.json() as Promise<Release>;
}

function findAsset(release: Release, predicate: (name: string) => boolean): ReleaseAsset {
  const a = release.assets.find((x) => predicate(x.name));
  if (!a) throw new Error(`no matching asset in release ${release.tag_name}`);
  return a;
}

// XHR is used (instead of fetch) because RN's fetch buffers the whole
// body before resolving — there's no way to observe per-chunk progress.
function downloadTgzWithProgress(
  asset: ReleaseAsset,
  onProgress: (received: number, total: number) => void,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = "arraybuffer";
    xhr.open("GET", asset.browser_download_url);
    xhr.onprogress = (e) => {
      const total = e.lengthComputable ? e.total : asset.size;
      onProgress(e.loaded, total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Uint8Array(xhr.response as ArrayBuffer));
      } else {
        reject(new Error(`HTTP ${xhr.status} downloading ${asset.name}`));
      }
    };
    xhr.onerror = () => reject(new Error(`Network error downloading ${asset.name}`));
    xhr.send();
  });
}

function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// SQLite has a default parameter limit of 999. Each entry insert binds
// 3 params (dict_name, id, payload) so 300 rows = 900 params, safely
// under. Each index insert also binds 3 params.
const ROWS_PER_BATCH = 300;

async function persistBundle(
  dict: DictName,
  bundle: DictBundle,
  onItem: (current: number, total: number) => void,
): Promise<void> {
  await clearDict(dict);

  const entries = Array.from(bundle.entries.entries());
  const totalEntries = entries.length;
  for (let i = 0; i < entries.length; i += ROWS_PER_BATCH) {
    const slice = entries.slice(i, i + ROWS_PER_BATCH);
    await insertDictEntriesBatch(
      dict,
      slice.map(([id, entry]) => ({ id, payload: JSON.stringify(entry) })),
    );
    onItem(Math.min(i + slice.length, totalEntries), totalEntries);
    if (i % (ROWS_PER_BATCH * 4) === 0) await nextTick();
  }

  // Flatten the index. Each form points to one or more entry ids.
  const indexRows: Array<{ form: string; entryId: number }> = [];
  for (const [form, ids] of bundle.index) {
    for (const id of ids) indexRows.push({ form, entryId: id });
  }
  for (let i = 0; i < indexRows.length; i += ROWS_PER_BATCH) {
    await insertDictIndexBatch(dict, indexRows.slice(i, i + ROWS_PER_BATCH));
    if (i % (ROWS_PER_BATCH * 4) === 0) await nextTick();
  }
}

function deleteLegacyFiles(): void {
  // The previous installer wrote ~50 MB + ~250 MB JSON bundles into
  // Paths.document/dict/. They're no longer read; reclaim the disk on
  // the first SQLite-aware install.
  for (const f of [JMDICT_FILE, JMNEDICT_FILE]) {
    if (f.exists) {
      try {
        f.delete();
      } catch (err) {
        console.warn("[mining] failed to delete legacy dict file", f.uri, err);
      }
    }
  }
  if (DICT_DIR.exists) {
    // Keep the directory; harmless if empty.
  }
}

export async function installDictionaries(
  onProgress?: (p: InstallProgress) => void,
): Promise<void> {
  deleteLegacyFiles();

  onProgress?.({ stage: "fetching-release" });
  const release = await fetchRelease();

  // ── JMdict ─────────────────────────────────────────────────────────
  const jmdictAsset = findAsset(
    release,
    (n) => n.startsWith("jmdict-eng-") && !n.includes("-common-") && n.endsWith(".json.tgz"),
  );
  const jmdictTgz = await downloadTgzWithProgress(jmdictAsset, (received, total) => {
    onProgress?.({ stage: "downloading-jmdict", current: received, total, unit: "bytes" });
  });

  onProgress?.({ stage: "decompressing-jmdict" });
  await nextTick();
  const jmdictTar = pako.ungzip(jmdictTgz);
  const { data: jmdictJsonBytes } = extractFirstFile(jmdictTar);

  onProgress?.({ stage: "parsing-jmdict" });
  await nextTick();
  const jmdictJsonText = new TextDecoder().decode(jmdictJsonBytes);
  const jmdictRaw = JSON.parse(jmdictJsonText) as { words?: unknown[] };

  const jmdictBundle = await convertJmdict(
    // biome-ignore lint/suspicious/noExplicitAny: trusted release payload
    (jmdictRaw.words ?? []) as any[],
    (current, total) => {
      onProgress?.({ stage: "processing-jmdict", current, total, unit: "items" });
    },
  );

  onProgress?.({ stage: "saving-jmdict" });
  await nextTick();
  await persistBundle("jmdict", jmdictBundle, (current, total) => {
    onProgress?.({ stage: "saving-jmdict", current, total, unit: "items" });
  });

  // ── JMnedict ───────────────────────────────────────────────────────
  const jmnedictAsset = findAsset(
    release,
    (n) => n.startsWith("jmnedict-all-") && n.endsWith(".json.tgz"),
  );
  const jmnedictTgz = await downloadTgzWithProgress(jmnedictAsset, (received, total) => {
    onProgress?.({ stage: "downloading-jmnedict", current: received, total, unit: "bytes" });
  });

  onProgress?.({ stage: "decompressing-jmnedict" });
  await nextTick();
  const jmnedictTar = pako.ungzip(jmnedictTgz);
  const { data: jmnedictJsonBytes } = extractFirstFile(jmnedictTar);

  onProgress?.({ stage: "parsing-jmnedict" });
  await nextTick();
  const jmnedictJsonText = new TextDecoder().decode(jmnedictJsonBytes);
  const jmnedictRaw = JSON.parse(jmnedictJsonText) as { words?: unknown[] };

  const jmnedictBundle = await convertJmnedict(
    // biome-ignore lint/suspicious/noExplicitAny: trusted release payload
    (jmnedictRaw.words ?? []) as any[],
    (current, total) => {
      onProgress?.({ stage: "processing-jmnedict", current, total, unit: "items" });
    },
  );

  onProgress?.({ stage: "saving-jmnedict" });
  await nextTick();
  await persistBundle("jmnedict", jmnedictBundle, (current, total) => {
    onProgress?.({ stage: "saving-jmnedict", current, total, unit: "items" });
  });

  onProgress?.({ stage: "done" });
}
