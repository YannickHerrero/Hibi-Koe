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
  {
    version: 2,
    up: `
      ALTER TABLE tracks ADD COLUMN analysis_state TEXT;
      ALTER TABLE tracks ADD COLUMN analysis_path TEXT;
      ALTER TABLE tracks ADD COLUMN analysis_error TEXT;

      CREATE TABLE IF NOT EXISTS saved_words (
        id TEXT PRIMARY KEY NOT NULL,
        track_id TEXT NOT NULL,
        cue_index INTEGER NOT NULL,
        surface TEXT NOT NULL,
        reading TEXT,
        lemma TEXT,
        pos TEXT,
        glosses_json TEXT NOT NULL,
        sentence_jp TEXT NOT NULL,
        sentence_en TEXT,
        grammar_note TEXT,
        audio_start_ms INTEGER NOT NULL,
        audio_end_ms INTEGER NOT NULL,
        audio_clip_path TEXT,
        artwork_path TEXT,
        created_at INTEGER NOT NULL,
        exported_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_saved_words_track ON saved_words (track_id);
      CREATE INDEX IF NOT EXISTS idx_saved_words_lemma ON saved_words (lemma);
    `,
  },
  {
    version: 3,
    up: `
      -- JMdict / JMnedict moved out of giant JSON files (which OOM'd
      -- Android on file.text() for the ~250 MB JMnedict bundle) into
      -- SQLite tables that we can query lazily.
      CREATE TABLE IF NOT EXISTS dict_entries (
        dict_name TEXT NOT NULL,
        entry_id INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        PRIMARY KEY (dict_name, entry_id)
      );

      CREATE TABLE IF NOT EXISTS dict_index (
        form TEXT NOT NULL,
        dict_name TEXT NOT NULL,
        entry_id INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_dict_index_form ON dict_index (form, dict_name);
    `,
  },
  {
    version: 4,
    up: `
      -- Hibi sync state per saved word. NULL ≡ not yet attempted.
      ALTER TABLE saved_words ADD COLUMN sync_state TEXT;
      ALTER TABLE saved_words ADD COLUMN sync_error TEXT;

      CREATE INDEX IF NOT EXISTS idx_saved_words_sync_state
        ON saved_words (sync_state);
    `,
  },
  {
    version: 5,
    up: `
      -- User-curated playlists. ON DELETE CASCADE so removing a track
      -- (or a whole playlist) cleans up the join rows automatically.
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS playlists (
        id          TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL,
        created_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlist_id TEXT NOT NULL,
        track_id    TEXT NOT NULL,
        position    INTEGER NOT NULL,
        added_at    INTEGER NOT NULL,
        PRIMARY KEY (playlist_id, track_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (track_id)    REFERENCES tracks(id)    ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position
        ON playlist_tracks (playlist_id, position);
    `,
  },
  {
    version: 6,
    up: `
      -- Listening time tracker. Each row is one continuous "playing"
      -- interval (collapsing pauses < 60 s). Synced to Hibi's
      -- /v1/sessions endpoint via sync_state.
      CREATE TABLE IF NOT EXISTS listening_sessions (
        id           TEXT PRIMARY KEY NOT NULL,
        started_at   INTEGER NOT NULL,
        ended_at     INTEGER NOT NULL,
        duration_ms  INTEGER NOT NULL,
        track_id     TEXT,
        sync_state   TEXT,
        sync_error   TEXT,
        created_at   INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_listening_sessions_sync_state
        ON listening_sessions (sync_state);
      CREATE INDEX IF NOT EXISTS idx_listening_sessions_started_at
        ON listening_sessions (started_at);
    `,
  },
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL;");
  // FK pragma is per-connection; enable it before running any migration
  // that depends on cascading deletes (v5+).
  await db.execAsync("PRAGMA foreign_keys = ON;");
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
