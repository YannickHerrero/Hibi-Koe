# Hibi Koe — Claude Code conventions

Mobile passive-listening immersion app for the Hibi ecosystem. Audio + subtitle playback, no mining or dictionary in v1.

## Stack

- Expo SDK 55 (RN 0.83, React 19.2, New Architecture only)
- TypeScript, expo-router (file-based routing)
- expo-audio for playback (with background mode + Android MediaSession)
- expo-sqlite for library + preferences
- Unistyles 2.0 for theming (Torakaa tokens)
- Biome for lint/format, pnpm for package management

## Design system

- Foundations: **Torakaa Design System** (5 variants: paper, stone, sage, clay, ink). Default: `paper`.
- Hibi extensions reference: `/home/yannick/dev/Hibi/DESIGN_SYSTEM.md` (sentence/furigana/review components — not used in Koe v1).
- Always reference theme tokens by name (`colors.accent`, `space.s4`), never raw values.
- Editorial vibe: hairline rules, sharp corners, accent used sparingly, numbers in serif Newsreader, labels in mono Geist Mono uppercase with wide tracking.

## Repo layout (target)

```
app/                      expo-router routes
  (tabs)/library.tsx
  (tabs)/settings.tsx
  player/[id].tsx         full-screen modal
  import.tsx              import wizard
src/
  theme/                  tokens, themes, fonts, unistyles setup
  ui/                     primitives (Rule, Label, Display, Button, ...)
  features/
    library/              repository + list components
    player/               playback hook + transport UI
    subtitles/            SRT parser, cue index, pane
    import/               pickers + sandbox copy + metadata
  db/                     sqlite client, migrations, repos
  audio/                  background mode + media session
```

## Commit style

Short imperative subject, conventional commit prefix (chore/feat/fix/docs/refactor/test). Bullet body for the *why*; the diff explains the what. Many small, atomic commits — one logical change each.

## Out of scope for v1

A-B loop, sleep timer, batch import, share-intent, multi-track subtitles, mining (popup dictionary, save-card), Hibi API integration. Add v2 in a follow-up; do not pre-plumb.
