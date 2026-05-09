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
import { getHibiClient } from "./hibiClient";
import { extractKanjiList } from "./kanjiList";

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
  return { ok, failed, total: pending.length };
}

async function syncWord(word: SavedWord): Promise<void> {
  await markSavedWordSyncing(word.id);
  let clipPath: string | null = null;
  try {
    const client = await getHibiClient();
    if (!client) throw new Error("Hibi API key not configured.");

    const track = await getTrack(word.trackId);
    if (!track) throw new Error("source track was deleted; cannot extract audio");

    ensureClipDir();
    const requested = `${CLIP_DIR.uri}clip-${word.id}.m4a`;
    clipPath = await extractAudio(track.audioPath, {
      startMs: word.audioStartMs,
      endMs: word.audioEndMs,
      outPath: requested,
    });

    const clipFile = new File(clipPath);
    if (!clipFile.exists) throw new Error("audio extraction returned a missing file");

    const filename = clipPath.split("/").pop() ?? "clip.m4a";
    const mime = filename.endsWith(".ogg")
      ? "audio/ogg"
      : filename.endsWith(".aac")
        ? "audio/aac"
        : "audio/mp4";
    const { key: audioKey } = await client.uploads.audio({
      uri: clipPath,
      name: filename,
      type: mime,
    });

    const focusReading = word.reading ?? word.surface;
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

    await markSavedWordSynced(word.id, Date.now());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markSavedWordFailed(word.id, message);
    throw err;
  } finally {
    if (clipPath) {
      try {
        const f = new File(clipPath);
        if (f.exists) f.delete();
      } catch (cleanupErr) {
        console.warn("[hibi-sync] clip cleanup failed", clipPath, cleanupErr);
      }
    }
  }
}
