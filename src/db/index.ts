import { closeDb, getDb } from "./client";
import { latestSchemaVersion, runMigrations } from "./migrations";

let initialized: Promise<void> | null = null;

export function initDb(): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      const db = await getDb();
      await runMigrations(db);
    })();
  }
  return initialized;
}

export {
  deletePref,
  getOffsetPresets,
  getPref,
  OFFSET_PRESET_SLOTS,
  type OffsetPresets,
  type PrefKey,
  setOffsetPresets,
  setPref,
} from "./prefs";
export {
  countSavedWords,
  deleteSavedWord,
  deleteSavedWordsForTrack,
  getSavedWord,
  insertSavedWord,
  listSavedWords,
  type NewSavedWord,
  type SavedWord,
} from "./savedWords";
export {
  type AnalysisState,
  deleteTrack,
  getTrack,
  insertTrack,
  listTracks,
  type NewTrack,
  type Track,
  updateTrack,
} from "./tracks";
export { closeDb, getDb, latestSchemaVersion };
