// MUST come first: any leaf module that creates themed stylesheets
// needs the Unistyles runtime configured before evaluation.
import "../../theme/unistyles";

export {
  analysisExistsFor,
  analysisFileFor,
  deleteAnalysis,
  readAnalysis,
  writeAnalysis,
} from "./analysisStore";
export { clearHibiApiKey, getHibiApiKey, hasHibiApiKey, setHibiApiKey } from "./hibiApiKey";
export { getHibiClient, HIBI_BASE_URL, resetHibiClient } from "./hibiClient";
export { segmentFurigana } from "./furigana";
export { extractKanjiList } from "./kanjiList";
export { type SyncProgress, syncAllPending, syncSavedWord } from "./sync";
export { DictionaryPopup } from "./DictionaryPopup";
export {
  DICT_DIR,
  dictsAvailable,
  getEntries,
  isLoaded as isDictLoaded,
  JMDICT_FILE,
  JMNEDICT_FILE,
  loadDictionaries,
  lookup,
  serializeBundle,
  unloadDictionaries,
} from "./dict";
export {
  type InstallProgress,
  type InstallStage,
  installDictionaries,
} from "./dictInstaller";
export {
  ANALYSIS_MODEL,
  type CueTranslation,
  IncrementalArrayParser,
  type TranslateOptions,
  translateCues,
} from "./llm";
export { MiningSheet } from "./MiningSheet";
export { buildMatches, getMatchesCoveringToken } from "./match";
export {
  type AnalysisProgress,
  type AnalyzeOptions,
  analyzeTrack,
} from "./orchestrator";
export { TokenChip, type TokenWordStatus } from "./TokenChip";
export { getTokenizer, resetTokenizer, tokenize } from "./tokenize";
export type {
  AnalysisData,
  AnalyzedCue,
  DictBundle,
  DictEntry,
  DictMatch,
  DictName,
  DictSense,
  DictSenseExample,
  SerializedDictBundle,
  Token,
} from "./types";
export { useAnalysis } from "./useAnalysis";
export { hydrateFurigana, useFurigana } from "./useFurigana";
export { hydrateMatchUnderline, useMatchUnderline } from "./useMatchUnderline";
export { useSavedWords } from "./useSavedWords";
export {
  attachKnownWordsAppStateRefresh,
  hydrateWordStatuses,
  refreshKnownWords,
  setManualWordStatus,
  useWordStatuses,
  type WordStatusLookup,
} from "./wordStatuses";
