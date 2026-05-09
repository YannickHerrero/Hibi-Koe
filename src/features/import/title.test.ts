import { describe, expect, it } from "vitest";
import { formatTitle, parseFilename } from "./title";

describe("parseFilename", () => {
  it("strips extension and chained release tags", () => {
    expect(parseFilename("erased-s01e01.condensed.mp3")).toEqual({
      title: "Erased",
      episodeLabel: "S01E01",
    });
  });

  it("handles bare basename with extension", () => {
    expect(parseFilename("My Track.flac")).toEqual({
      title: "My Track",
      episodeLabel: null,
    });
  });

  it("handles dot-delimited words", () => {
    expect(parseFilename("one.piece.s01e1047.mkv")).toEqual({
      title: "One Piece",
      episodeLabel: "S01E1047",
    });
  });

  it("strips bracketed release groups and quality tags", () => {
    expect(parseFilename("[Fansub] Show Name - 12 [BD-1080p].mkv")).toEqual({
      title: "Show Name 12",
      episodeLabel: null,
    });
  });

  it("recognises 1x02 form", () => {
    expect(parseFilename("severance-1x02.mp4")).toEqual({
      title: "Severance",
      episodeLabel: "S01E02",
    });
  });

  it("recognises 'episode N'", () => {
    expect(parseFilename("dark.episode 3.mkv")).toEqual({
      title: "Dark",
      episodeLabel: "E03",
    });
  });

  it("survives full filesystem paths", () => {
    expect(parseFilename("/storage/audio/erased-s01e01.condensed.mp3")).toEqual({
      title: "Erased",
      episodeLabel: "S01E01",
    });
  });

  it("title-cases ALL-CAPS sources", () => {
    expect(parseFilename("EVANGELION.S01E13.mkv")).toEqual({
      title: "Evangelion",
      episodeLabel: "S01E13",
    });
  });

  it("falls back to Untitled when nothing remains", () => {
    expect(parseFilename(".mp3")).toEqual({
      title: "Untitled",
      episodeLabel: null,
    });
  });

  it("doesn't strip mid-name dots that aren't recognised tags", () => {
    expect(parseFilename("Mr.Robot.S02E01.mkv")).toEqual({
      title: "Mr Robot",
      episodeLabel: "S02E01",
    });
  });
});

describe("formatTitle", () => {
  it("composes 'Show · S01E01' when an episode is found", () => {
    expect(formatTitle("erased-s01e01.condensed.mp3")).toBe("Erased · S01E01");
  });

  it("returns just the title when no episode is found", () => {
    expect(formatTitle("My Track.flac")).toBe("My Track");
  });
});
