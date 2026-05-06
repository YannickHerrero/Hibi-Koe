import { File } from "expo-file-system";
import { buildCueIndex, type CueIndex } from "./cueIndex";
import { parseSrt } from "./srt";

// Reads an SRT file from disk and returns a CueIndex ready for lookups.
export async function loadSubtitleIndex(path: string): Promise<CueIndex> {
  const file = new File(path);
  const text = await file.text();
  const cues = parseSrt(text);
  return buildCueIndex(cues);
}
