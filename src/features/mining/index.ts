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
export { clearApiKey, getApiKey, hasApiKey, setApiKey } from "./apiKey";
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
export { buildMatches } from "./match";
export {
  authHeaders,
  OPENROUTER_BASE,
  type OpenRouterKeyInfo,
  testOpenRouterApiKey,
} from "./openrouter";
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
export { hydrateFurigana, useFurigana } from "./useFurigana";
