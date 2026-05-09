import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getPref, setPref } from "../../db/prefs";

// Mirrors useFurigana's pattern. Default OFF — the underline is a
// secondary visual cue; users who want it on enable it from Settings.

let value = false;
let hydrated = false;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(next: boolean) {
  value = next;
  for (const cb of listeners) cb();
}

export async function hydrateMatchUnderline(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const stored = await getPref("matchUnderlineOn");
  if (stored === "1") notify(true);
  else if (stored === "0") notify(false);
}

export function useMatchUnderline(): {
  matchUnderlineOn: boolean;
  setMatchUnderline: (next: boolean) => void;
  toggleMatchUnderline: () => void;
} {
  const matchUnderlineOn = useSyncExternalStore(
    subscribe,
    () => value,
    () => value,
  );

  useEffect(() => {
    hydrateMatchUnderline().catch((err) => {
      console.warn("[mining] hydrateMatchUnderline failed", err);
    });
  }, []);

  const setMatchUnderline = useCallback((next: boolean) => {
    notify(next);
    setPref("matchUnderlineOn", next ? "1" : "0").catch((err) => {
      console.warn("[mining] persist matchUnderline failed", err);
    });
  }, []);

  const toggleMatchUnderline = useCallback(() => {
    setMatchUnderline(!value);
  }, [setMatchUnderline]);

  return { matchUnderlineOn, setMatchUnderline, toggleMatchUnderline };
}
