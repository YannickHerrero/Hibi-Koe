import { useCallback, useEffect, useSyncExternalStore } from "react";
import { UnistylesRuntime, useUnistyles } from "react-native-unistyles";
import { getPref, setPref } from "../db/prefs";
import type { ThemeName } from "./colors";
import { themeNames } from "./colors";

const listeners = new Set<() => void>();
let currentName: ThemeName = (UnistylesRuntime.themeName ?? "paper") as ThemeName;
let hydrated = false;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(name: ThemeName) {
  currentName = name;
  for (const cb of listeners) cb();
}

function isThemeName(value: string | null): value is ThemeName {
  return value !== null && (themeNames as ReadonlyArray<string>).includes(value);
}

async function hydrateOnce() {
  if (hydrated) return;
  hydrated = true;
  const stored = await getPref("theme");
  if (isThemeName(stored) && stored !== currentName) {
    UnistylesRuntime.setTheme(stored);
    notify(stored);
  }
}

export function useThemeSwitcher() {
  // useUnistyles() ensures the component re-renders when the theme switches.
  useUnistyles();

  const name = useSyncExternalStore(
    subscribe,
    () => currentName,
    () => currentName,
  );

  useEffect(() => {
    hydrateOnce().catch((err) => {
      console.warn("Failed to hydrate theme", err);
    });
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    UnistylesRuntime.setTheme(next);
    notify(next);
    setPref("theme", next).catch((err) => {
      console.warn("Failed to persist theme", err);
    });
  }, []);

  return { theme: name, setTheme, available: themeNames };
}
