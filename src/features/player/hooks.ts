import { useSyncExternalStore } from "react";
import { getState, type PlaybackState, subscribe } from "./store";

// Subscribes to the entire playback state. Returns a stable reference
// between updates so components can pick fields off it freely.
export function usePlayback(): PlaybackState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// Narrow selector for components that only need the current track.
export function useCurrentTrack(): PlaybackState["track"] {
  return usePlayback().track;
}

// Narrow selector for transport / scrubber components that re-render
// often. Returns { positionMs, durationMs, playing, isLoaded }.
export function usePlaybackProgress(): {
  positionMs: number;
  durationMs: number;
  playing: boolean;
  isLoaded: boolean;
} {
  const state = usePlayback();
  return {
    positionMs: state.positionMs,
    durationMs: state.durationMs,
    playing: state.status?.playing ?? false,
    isLoaded: state.status?.isLoaded ?? false,
  };
}
