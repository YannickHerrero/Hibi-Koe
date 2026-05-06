import type { Cue } from "./srt";

export type CueIndex = {
  cues: ReadonlyArray<Cue>;
  // Pre-sorted starts/ends for fast lookup.
  starts: ReadonlyArray<number>;
};

export function buildCueIndex(cues: ReadonlyArray<Cue>): CueIndex {
  const sorted = [...cues].sort((a, b) => a.startMs - b.startMs);
  return {
    cues: sorted,
    starts: sorted.map((c) => c.startMs),
  };
}

// Returns the index of the active cue at timeMs (the latest cue whose
// start <= timeMs and end > timeMs), or -1 if no cue is active.
//
// timeMs may include the user's offset already; this function does not
// interpret offsets.
export function findActiveCue(index: CueIndex, timeMs: number): number {
  const { cues, starts } = index;
  if (cues.length === 0) return -1;

  // Binary search for the largest start <= timeMs.
  let lo = 0;
  let hi = starts.length - 1;
  let candidate = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (starts[mid] <= timeMs) {
      candidate = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (candidate < 0) return -1;
  if (cues[candidate].endMs > timeMs) return candidate;
  return -1;
}

// Returns the index of the next cue strictly after timeMs (used to scroll
// the subtitle pane during gaps), or -1 if there is no upcoming cue.
export function findNextCue(index: CueIndex, timeMs: number): number {
  const { starts } = index;
  if (starts.length === 0) return -1;
  let lo = 0;
  let hi = starts.length - 1;
  let candidate = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (starts[mid] > timeMs) {
      candidate = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return candidate;
}
