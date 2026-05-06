import { Directory, Paths } from "expo-file-system";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { listTracks } from "../../db";

type Usage = {
  trackCount: number;
  totalBytes: number | null;
};

const TRACKS_DIR = "tracks";

export function useStorageUsage(): Usage {
  const [usage, setUsage] = useState<Usage>({ trackCount: 0, totalBytes: null });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const tracks = await listTracks();
        if (cancelled) return;

        const dir = new Directory(Paths.document, TRACKS_DIR);
        const totalBytes = dir.exists ? dir.size : null;

        setUsage({ trackCount: tracks.length, totalBytes });
      })().catch(() => {
        if (!cancelled) setUsage((u) => ({ ...u, totalBytes: null }));
      });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  return usage;
}

export function formatBytes(n: number | null): string {
  if (n === null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
