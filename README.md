# Hibi Koe

> 声 — voice. Passive-listening immersion player for the Hibi ecosystem.

Import an audio file with a matching SRT subtitle and Hibi Koe renders a Spotify-style now-playing view with subtitles synced in real time. Built for Japanese listening immersion; the design system is [Torakaa](../Torakaa%20Design%20System.html).

## Status

v0.1 — Android-first MVP. Works in development. EAS / production builds are out of scope for this milestone.

## Features (v0.1)

- Import an `.mp3`, `.m4a`, `.flac`, etc. plus a `.srt` subtitle file
- Local library backed by SQLite; tracks copied into the app sandbox
- Editorial player screen: artwork, scrubber, ±15s skip, play / pause, 0.5×–2× speed
- Auto-scrolling subtitle pane with the active line highlighted in serif
- Tap any subtitle line to seek to that cue
- ±100ms / ±1s offset control per track, persisted in the DB
- Background audio + Android lockscreen / notification controls
- Five Torakaa themes (paper / stone / sage / clay / ink), persisted

## Out of scope for v0.1

A-B loop, sleep timer, batch import, share-intent, multi-track subtitles, mining (popup dictionary, save-card), Hibi API integration. All planned for v0.2 or later.

## Quickstart

```bash
pnpm install
pnpm start              # Expo dev server (Metro)
pnpm android            # build + run on a connected Android device or emulator
```

A custom dev client is required (the app uses native modules — `expo-audio`,
`expo-sqlite`, `react-native-unistyles`, `react-native-reanimated`,
`react-native-nitro-modules`). Expo Go is not supported.

## OTA updates (EAS Update)

The runtime is wired for EAS Update with a `fingerprint` runtimeVersion and
auto-check on launch. The in-app `UpdatePrompt` watches `useUpdates()` and
shows an Alert as soon as a bundle is downloaded; the user can apply now or
defer to the next cold launch.

One-time setup, run **once** against your Expo account:

```bash
npm install --global eas-cli
eas login
eas update:configure        # writes updates.url and extra.eas.projectId into app.json
```

Build a binary that knows about the channel:

```bash
eas build -p android --profile preview        # or --profile production
```

Ship a JS-only update later:

```bash
eas update --channel preview --message "Fix offset persistence"
```

The runtime checks for updates on each cold launch; once the new bundle is
downloaded the prompt appears. In the dev client the prompt is silenced
(updates only apply to release/preview builds).

## Scripts

| Script | Purpose |
|---|---|
| `pnpm start` | Metro / Expo dev server |
| `pnpm android` | Run on Android (build + install on device/emulator) |
| `pnpm test` | Vitest unit tests (parser + cue index) |
| `pnpm lint` | Biome check |
| `pnpm format` | Biome format |
| `pnpm fix` | Biome check + write fixes |
| `pnpm typecheck` | `tsc --noEmit` |

## Project layout

```
app/                      expo-router file routes
  (tabs)/library.tsx      track list (entry point)
  (tabs)/settings.tsx     theme + storage + about
  player/[id].tsx         full-screen modal player
  import.tsx              import wizard
  track/[id]/edit.tsx     rename track modal
src/
  audio/                  global session config
  db/                     sqlite client + tracks/prefs repos
  features/
    library/              row, list hook, context menu
    player/               singleton store, hooks, transport, scrubber
    subtitles/            SRT parser, cue index, pane, offset control
    import/               pickers, sandbox copy, metadata probe
    settings/             theme picker, storage usage
  theme/                  Torakaa tokens, themes, fonts, unistyles
  ui/                     primitives — Rule, Label, Display, Button, …
```

## Sample SRT

```
1
00:00:00,000 --> 00:00:03,000
Hello, world.

2
00:00:03,500 --> 00:00:06,000
This is a sample subtitle line.
```

Save as `track.srt`, import with `track.mp3`, and you're set.
