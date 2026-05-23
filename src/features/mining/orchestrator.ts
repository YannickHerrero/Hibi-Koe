// One-shot analysis orchestrator. Runs the full pipeline for a track:
//   parse SRT → load dictionaries → tokenize each cue → build dict
//   matches → translate via OpenRouter → persist the blob → flip
//   tracks.analysis_state from analyzing → completed (or failed).
//
// Mirrors Pureyaa's two-phase split (tokenize is fast + offline,
// translate hits the network) so callers can subscribe to phased
// progress and so re-analysing without an API key still gets you
// the offline portions.

import { File } from "expo-file-system";
import { updateTrack } from "../../db";
import { parseSrt } from "../subtitles/srt";
import { writeAnalysis } from "./analysisStore";
import { loadDictionaries } from "./dict";
import { hasHibiApiKey } from "./hibiApiKey";
import { translateCues } from "./llm";
import { buildMatches } from "./match";
import { getTokenizer, tokenize } from "./tokenize";
import type { AnalysisData, AnalyzedCue } from "./types";

export type AnalysisProgress =
  | { phase: "starting" }
  | { phase: "loading-dictionaries" }
  | { phase: "warming-tokenizer" }
  | { phase: "tokenizing"; processed: number; total: number }
  | { phase: "translating"; translated: number; total: number; latestText: string }
  | { phase: "saving" }
  | { phase: "done" };

export type AnalyzeOptions = {
  trackId: string;
  subtitlePath: string;
  onProgress?: (p: AnalysisProgress) => void;
  onLog?: (msg: string) => void;
  signal?: AbortSignal;
  // When true, we'll skip the LLM step (no API key required); the
  // resulting blob will have null translations / grammarNotes. Used
  // by 'tokens-only' fallback in the import wizard.
  skipTranslate?: boolean;
};

export async function analyzeTrack(opts: AnalyzeOptions): Promise<AnalysisData> {
  const { trackId, subtitlePath, onProgress, onLog, signal, skipTranslate } = opts;
  const tag = `[analyze ${trackId.slice(0, 8)}]`;
  const log = (s: string) => {
    console.log(tag, s);
    onLog?.(s);
  };

  await updateTrack(trackId, { analysisState: "analyzing", analysisError: null });
  onProgress?.({ phase: "starting" });
  console.log(tag, "begin", { subtitlePath });

  try {
    log(`reading SRT via textSync from ${subtitlePath}`);
    // textSync bypasses the RN Blob bridge that the async .text() goes
    // through; the bridge intermittently rejects with "The specified
    // blob is invalid" on Android when the blob is GC'd before resolve.
    const t0 = Date.now();
    const srtText = new File(subtitlePath).textSync();
    log(`SRT read in ${Date.now() - t0}ms (${srtText.length} chars)`);
    const rawCues = parseSrt(srtText);
    if (rawCues.length === 0) {
      throw new Error("No cues found in subtitle file.");
    }
    log(`parsed ${rawCues.length} cues`);

    onProgress?.({ phase: "loading-dictionaries" });
    log("loading JMdict + JMnedict bundles");
    await loadDictionaries();
    log("dictionaries ready");

    onProgress?.({ phase: "warming-tokenizer" });
    log("warming up kuromoji tokenizer");
    const t1 = Date.now();
    await getTokenizer((m) => log(`kuromoji: ${m}`));
    log(`tokenizer warm in ${Date.now() - t1}ms`);

    log(`tokenizing ${rawCues.length} cues`);
    const cues: AnalyzedCue[] = [];
    for (let i = 0; i < rawCues.length; i++) {
      if (signal?.aborted) throw new Error("Cancelled");
      const rc = rawCues[i];
      const tokens = await tokenize(rc.text);
      const matches = await buildMatches(tokens);
      cues.push({
        index: rc.index,
        startMs: rc.startMs,
        endMs: rc.endMs,
        text: rc.text,
        tokens,
        matchesByTokenIndex: matches,
        translation: null,
        grammarNote: null,
      });
      onProgress?.({ phase: "tokenizing", processed: i + 1, total: rawCues.length });
    }
    log("tokenization complete");

    if (!skipTranslate) {
      if (!(await hasHibiApiKey())) {
        throw new Error("Hibi API key not configured.");
      }

      log(`translating ${cues.length} cues via Hibi proxy`);
      const byIndex = new Map<number, AnalyzedCue>(cues.map((c) => [c.index, c]));
      let translatedCount = 0;
      await translateCues({
        cues: cues.map((c) => ({ index: c.index, text: c.text })),
        signal,
        onLog: log,
        onItem: (item) => {
          const target = byIndex.get(item.index);
          if (!target) return;
          target.translation = item.translation;
          target.grammarNote = item.grammarNote;
          translatedCount += 1;
          onProgress?.({
            phase: "translating",
            translated: translatedCount,
            total: cues.length,
            latestText: item.translation,
          });
        },
      });
      log(`translation complete (${translatedCount}/${cues.length} cues)`);
    }

    onProgress?.({ phase: "saving" });
    const data: AnalysisData = { trackId, version: 1, cues };
    const path = writeAnalysis(data);
    await updateTrack(trackId, {
      analysisState: "completed",
      analysisPath: path,
      analysisError: null,
    });
    onProgress?.({ phase: "done" });
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(tag, "failed:", message, err);
    await updateTrack(trackId, {
      analysisState: "failed",
      analysisError: message,
    });
    throw err;
  }
}
