// Tiny hook that owns the open/close + active-track state for the
// TrackContextSheet. Any list (Library, Playlist detail) wires its
// onLongPress to `open(track)` and renders the sheet with `state`.

import { useCallback, useState } from "react";
import type { Track } from "../../db";

export type TrackContextSheetState = {
  visible: boolean;
  track: Track | null;
  open: (track: Track) => void;
  close: () => void;
};

export function useTrackContextSheet(): TrackContextSheetState {
  const [visible, setVisible] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);

  const open = useCallback((t: Track) => {
    setTrack(t);
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, track, open, close };
}
