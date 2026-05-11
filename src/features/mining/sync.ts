// Sync a saved word to Hibi:
//   1. extract a clip of the source track to a temp .m4a
//   2. upload that clip to Hibi → audioKey
//   3. POST /v1/cards with the saved word's text + furigana + kanji
//   4. mark the row synced; delete the temp clip
//
// Per-row failures are caught and surface as sync_state = 'failed' with
// the message in sync_error so the Vocabulary tab can offer a retry.

import { extractAudio } from "audio-extract";
import { Directory, File, Paths } from "expo-file-system";
import {
  getSavedWord,
  getTrack,
  markSavedWordFailed,
  markSavedWordSynced,
  markSavedWordSyncing,
  type SavedWord,
} from "../../db";
import { listUnsyncedSavedWords } from "../../db";
import { segmentFurigana } from "./furigana";
import { getHibiClient, HIBI_BASE_URL } from "./hibiClient";
import { extractKanjiList } from "./kanjiList";
import { refreshKnownWords } from "./wordStatuses";

const CLIP_DIR = new Directory(Paths.cache, "hibi-sync");

function ensureClipDir(): Directory {
  if (!CLIP_DIR.exists) CLIP_DIR.create({ intermediates: true });
  return CLIP_DIR;
}

export type SyncProgress = {
  done: number;
  total: number;
  current: SavedWord;
};

export async function syncSavedWord(id: string): Promise<void> {
  const word = await getSavedWord(id);
  if (!word) throw new Error(`saved word ${id} not found`);
  await syncWord(word);
}

export async function syncAllPending(opts?: {
  onProgress?: (p: SyncProgress) => void;
}): Promise<{ ok: number; failed: number; total: number }> {
  const pending = await listUnsyncedSavedWords();
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < pending.length; i++) {
    const w = pending[i];
    opts?.onProgress?.({ done: i, total: pending.length, current: w });
    try {
      await syncWord(w);
      ok += 1;
    } catch (err) {
      failed += 1;
      console.warn("[hibi-sync] row failed", w.id, err);
    }
  }
  // Newly synced cards immediately produce SRS-derived statuses; refresh
  // so the underline reflects them without waiting for AppState.
  if (ok > 0) {
    refreshKnownWords().catch(() => {});
  }
  return { ok, failed, total: pending.length };
}

async function syncWord(word: SavedWord): Promise<void> {
  const tag = `[hibi-sync ${word.id.slice(0, 8)}]`;
  const startedAt = Date.now();
  console.log(tag, "begin", { surface: word.surface, trackId: word.trackId });
  await markSavedWordSyncing(word.id);
  let clipPath: string | null = null;
  try {
    const baseUrl = HIBI_BASE_URL;
    console.log(tag, "base url", baseUrl);
    const client = await getHibiClient();
    if (!client) throw new Error("Hibi API key not configured.");

    const track = await getTrack(word.trackId);
    if (!track) throw new Error("source track was deleted; cannot extract audio");

    ensureClipDir();
    const requested = `${CLIP_DIR.uri}clip-${word.id}.m4a`;
    console.log(tag, "extracting audio", {
      startMs: word.audioStartMs,
      endMs: word.audioEndMs,
      durationMs: word.audioEndMs - word.audioStartMs,
      from: track.audioPath,
    });
    const t0 = Date.now();
    clipPath = await extractAudio(track.audioPath, {
      startMs: word.audioStartMs,
      endMs: word.audioEndMs,
      outPath: requested,
    });
    console.log(tag, "extracted in", `${Date.now() - t0}ms`, "→", clipPath);

    const clipFile = new File(clipPath);
    if (!clipFile.exists) throw new Error("audio extraction returned a missing file");

    const filename = clipPath.split("/").pop() ?? "clip.m4a";
    const mime = filename.endsWith(".ogg")
      ? "audio/ogg"
      : filename.endsWith(".aac")
        ? "audio/aac"
        : "audio/mp4";
    console.log(tag, "uploading", { url: `${baseUrl}/v1/uploads/audio`, mime });
    const t1 = Date.now();
    let audioKey: string;
    try {
      const res = await client.uploads.audio({
        uri: clipPath,
        name: filename,
        type: mime,
      });
      audioKey = res.key;
      console.log(tag, "uploaded in", `${Date.now() - t1}ms`, "→", audioKey);
    } catch (err) {
      throw decorateNetworkError(err, "uploads/audio", baseUrl);
    }

    const focusReading = word.reading ?? word.surface;
    console.log(tag, "creating card", { url: `${baseUrl}/v1/cards`, focusWord: word.surface });
    const t2 = Date.now();
    try {
      await client.cards.create({
        sentence: word.sentenceJp,
        focusWord: word.surface,
        focusWordReading: focusReading,
        furigana: segmentFurigana(word.surface, word.reading),
        english: word.sentenceEn ?? "",
        glosses: word.glosses,
        grammarNote: word.grammarNote,
        kanjiList: extractKanjiList(word.surface),
        imageKey: null,
        audioKey,
        source: "hibi-koe",
        tags: ["mined"],
      });
    } catch (err) {
      throw decorateNetworkError(err, "cards", baseUrl);
    }
    console.log(tag, "card created in", `${Date.now() - t2}ms`);

    await markSavedWordSynced(word.id, Date.now());
    console.log(tag, "done in", `${Date.now() - startedAt}ms`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(tag, "failed:", message, err);
    await markSavedWordFailed(word.id, message);
    throw err;
  } finally {
    if (clipPath) {
      try {
        const f = new File(clipPath);
        if (f.exists) f.delete();
      } catch (cleanupErr) {
        console.warn(tag, "clip cleanup failed", clipPath, cleanupErr);
      }
    }
  }
}

// RN's fetch surfaces "Network request failed" with no URL or status,
// which is useless for diagnosis. Re-throw with the endpoint we tried.
function decorateNetworkError(err: unknown, endpoint: string, baseUrl: string): Error {
  if (err instanceof TypeError && /Network request failed/i.test(err.message)) {
    return new Error(
      `Network request failed: cannot reach ${baseUrl}/v1/${endpoint}. ` +
        `Check that the Hibi API URL in Settings is correct and reachable from this device.`,
    );
  }
  if (err instanceof Error) return err;
  return new Error(String(err));
}
