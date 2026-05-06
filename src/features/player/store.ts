import { type AudioPlayer, type AudioStatus, createAudioPlayer } from "expo-audio";
import type { Track } from "../../db";

// Module-level singleton player. Audio is one-at-a-time in v1: loading
// a new track replaces the previous player so the mini-player on the
// library tab and the modal player observe the same source of truth.
//
// State updates flow through `subscribe` so any consumer
// (useSyncExternalStore-based) re-renders.

export type PlaybackState = {
  track: Track | null;
  status: AudioStatus | null;
  // Last known position in ms. Status emits seconds; we cache ms to avoid
  // floating point churn in components subscribed to the position.
  positionMs: number;
  durationMs: number;
};

const initialState: PlaybackState = {
  track: null,
  status: null,
  positionMs: 0,
  durationMs: 0,
};

let state: PlaybackState = initialState;
let player: AudioPlayer | null = null;
let statusSub: { remove: () => void } | null = null;

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): PlaybackState {
  return state;
}

function setState(next: PlaybackState): void {
  state = next;
  for (const listener of listeners) listener();
}

function detach(): void {
  if (statusSub) {
    statusSub.remove();
    statusSub = null;
  }
  if (player) {
    try {
      player.remove();
    } catch {
      // best-effort
    }
    player = null;
  }
}

export function loadTrack(track: Track): void {
  if (state.track?.id === track.id && player) {
    return;
  }

  detach();

  const next = createAudioPlayer(track.audioPath, {
    updateInterval: 200,
    keepAudioSessionActive: true,
  });
  player = next;

  setState({
    track,
    status: null,
    positionMs: 0,
    durationMs: track.durationMs,
  });

  statusSub = next.addListener("playbackStatusUpdate", (status) => {
    setState({
      track,
      status,
      positionMs: Math.round(status.currentTime * 1000),
      durationMs: status.duration > 0 ? Math.round(status.duration * 1000) : track.durationMs,
    });
  });
}

export function play(): void {
  player?.play();
}

export function pause(): void {
  player?.pause();
}

export function togglePlay(): void {
  if (!player) return;
  if (player.playing) {
    player.pause();
  } else {
    player.play();
  }
}

export function seekToMs(ms: number): void {
  if (!player) return;
  player.seekTo(Math.max(0, ms / 1000)).catch(() => {});
}

export function skipBy(deltaMs: number): void {
  seekToMs(state.positionMs + deltaMs);
}

export function setRate(rate: number): void {
  player?.setPlaybackRate(rate);
}

export function unload(): void {
  detach();
  setState(initialState);
}
