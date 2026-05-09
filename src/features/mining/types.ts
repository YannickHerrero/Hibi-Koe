// Shared types for the sentence-mining pipeline. The shapes mirror
// Pureyaa so we can port their algorithm files (tokenize / dict /
// match) verbatim — only the surrounding plumbing differs.

export type Token = {
  surface: string;
  reading: string; // katakana (kuromoji default); converted at render
  lemma: string;
  pos: string;
  charStart: number; // inclusive offset in cue.text
  charEnd: number; // exclusive offset
};

export type DictName = "jmdict" | "jmnedict";

export type DictMatch = {
  // [start, end] inclusive token indices.
  tokenSpan: [number, number];
  // The form that hit the index — either the surface joined across the
  // span, or the lemma of a single-token match.
  form: string;
  source: "surface" | "lemma";
  dict: DictName;
  entryIds: number[];
};

export type DictSenseExample = {
  jpn?: string;
  eng?: string;
};

export type DictSense = {
  pos: string[];
  glosses: string[];
  fields?: string[];
  misc?: string[];
  examples?: DictSenseExample[];
};

export type DictEntry = {
  id: number;
  forms: string[];
  readings: string[];
  senses: DictSense[];
  frequency?: string;
  nameType?: string[];
};

export type DictBundle = {
  // Maps avoid Hermes' 196,607-property-per-object limit. JMnedict alone
  // has ~750k entries.
  index: Map<string, number[]>;
  entries: Map<number, DictEntry>;
};

export type SerializedDictBundle = {
  index: [string, number[]][];
  entries: [number, DictEntry][];
};

export type AnalyzedCue = {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
  tokens: Token[];
  // Map from token-index → matches that begin at that index, sorted
  // longest-first (jmdict before jmnedict on ties).
  matchesByTokenIndex: Record<number, DictMatch[]>;
  translation: string | null;
  grammarNote: string | null;
};

export type AnalysisData = {
  trackId: string;
  // Schema version of the blob; bump when the shape above changes.
  version: 1;
  cues: AnalyzedCue[];
};
