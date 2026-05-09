// Shared types for the sentence-mining pipeline.
//
// AnalysisData is the per-track JSON blob written to
// `Paths.document/analysis/<trackId>.json`. AnalyzedCue carries
// everything the player and the dictionary popup need at runtime
// (the original cue plus tokens + dictionary matches + LLM output).

export type Token = {
  surface: string;
  reading: string; // katakana (kuromoji default); converted to hiragana at render
  lemma: string;
  pos: string; // first-level POS, e.g. "名詞" / "動詞"
  charStart: number; // inclusive offset in cue.text
  charEnd: number; // exclusive offset
};

export type DictSource = "jmdict" | "jmnedict";

export type DictMatch = {
  source: DictSource;
  entryId: number; // index into the dict's entries Map
  // The token range this match covers (longest-match window).
  tokenStart: number;
  tokenEnd: number; // exclusive
  // The actual surface form that matched (e.g. "走って" or its lemma "走る").
  matchedSurface: string;
};

export type DictForm = {
  text: string;
  isCommon?: boolean;
};

export type DictReading = {
  text: string;
  isCommon?: boolean;
  appliesToKanji?: string[];
};

export type DictSense = {
  partOfSpeech: string[];
  glosses: string[];
  fields?: string[];
  misc?: string[];
  examples?: string[];
};

export type DictEntry = {
  id: number;
  forms: DictForm[];
  readings: DictReading[];
  senses: DictSense[];
};

export type AnalyzedCue = {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
  tokens: Token[];
  // Map from token-index → matches that begin at that index.
  // Sorted longest-first within each list.
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
