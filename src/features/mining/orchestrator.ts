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
import { getApiKey } from "./apiKey";
import { loadDictionaries } from "./dict";
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
  const log = (s: string) => onLog?.(s);

  await updateTrack(trackId, { analysisState: "analyzing", analysisError: null });
  onProgress?.({ phase: "starting" });

  try {
    log("reading + parsing SRT");
    const srtText = await new File(subtitlePath).text();
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
    await getTokenizer((m) => log(`kuromoji: ${m}`));

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
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error("OpenRouter API key not configured.");

      log(`translating ${cues.length} cues via OpenRouter`);
      const byIndex = new Map<number, AnalyzedCue>(cues.map((c) => [c.index, c]));
      let translatedCount = 0;
      await translateCues({
        apiKey,
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
    console.error("[mining] analyzeTrack failed", trackId, err);
    await updateTrack(trackId, {
      analysisState: "failed",
      analysisError: message,
    });
    throw err;
  }
}
