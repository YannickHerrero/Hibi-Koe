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
- expo-updates for OTA delivery; runtimeVersion policy `fingerprint`,
  channels declared in `eas.json` (development / preview / production).
  `updates.url` and `extra.eas.projectId` are filled by
  `eas update:configure`, not committed by hand.
- Mining stack: kuromoji-react-native (Hermes-patched: pako gunzip
  + target_map Proxy in `src/features/mining/tokenize.ts`),
  jmdict-simplified release loaded into Map-backed bundles under
  `Paths.document/dict/`, OpenRouter (anthropic/claude-sonnet-4.5)
  for context-aware translation via XHR-streamed JSON arrays,
  expo-secure-store for the API key.

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
    settings/             theme picker, mining section, storage usage
    mining/               kuromoji bootstrap, dict + dict-installer,
                          longest-match, OpenRouter client + LLM,
                          orchestrator, MiningSheet, DictionaryPopup,
                          TokenChip, saved-word + analysis hooks
    updates/              UpdatePrompt — OTA notification via useUpdates
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

## Out of scope (still)

A-B loop, sleep timer, batch import, share-intent, multi-track subtitles,
AnkiDroid native bridge, audio-clip extraction (cards still reference the
source track via trackId + startMs / endMs), Hibi API sync, EAS production
builds. Add later; do not pre-plumb.
