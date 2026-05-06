import type * as SQLite from "expo-sqlite";

type Migration = {
  version: number;
  up: string;
};

const migrations: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        artist TEXT,
        source TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        audio_path TEXT NOT NULL,
        subtitle_path TEXT,
        artwork_path TEXT,
        offset_ms INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prefs (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync(
    "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY NOT NULL);",
  );

  const row = await db.getFirstAsync<{ version: number } | null>(
    "SELECT version FROM schema_version LIMIT 1;",
  );
  const current = row?.version ?? 0;

  for (const m of migrations) {
    if (m.version <= current) continue;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(m.up);
      await txn.runAsync("DELETE FROM schema_version;");
      await txn.runAsync("INSERT INTO schema_version (version) VALUES (?);", m.version);
    });
  }
}

export const latestSchemaVersion = migrations.at(-1)?.version ?? 0;
