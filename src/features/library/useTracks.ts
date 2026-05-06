import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { listTracks, type Track } from "../../db";

// In v1 we just refetch on focus. The library is small enough that
// this stays under a few ms; we can layer in a store later if needed.
export function useTracks() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await listTracks();
      setTracks(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { tracks, error, refresh };
}
