# Hibi Koe

> 声 — voice. Passive-listening immersion player for the Hibi ecosystem.

Import an audio file with a matching SRT subtitle and Hibi Koe renders a Spotify-style now-playing view with subtitles synced in real time. Built for Japanese listening immersion; the design system is [Torakaa](../Torakaa%20Design%20System.html).

## Status

v0.2 — adds sentence-mining (kuromoji + JMdict popup + LLM translations + a saved-words list). Android-first.

## Features

**Player**
- Import `.mp3`, `.m4a`, `.flac`, etc. plus a `.srt` subtitle file
- Local library backed by SQLite; tracks copied into the app sandbox
- Editorial player screen: artwork, scrubber, play / pause, 0.5×–2× speed,
  loop and random-track-on-finish toggles
- Auto-scrolling subtitle pane with the active line highlighted in serif
- Tap any subtitle line to seek to that cue
- ±100ms / ±1s offset control per track + 5 user-saved offset presets
- Background audio + Android lockscreen / notification controls
- Five Torakaa themes (paper / stone / sage / clay / ink), persisted

**Mining (v0.2)**
- One-time setup in Settings: paste an OpenRouter API key + install JMdict / JMnedict
- On import, the wizard tokenises every cue with kuromoji, dictionary-matches
  each token (longest-first, jmdict + jmnedict), and runs a context-aware
  Claude Sonnet pass for English translations + grammar notes
- A **Mine** button appears under the player transport when a track is analysed:
  bottom sheet with the active line tokenised (with optional furigana), translation,
  grammar note, prev/next, and Play line
- Tap a token → Yomitan-style popup with longest-match tabs and per-sense
  glosses; ★ Save writes the word into a local vocabulary list
- Settings → Vocabulary lists every saved entry; tap for source / track detail,
  long-press to delete, header action exports the whole list as JSON

## Quickstart

```bash
pnpm install
pnpm start              # Expo dev server (Metro)
pnpm android            # build + run on a connected Android device or emulator
```

A custom dev client is required (the app uses native modules — `expo-audio`,
`expo-sqlite`, `react-native-unistyles`, `react-native-reanimated`,
`react-native-nitro-modules`, `kuromoji-react-native`, `expo-secure-store`).
Expo Go is not supported.

## Setting up mining

1. Open Settings → **Mining**.
2. Paste your [OpenRouter](https://openrouter.ai) API key into the field and tap **Save**. The key is stored in `expo-secure-store` (never in SQLite or AsyncStorage).
3. Tap **Set up dictionaries**. The app fetches the latest jmdict-simplified release from GitHub (`scriptin/jmdict-simplified`) and converts both JMdict and JMnedict into per-app bundles under `Paths.document/dict/`. Allow ~30–60 s; you'll see staged progress.
4. Import a track with a `.srt`. The wizard now runs a tokenise → dictionary-match → context-aware translate pipeline before returning to the library.
5. Open the track in the player, tap **Mine** under the transport row. Tap any token in the bottom sheet to open the dictionary popup; ★ Save writes it to your vocabulary.

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
  (tabs)/index.tsx        library — track list (entry point)
  (tabs)/settings.tsx     theme + mining + vocab + storage + about
  player/[id].tsx         full-screen modal player
  import.tsx              import wizard
  track/[id]/edit.tsx     rename / re-analyse modal
  vocab.tsx               saved-words list (mined entries)
  vocab/[id].tsx          saved-word detail
src/
  audio/                  global session config
  db/                     sqlite client + tracks / prefs / saved_words repos
  features/
    library/              row, list hook, context menu
    player/               singleton store, hooks, transport, scrubber
    subtitles/            SRT parser, cue index, pane, offset control
    import/               pickers, sandbox copy, metadata probe, save flow
    settings/             theme picker, mining section, storage usage
    mining/               kuromoji + JMdict + LLM + DictionaryPopup +
                          MiningSheet + saved-word hooks
    updates/              UpdatePrompt — OTA notification via useUpdates
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
