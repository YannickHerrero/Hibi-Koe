import { File } from "expo-file-system";
import { buildCueIndex, type CueIndex } from "./cueIndex";
import { parseSrt } from "./srt";

// Reads an SRT file from disk and returns a CueIndex ready for lookups.
// textSync sidesteps RN's Blob bridge — the async .text() path can
// reject with "The specified blob is invalid" when the blob handle is
// GC'd before native resolve completes (observed on Android).
export async function loadSubtitleIndex(path: string): Promise<CueIndex> {
  const file = new File(path);
  const text = file.textSync();
  const cues = parseSrt(text);
  return buildCueIndex(cues);
}
