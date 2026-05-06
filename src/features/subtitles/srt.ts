// SubRip (SRT) parser.
//
// Format spec we support:
//   <index>
//   HH:MM:SS,mmm --> HH:MM:SS,mmm
//   <one or more lines of text>
//   <blank line>
//
// Lenient on:
//   - BOM at file start
//   - CRLF / LF line endings
//   - dot decimal separator (00:00:01.000)
//   - missing trailing blank line
//   - blocks with missing index (we still accept them)
//
// Strict on:
//   - timecode shape; any block without parseable times is skipped.

export type Cue = {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
};

const TIMECODE_RE =
  /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;

function toMs(h: string, m: string, s: string, ms: string): number {
  return Number(h) * 3_600_000 + Number(m) * 60_000 + Number(s) * 1000 + Number(ms);
}

export function parseSrt(input: string): Cue[] {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const blocks = text.split(/\n{2,}/);
  const cues: Cue[] = [];
  let fallbackIndex = 0;

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    const lines = block.split("\n");
    let cursor = 0;

    let parsedIndex: number | null = null;
    if (lines[cursor] && /^\d+$/.test(lines[cursor].trim())) {
      parsedIndex = Number(lines[cursor].trim());
      cursor += 1;
    }

    const timeLine = lines[cursor];
    if (!timeLine) continue;
    const m = TIMECODE_RE.exec(timeLine);
    if (!m) continue;
    cursor += 1;

    const startMs = toMs(m[1], m[2], m[3], m[4].padEnd(3, "0"));
    const endMs = toMs(m[5], m[6], m[7], m[8].padEnd(3, "0"));

    const body = lines.slice(cursor).join("\n").trim();
    if (!body) continue;

    fallbackIndex += 1;
    cues.push({
      index: parsedIndex ?? fallbackIndex,
      startMs,
      endMs,
      text: body,
    });
  }

  cues.sort((a, b) => a.startMs - b.startMs);
  return cues;
}
