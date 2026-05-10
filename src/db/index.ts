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
  clearDict,
  type DictName,
  dictHasRows,
  getDictEntryPayloads,
  insertDictEntriesBatch,
  insertDictIndexBatch,
  lookupEntryIds,
  lookupEntryIdsBatch,
} from "./dictRepo";
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
  countUnsyncedListeningSessions,
  getListeningSession,
  insertListeningSession,
  type ListeningSession,
  listUnsyncedListeningSessions,
  markListeningSessionFailed,
  markListeningSessionSynced,
  markListeningSessionSyncing,
  type NewListeningSession,
  type SessionSyncState,
  totalListeningMsBetween,
} from "./listeningSessions";
export {
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  listPlaylists,
  listPlaylistsForTrack,
  listPlaylistTracks,
  type Playlist,
  removeTrackFromPlaylist,
  renamePlaylist,
  reorderPlaylistTracks,
} from "./playlists";
export {
  countSavedWords,
  deleteSavedWord,
  deleteSavedWordsForTrack,
  getSavedWord,
  insertSavedWord,
  listSavedWords,
  listUnsyncedSavedWords,
  markSavedWordFailed,
  markSavedWordSynced,
  markSavedWordSyncing,
  type NewSavedWord,
  type SavedWord,
  type SyncState,
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
