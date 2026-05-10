import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { getPlaylist, listPlaylistTracks, type Playlist, type Track } from "../../db";

export function usePlaylist(id: string | undefined) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const [p, ts] = await Promise.all([getPlaylist(id), listPlaylistTracks(id)]);
      setPlaylist(p);
      setTracks(ts);
      setError(null);
    } catch (err) {
      console.error("[playlists] usePlaylist load failed", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { playlist, tracks, error, refresh };
}
