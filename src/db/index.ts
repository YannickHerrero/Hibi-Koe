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

export { deletePref, getPref, type PrefKey, setPref } from "./prefs";
export {
  deleteTrack,
  getTrack,
  insertTrack,
  listTracks,
  type NewTrack,
  type Track,
  updateTrack,
} from "./tracks";
export { closeDb, getDb, latestSchemaVersion };
