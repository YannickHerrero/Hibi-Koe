// Per-track analysis blob: tokens + dict matches + translations live
// at Paths.document/analysis/<trackId>.json. Big enough that we don't
// want it in SQLite (JMdict matches alone are dozens of KB per cue).

import { Directory, File, Paths } from "expo-file-system";
import type { AnalysisData } from "./types";

const ANALYSIS_DIR = new Directory(Paths.document, "analysis");

function ensureDir(): Directory {
  if (!ANALYSIS_DIR.exists) {
    ANALYSIS_DIR.create({ intermediates: true });
  }
  return ANALYSIS_DIR;
}

export function analysisFileFor(trackId: string): File {
  ensureDir();
  return new File(ANALYSIS_DIR, `${trackId}.json`);
}

export function analysisExistsFor(trackId: string): boolean {
  return new File(ANALYSIS_DIR, `${trackId}.json`).exists;
}

export async function readAnalysis(trackId: string): Promise<AnalysisData | null> {
  const file = analysisFileFor(trackId);
  if (!file.exists) return null;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as AnalysisData;
    if (parsed?.version !== 1 || parsed.trackId !== trackId) return null;
    return parsed;
  } catch (err) {
    console.warn("[mining] readAnalysis failed", trackId, err);
    return null;
  }
}

export function writeAnalysis(data: AnalysisData): string {
  const file = analysisFileFor(data.trackId);
  file.write(JSON.stringify(data));
  return file.uri;
}

export function deleteAnalysis(trackId: string): void {
  const file = analysisFileFor(trackId);
  if (file.exists) {
    try {
      file.delete();
    } catch (err) {
      console.warn("[mining] deleteAnalysis failed", trackId, err);
    }
  }
}
