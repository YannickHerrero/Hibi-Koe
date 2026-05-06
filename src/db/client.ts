import * as SQLite from "expo-sqlite";

const DB_NAME = "hibi-koe.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME, {
      enableChangeListener: false,
    });
  }
  return dbPromise;
}

// Used in tests to start fresh.
export async function closeDb(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.closeAsync();
  dbPromise = null;
}
