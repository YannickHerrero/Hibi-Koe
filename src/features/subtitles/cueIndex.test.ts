import { describe, expect, it } from "vitest";
import { buildCueIndex, findActiveCue, findNextCue } from "./cueIndex";
import type { Cue } from "./srt";

const cues: Cue[] = [
  { index: 1, startMs: 0, endMs: 1000, text: "a" },
  { index: 2, startMs: 1500, endMs: 2500, text: "b" },
  { index: 3, startMs: 3000, endMs: 4000, text: "c" },
];

describe("findActiveCue", () => {
  const idx = buildCueIndex(cues);

  it("returns -1 before any cue starts", () => {
    expect(findActiveCue(idx, -10)).toBe(-1);
  });

  it("returns the matching cue when inside its range", () => {
    expect(findActiveCue(idx, 500)).toBe(0);
    expect(findActiveCue(idx, 2000)).toBe(1);
    expect(findActiveCue(idx, 3500)).toBe(2);
  });

  it("returns -1 in gaps between cues", () => {
    expect(findActiveCue(idx, 1200)).toBe(-1);
    expect(findActiveCue(idx, 2700)).toBe(-1);
  });

  it("treats end as exclusive", () => {
    expect(findActiveCue(idx, 1000)).toBe(-1);
  });

  it("returns -1 after the last cue ends", () => {
    expect(findActiveCue(idx, 5000)).toBe(-1);
  });

  it("returns -1 for an empty index", () => {
    expect(findActiveCue(buildCueIndex([]), 1000)).toBe(-1);
  });
});

describe("findNextCue", () => {
  const idx = buildCueIndex(cues);

  it("returns the first cue when time precedes everything", () => {
    expect(findNextCue(idx, -1)).toBe(0);
  });

  it("returns the next cue when in a gap", () => {
    expect(findNextCue(idx, 1100)).toBe(1);
    expect(findNextCue(idx, 2600)).toBe(2);
  });

  it("returns the next cue when inside the active one", () => {
    expect(findNextCue(idx, 500)).toBe(1);
  });

  it("returns -1 after the last cue", () => {
    expect(findNextCue(idx, 4500)).toBe(-1);
  });
});
