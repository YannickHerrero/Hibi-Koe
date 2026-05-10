import * as Crypto from "expo-crypto";
import type * as SQLite from "expo-sqlite";
import { getDb } from "./client";
import { type Track, trackFromRow, type TrackRow } from "./tracks";

export type Playlist = {
  id: string;
  name: string;
  createdAt: number;
  trackCount: number;
};

type PlaylistRow = {
  id: string;
  name: string;
  created_at: number;
  track_count: number;
};

function fromRow(row: PlaylistRow): Playlist {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    trackCount: row.track_count ?? 0,
  };
}

const SELECT_WITH_COUNT = `
  SELECT p.id, p.name, p.created_at,
    (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count
  FROM playlists p
`;

export async function listPlaylists(): Promise<Playlist[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlaylistRow>(
    `${SELECT_WITH_COUNT} ORDER BY p.created_at DESC;`,
  );
  return rows.map(fromRow);
}

export async function getPlaylist(id: string): Promise<Playlist | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PlaylistRow>(
    `${SELECT_WITH_COUNT} WHERE p.id = ? LIMIT 1;`,
    id,
  );
  return row ? fromRow(row) : null;
}

export async function createPlaylist(name: string): Promise<Playlist> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Playlist name cannot be empty.");
  const db = await getDb();
  const id = Crypto.randomUUID();
  const createdAt = Date.now();
  await db.runAsync(
    "INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?);",
    id,
    trimmed,
    createdAt,
  );
  return { id, name: trimmed, createdAt, trackCount: 0 };
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Playlist name cannot be empty.");
  const db = await getDb();
  await db.runAsync("UPDATE playlists SET name = ? WHERE id = ?;", trimmed, id);
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM playlists WHERE id = ?;", id);
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  const db = await getDb();
  // No-op when already present (composite PK conflict). Otherwise append
  // at max(position)+1 within this playlist.
  const max = await db.getFirstAsync<{ p: number | null }>(
    "SELECT MAX(position) AS p FROM playlist_tracks WHERE playlist_id = ?;",
    playlistId,
  );
  const next = (max?.p ?? -1) + 1;
  await db.runAsync(
    `INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(playlist_id, track_id) DO NOTHING;`,
    playlistId,
    trackId,
    next,
    Date.now(),
  );
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      "DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?;",
      playlistId,
      trackId,
    );
    // Re-densify positions so subsequent inserts append cleanly.
    await densifyPositions(txn, playlistId);
  });
}

export async function listPlaylistTracks(playlistId: string): Promise<Track[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT t.* FROM playlist_tracks pt
     INNER JOIN tracks t ON t.id = pt.track_id
     WHERE pt.playlist_id = ?
     ORDER BY pt.position ASC;`,
    playlistId,
  );
  return rows.map(trackFromRow);
}

export async function listPlaylistsForTrack(trackId: string): Promise<Playlist[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlaylistRow>(
    `${SELECT_WITH_COUNT}
     INNER JOIN playlist_tracks pt ON pt.playlist_id = p.id
     WHERE pt.track_id = ?
     ORDER BY p.created_at DESC;`,
    trackId,
  );
  return rows.map(fromRow);
}

export async function reorderPlaylistTracks(
  playlistId: string,
  trackIds: string[],
): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let i = 0; i < trackIds.length; i++) {
      await txn.runAsync(
        "UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?;",
        i,
        playlistId,
        trackIds[i],
      );
    }
  });
}

// Walks the playlist's rows in current order and renumbers them 0..N-1
// so subsequent appends use a clean max+1.
async function densifyPositions(
  txn: SQLite.SQLiteDatabase,
  playlistId: string,
): Promise<void> {
  const rows = await txn.getAllAsync<{ track_id: string }>(
    "SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC;",
    playlistId,
  );
  for (let i = 0; i < rows.length; i++) {
    await txn.runAsync(
      "UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?;",
      i,
      playlistId,
      rows[i].track_id,
    );
  }
}
