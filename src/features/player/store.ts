import { type AudioPlayer, type AudioStatus, createAudioPlayer } from "expo-audio";
import type { Track } from "../../db";
import { getPref, setPref } from "../../db/prefs";

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
  // When loopMode is on, expo-audio replays the current track on its own
  // (player.loop = true). When randomMode is on (and loop is off), the
  // didJustFinish handler picks another library track and loads it.
  loopMode: boolean;
  randomMode: boolean;
};

const initialState: PlaybackState = {
  track: null,
  status: null,
  positionMs: 0,
  durationMs: 0,
  loopMode: false,
  randomMode: false,
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
      player.clearLockScreenControls();
    } catch {
      // best-effort
    }
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

  // Surface the track on the Android lockscreen / notification shade and
  // the iOS Now Playing widget. expo-audio binds the player to the
  // platform's media session and renders artwork from the optional URL.
  try {
    next.setActiveForLockScreen(
      true,
      {
        title: track.title,
        artist: track.artist ?? undefined,
        albumTitle: track.source ?? undefined,
        artworkUrl: track.artworkPath ?? undefined,
      },
      { showSeekBackward: true, showSeekForward: true },
    );
  } catch (err) {
    console.warn("Failed to bind track to lockscreen", err);
  }

  // Carry over the user's loop/random toggles into the new player.
  next.loop = state.loopMode;

  setState({
    ...state,
    track,
    status: null,
    positionMs: 0,
    durationMs: track.durationMs,
  });

  statusSub = next.addListener("playbackStatusUpdate", (status) => {
    setState({
      ...state,
      track,
      status,
      positionMs: Math.round(status.currentTime * 1000),
      durationMs: status.duration > 0 ? Math.round(status.duration * 1000) : track.durationMs,
    });

    // expo-audio's player.loop handles repeat natively when loopMode is on.
    // For didJustFinish (loop off): we'll wire random-next behaviour in a
    // follow-up commit; for now, snap back to 0 and stay paused.
    if (status.didJustFinish && !state.loopMode) {
      next.pause();
      next.seekTo(0).catch(() => {});
    }
  });
}

export function setLoopMode(value: boolean): void {
  if (player) player.loop = value;
  setState({ ...state, loopMode: value });
  setPref("loopMode", value ? "1" : "0").catch((err) =>
    console.warn("[player] persist loopMode failed", err),
  );
}

export function setRandomMode(value: boolean): void {
  setState({ ...state, randomMode: value });
  setPref("randomMode", value ? "1" : "0").catch((err) =>
    console.warn("[player] persist randomMode failed", err),
  );
}

export function toggleLoopMode(): void {
  setLoopMode(!state.loopMode);
}

export function toggleRandomMode(): void {
  setRandomMode(!state.randomMode);
}

let prefsHydrated = false;

// Public: lets the boot sequence apply saved loop/random preferences
// before any UI renders. Idempotent.
export async function hydratePlaybackPrefs(): Promise<void> {
  if (prefsHydrated) return;
  prefsHydrated = true;
  const [loop, random] = await Promise.all([getPref("loopMode"), getPref("randomMode")]);
  setState({
    ...state,
    loopMode: loop === "1",
    randomMode: random === "1",
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
