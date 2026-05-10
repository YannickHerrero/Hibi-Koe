import { type AudioPlayer, type AudioStatus, createAudioPlayer } from "expo-audio";
import { listPlaylistTracks, listTracks, type Track } from "../../db";
import { getPref, setPref } from "../../db/prefs";

// Module-level singleton player. Audio is one-at-a-time in v1: loading
// a new track replaces the previous player so the mini-player on the
// library tab and the modal player observe the same source of truth.
//
// State updates flow through `subscribe` so any consumer
// (useSyncExternalStore-based) re-renders.

// What list the player should walk for auto-advance / random pickNext.
// Set whenever loadTrack is called; defaults to "library" when callers
// don't specify a context.
export type PlaybackContext =
  | { kind: "library" }
  | { kind: "playlist"; playlistId: string };

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
  // Where the current track was launched from. End-of-track auto-advance
  // walks this list.
  context: PlaybackContext;
};

const LIBRARY_CONTEXT: PlaybackContext = { kind: "library" };

const initialState: PlaybackState = {
  track: null,
  status: null,
  positionMs: 0,
  durationMs: 0,
  loopMode: false,
  randomMode: false,
  context: LIBRARY_CONTEXT,
};

let state: PlaybackState = initialState;
let player: AudioPlayer | null = null;
let statusSub: { remove: () => void } | null = null;
// When set, the next status update that reports isLoaded will seek to
// this position and start playback. Used by playTrackAt so callers can
// jump to a saved cue on a freshly-created player without racing the
// audio source's load.
let pendingSeekMs: number | null = null;
let pendingPlayAfterSeek = false;
// When set, the status listener pauses playback once the position
// reaches this point. Cleared on any user-initiated seek/play so we
// don't fire mid-track on later transport interactions.
let stopAtMs: number | null = null;

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

function sameContext(a: PlaybackContext, b: PlaybackContext): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "playlist" && b.kind === "playlist") return a.playlistId === b.playlistId;
  return true;
}

function detach(): void {
  if (statusSub) {
    statusSub.remove();
    statusSub = null;
  }
  if (player) {
    // Pause first so audio actually stops before the listener / native
    // player are torn down. Without this, a swipe-killed JS process can
    // leave the ExoPlayer running for a few extra seconds.
    try {
      player.pause();
    } catch {
      // best-effort
    }
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

// Re-binds the system MediaSession to the *current* native player. Run
// it on every loadTrack (even the same-track short-circuit) so a fresh
// process owns the lockscreen / notification controls instead of the
// previous process's leftover binding.
function bindLockScreen(track: Track): void {
  if (!player) return;
  try {
    player.setActiveForLockScreen(
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
    console.warn("[player] setActiveForLockScreen failed", err);
  }
}

export function loadTrack(track: Track, context: PlaybackContext = LIBRARY_CONTEXT): void {
  if (state.track?.id === track.id && player) {
    // Same track — refresh context if changed and re-bind the lockscreen
    // so the current native player owns the system media controls (a
    // previous process's binding can otherwise win).
    if (!sameContext(state.context, context)) {
      setState({ ...state, context });
    }
    bindLockScreen(track);
    return;
  }

  detach();

  const next = createAudioPlayer(track.audioPath, {
    updateInterval: 200,
    keepAudioSessionActive: true,
  });
  player = next;
  bindLockScreen(track);

  // Carry over the user's loop/random toggles into the new player.
  next.loop = state.loopMode;

  setState({
    ...state,
    track,
    status: null,
    positionMs: 0,
    durationMs: track.durationMs,
    context,
  });

  statusSub = next.addListener("playbackStatusUpdate", (status) => {
    setState({
      ...state,
      track,
      status,
      positionMs: Math.round(status.currentTime * 1000),
      durationMs: status.duration > 0 ? Math.round(status.duration * 1000) : track.durationMs,
    });

    if (
      stopAtMs !== null &&
      status.isLoaded &&
      status.playing &&
      status.currentTime * 1000 >= stopAtMs
    ) {
      stopAtMs = null;
      next.pause();
    }

    if (pendingSeekMs !== null && status.isLoaded) {
      const target = pendingSeekMs;
      const shouldPlay = pendingPlayAfterSeek;
      pendingSeekMs = null;
      pendingPlayAfterSeek = false;
      next
        .seekTo(Math.max(0, target / 1000))
        .then(() => {
          if (shouldPlay) next.play();
        })
        .catch((err) => console.warn("[player] pending seek failed", err));
    }

    // expo-audio's player.loop handles repeat natively when loopMode is on.
    // When loop is off and randomMode is on, pick another track from the
    // library and load it. Otherwise snap to 0 and stay paused so the
    // user can replay manually.
    if (status.didJustFinish && !state.loopMode) {
      if (state.randomMode) {
        playRandomNext(track.id).catch((err) =>
          console.warn("[player] randomMode pickNext failed", err),
        );
      } else {
        playNextInContext(track.id, state.context).catch((err) =>
          console.warn("[player] auto-advance failed", err),
        );
      }
    }
  });
}

async function playRandomNext(currentId: string): Promise<void> {
  const tracks = await listTracks();
  const others = tracks.filter((t) => t.id !== currentId);
  if (others.length === 0) return;
  const next = others[Math.floor(Math.random() * others.length)];
  loadTrack(next, state.context);
  player?.play();
}

// Walk the current context's ordered list and start the track that
// follows currentId. End-of-list → pause + snap to 0 (matches the
// pre-auto-advance single-track behaviour).
async function playNextInContext(currentId: string, context: PlaybackContext): Promise<void> {
  const list =
    context.kind === "playlist"
      ? await listPlaylistTracks(context.playlistId)
      : await listTracks();
  const idx = list.findIndex((t) => t.id === currentId);
  const next = idx >= 0 ? list[idx + 1] : undefined;
  if (!next) {
    player?.pause();
    player?.seekTo(0).catch(() => {});
    return;
  }
  loadTrack(next, context);
  player?.play();
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
  stopAtMs = null;
  player?.play();
}

export function pause(): void {
  stopAtMs = null;
  player?.pause();
}

export function togglePlay(): void {
  if (!player) return;
  stopAtMs = null;
  if (player.playing) {
    player.pause();
  } else {
    player.play();
  }
}

// Loads the track if not already current, then seeks to `ms` and plays.
// Safe to call against a freshly-created player — the seek/play are
// deferred until the audio source reports isLoaded.
export function playTrackAt(track: Track, ms: number, endMs?: number): void {
  stopAtMs = endMs !== undefined && endMs > ms ? endMs : null;
  const alreadyLoaded = state.track?.id === track.id && player !== null;
  if (!alreadyLoaded) {
    pendingSeekMs = ms;
    pendingPlayAfterSeek = true;
    loadTrack(track);
    return;
  }
  const p = player;
  if (!p) return;
  p.seekTo(Math.max(0, ms / 1000))
    .then(() => p.play())
    .catch((err) => console.warn("[player] playTrackAt seek failed", err));
}

export function seekToMs(ms: number): void {
  if (!player) return;
  stopAtMs = null;
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
