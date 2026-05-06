# Hibi Koe — Claude Code conventions

Mobile passive-listening immersion app for the Hibi ecosystem. Audio + subtitle playback, no mining or dictionary in v1.

## Stack

- Expo SDK 55 (RN 0.83, React 19.2, New Architecture only)
- TypeScript, expo-router (file-based routing, typedRoutes experiment on)
- expo-audio for playback (background mode + Android MediaSession via the
  expo-audio config plugin with `enableBackgroundPlayback: true`)
- expo-sqlite for the local library and preferences (WAL journal,
  versioned migrations under `src/db/migrations.ts`)
- Unistyles 3 for theming with the five Torakaa palettes registered in
  `src/theme/unistyles.ts`. The babel plugin runs scoped to `src/`
- @react-native-community/slider for the scrubber
- vitest for unit tests (`src/**/*.test.ts`)
- Biome for lint/format, pnpm for package management

## Design system

- Foundations: **Torakaa Design System** (5 variants: paper, stone, sage, clay, ink). Default: `paper`.
- Hibi extensions reference: `/home/yannick/dev/Hibi/DESIGN_SYSTEM.md` (sentence/furigana/review components — not used in Koe v1).
- Always reference theme tokens by name (`theme.colors.accent`, `theme.space.s4`), never raw values.
- Editorial vibe: hairline rules, sharp corners (radii ≈ 0), accent used sparingly,
  numbers / titles in Newsreader serif, labels in mono Geist Mono uppercase with wide tracking.

## Repo layout

```
app/                      expo-router routes
  _layout.tsx             root Stack + audio/db init
  (tabs)/library.tsx
  (tabs)/settings.tsx
  player/[id].tsx         full-screen modal
  import.tsx              import wizard modal
  track/[id]/edit.tsx     rename modal
src/
  audio/                  global session config (configureAudioSession)
  db/                     client, migrations, tracks repo, prefs k/v
  features/
    library/              TrackArtwork, TrackRow, list hook, context menu
    player/               singleton store, hooks, Transport, Scrubber, SpeedPicker, MiniPlayer
    subtitles/            SRT parser, cue index, pane, offset control, loader hook
    import/               document pickers, sandbox copy, metadata probe, saveTrack
    settings/             theme picker, storage usage
  theme/                  colors, tokens, fonts, themes, unistyles, useThemeSwitcher
  ui/                     primitives — Rule, Label, Meta, Display, SerifText,
                          Button, Field, SegmentedControl, Masthead
```

## Where things live

- **Singleton playback** — `src/features/player/store.ts`. Components subscribe via the
  `usePlayback*` hooks in `src/features/player/hooks.ts`.
- **Theme** — registered once in `src/theme/unistyles.ts`. Read via `useUnistyles()` or
  Unistyles' `StyleSheet.create((theme) => …)` callback. The user's selection is
  persisted via `useThemeSwitcher` ↔ the prefs table.
- **DB migrations** — append to the array in `src/db/migrations.ts` and bump the
  version number. The runner reads `schema_version`, applies new migrations inside
  an exclusive transaction, and updates the recorded version.

## Commit style

Short imperative subject, conventional commit prefix (chore/feat/fix/docs/refactor/test). Bullet body for the *why*; the diff explains the what. Many small, atomic commits — one logical change each.

## Out of scope for v1

A-B loop, sleep timer, batch import, share-intent, multi-track subtitles, mining (popup dictionary, save-card), Hibi API integration, EAS production builds. Add later; do not pre-plumb.
