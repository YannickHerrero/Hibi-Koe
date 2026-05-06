import { useCallback, useSyncExternalStore } from "react";
import { UnistylesRuntime, useUnistyles } from "react-native-unistyles";
import type { ThemeName } from "./colors";
import { themeNames } from "./colors";

// In v1 selection lives in memory only; Phase 3 will persist via SQLite prefs
// and rehydrate at boot. The shape of useThemeSwitcher() will not change.

const listeners = new Set<() => void>();
let currentName: ThemeName = (UnistylesRuntime.themeName ?? "paper") as ThemeName;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(name: ThemeName) {
  currentName = name;
  for (const cb of listeners) cb();
}

export function useThemeSwitcher() {
  // useUnistyles() ensures the component re-renders when the theme switches.
  useUnistyles();

  const name = useSyncExternalStore(
    subscribe,
    () => currentName,
    () => currentName,
  );

  const setTheme = useCallback((next: ThemeName) => {
    UnistylesRuntime.setTheme(next);
    notify(next);
  }, []);

  return { theme: name, setTheme, available: themeNames };
}
