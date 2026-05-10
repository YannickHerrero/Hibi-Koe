// Subscribes to the player singleton and accumulates listening time.
//
// State machine:
//   IDLE     ── playing? = true ────────►  PLAYING (open session)
//   PLAYING  ── playing? = false ───────►  PAUSED  (clock stopped, accumulated kept)
//   PAUSED   ── playing? = true within 60 s of pause ──►  PLAYING (resume same session)
//   PAUSED   ── 60 s elapsed since pause ──────────────►  IDLE (close + insert row)
//   PLAYING  ── current track id changes ───────────────►  close + open new session
//
// While PLAYING we also flush a partial row every FLUSH_INTERVAL_MS so
// a process death (e.g. swipe-kill) loses at most that window.
//
// Sessions shorter than MIN_SESSION_MS are dropped to keep accidental
// taps out of the data.

import { getState, subscribe } from "../player";
import { insertListeningSession } from "../../db";
import { syncSession } from "./sync";

const PAUSE_GRACE_MS = 60_000;
const FLUSH_INTERVAL_MS = 60_000;
const MIN_SESSION_MS = 5_000;
const POLL_INTERVAL_MS = 1_000;

type Mode = "IDLE" | "PLAYING" | "PAUSED";

let mode: Mode = "IDLE";
let openedAt = 0; // ms — start of the current session window
let accumulatedMs = 0; // total playing ms within the open session
let lastTickAt = 0; // ms — last time we advanced accumulatedMs while PLAYING
let pausedAt = 0; // ms — when we entered PAUSED (for grace expiry)
let openTrackId: string | null = null;
let lastFlushAt = 0;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let unsubscribe: (() => void) | null = null;
let started = false;

function now(): number {
  return Date.now();
}

function ensurePolling(): void {
  if (pollTimer) return;
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function persistAndReset(closedAt: number): Promise<void> {
  const startedAt = openedAt;
  const durationMs = accumulatedMs;
  const trackId = openTrackId;
  // Reset before await so a re-entrant tick doesn't double-insert.
  mode = "IDLE";
  openedAt = 0;
  accumulatedMs = 0;
  lastTickAt = 0;
  pausedAt = 0;
  openTrackId = null;
  lastFlushAt = 0;
  if (durationMs < MIN_SESSION_MS) return;
  try {
    const row = await insertListeningSession({
      startedAt,
      endedAt: closedAt,
      durationMs,
      trackId,
    });
    syncSession(row.id).catch((err) =>
      console.warn("[time-tracking] auto-sync failed", err),
    );
  } catch (err) {
    console.warn("[time-tracking] insertListeningSession failed", err);
  }
}

async function flushPartial(): Promise<void> {
  // Persist what we have so far and start a fresh session window from
  // the current moment. Keeps a swipe-kill from losing >FLUSH_INTERVAL_MS.
  const endedAt = now();
  const startedAt = openedAt;
  const durationMs = accumulatedMs;
  const trackId = openTrackId;
  if (durationMs < MIN_SESSION_MS) {
    lastFlushAt = endedAt;
    return;
  }
  // Reset window in-place so we keep PLAYING.
  openedAt = endedAt;
  accumulatedMs = 0;
  lastTickAt = endedAt;
  lastFlushAt = endedAt;
  try {
    const row = await insertListeningSession({
      startedAt,
      endedAt,
      durationMs,
      trackId,
    });
    syncSession(row.id).catch((err) =>
      console.warn("[time-tracking] partial-flush sync failed", err),
    );
  } catch (err) {
    console.warn("[time-tracking] partial flush insert failed", err);
  }
}

function openSession(trackId: string | null): void {
  const t = now();
  mode = "PLAYING";
  openedAt = t;
  accumulatedMs = 0;
  lastTickAt = t;
  lastFlushAt = t;
  pausedAt = 0;
  openTrackId = trackId;
  ensurePolling();
}

function tick(): void {
  const t = now();
  if (mode === "PLAYING") {
    accumulatedMs += t - lastTickAt;
    lastTickAt = t;
    if (t - lastFlushAt >= FLUSH_INTERVAL_MS) {
      void flushPartial();
    }
    return;
  }
  if (mode === "PAUSED" && t - pausedAt >= PAUSE_GRACE_MS) {
    // Close at the moment we paused — the grace period is silence.
    void persistAndReset(pausedAt);
    stopPolling();
  }
}

function onPlayerChange(): void {
  const state = getState();
  const playing = !!state.status?.playing;
  const trackId = state.track?.id ?? null;

  // Track switched while open — close the current and open a new one.
  if (mode !== "IDLE" && trackId !== openTrackId) {
    const closeAt = mode === "PLAYING" ? now() : pausedAt;
    if (mode === "PLAYING") accumulatedMs += now() - lastTickAt;
    void persistAndReset(closeAt);
    if (playing) openSession(trackId);
    return;
  }

  if (playing && mode !== "PLAYING") {
    if (mode === "PAUSED" && now() - pausedAt < PAUSE_GRACE_MS) {
      // Resume same session.
      mode = "PLAYING";
      lastTickAt = now();
      pausedAt = 0;
      ensurePolling();
    } else {
      openSession(trackId);
    }
    return;
  }

  if (!playing && mode === "PLAYING") {
    accumulatedMs += now() - lastTickAt;
    lastTickAt = 0;
    pausedAt = now();
    mode = "PAUSED";
    // Keep polling so we can fire the grace-expiry close.
    ensurePolling();
  }
}

export function startTimeTracker(): void {
  if (started) return;
  started = true;
  unsubscribe = subscribe(onPlayerChange);
  // Sync up with whatever state already exists at boot.
  onPlayerChange();
}

// Tests / hot-reload.
export function stopTimeTracker(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  stopPolling();
  started = false;
}
