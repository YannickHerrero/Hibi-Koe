import { describe, expect, it } from "vitest";
import { parseSrt } from "./srt";

const sample = `1
00:00:01,000 --> 00:00:04,500
Hello, world.

2
00:00:05,000 --> 00:00:07,000
Second line
with two lines.

3
00:00:08,500 --> 00:00:09,000
Final.
`;

describe("parseSrt", () => {
  it("parses well-formed cues", () => {
    const cues = parseSrt(sample);
    expect(cues).toHaveLength(3);
    expect(cues[0]).toEqual({
      index: 1,
      startMs: 1000,
      endMs: 4500,
      text: "Hello, world.",
    });
    expect(cues[1].text).toBe("Second line\nwith two lines.");
    expect(cues[2].endMs).toBe(9000);
  });

  it("strips a UTF-8 BOM", () => {
    const cues = parseSrt(`﻿${sample}`);
    expect(cues).toHaveLength(3);
  });

  it("accepts CRLF line endings", () => {
    const crlf = sample.replace(/\n/g, "\r\n");
    const cues = parseSrt(crlf);
    expect(cues).toHaveLength(3);
    expect(cues[0].text).toBe("Hello, world.");
  });

  it("accepts dot decimal separator", () => {
    const dot = "1\n00:00:01.250 --> 00:00:02.000\nDot.\n";
    expect(parseSrt(dot)).toEqual([{ index: 1, startMs: 1250, endMs: 2000, text: "Dot." }]);
  });

  it("falls back to a running index when missing", () => {
    const noIndex = "00:00:00,000 --> 00:00:01,000\nA\n\n00:00:02,000 --> 00:00:03,000\nB\n";
    const cues = parseSrt(noIndex);
    expect(cues.map((c) => c.index)).toEqual([1, 2]);
  });

  it("skips blocks with unparseable timecodes", () => {
    const bad = "1\nnot a timecode\nText\n\n2\n00:00:01,000 --> 00:00:02,000\nOk\n";
    const cues = parseSrt(bad);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Ok");
  });

  it("returns cues sorted by start time", () => {
    const out =
      "2\n00:00:05,000 --> 00:00:06,000\nLater\n\n1\n00:00:01,000 --> 00:00:02,000\nEarlier\n";
    const cues = parseSrt(out);
    expect(cues.map((c) => c.text)).toEqual(["Earlier", "Later"]);
  });

  it("returns [] for empty input", () => {
    expect(parseSrt("")).toEqual([]);
    expect(parseSrt("\n\n\n")).toEqual([]);
  });
});
