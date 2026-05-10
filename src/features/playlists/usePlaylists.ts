import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { listPlaylists, type Playlist } from "../../db";

// Mirrors useTracks: simple focus-effect refetch. Counts are cheap;
// we can layer caching in once the list grows.
export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await listPlaylists();
      setPlaylists(next);
      setError(null);
    } catch (err) {
      console.error("[playlists] listPlaylists failed", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { playlists, error, refresh };
}
