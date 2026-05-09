import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getPref, setPref } from "../../db/prefs";

// Module-level state with subscriber set, mirroring useThemeSwitcher.
// Default: on. Toggle from the Settings screen; the mining sheet reads
// it to decide whether to render reading-on-top of token chips.

let value = true;
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

export async function hydrateFurigana(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const stored = await getPref("furiganaOn");
  if (stored === "0") notify(false);
  else if (stored === "1") notify(true);
}

export function useFurigana(): {
  furiganaOn: boolean;
  setFurigana: (next: boolean) => void;
  toggleFurigana: () => void;
} {
  const furiganaOn = useSyncExternalStore(
    subscribe,
    () => value,
    () => value,
  );

  useEffect(() => {
    hydrateFurigana().catch((err) => {
      console.warn("[mining] hydrateFurigana failed", err);
    });
  }, []);

  const setFurigana = useCallback((next: boolean) => {
    notify(next);
    setPref("furiganaOn", next ? "1" : "0").catch((err) => {
      console.warn("[mining] persist furigana failed", err);
    });
  }, []);

  const toggleFurigana = useCallback(() => {
    setFurigana(!value);
  }, [setFurigana]);

  return { furiganaOn, setFurigana, toggleFurigana };
}
