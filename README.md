# Hibi Koe

> 声 — voice. Passive-listening immersion player for the Hibi ecosystem.

Import an audio file and a matching SRT subtitle, and the player renders a Spotify-style now-playing view with subtitles synced in real time. Designed for Japanese listening immersion; the design system is [Torakaa](../Torakaa%20Design%20System.html).

## Status

v0 — pre-release. See `CLAUDE.md` for stack and conventions.

## Quickstart

```bash
pnpm install
pnpm start         # Expo dev server
pnpm android       # build + run on Android device/emulator
```

## Scripts

| Script | Purpose |
|---|---|
| `pnpm start` | Expo dev server |
| `pnpm android` | run on Android |
| `pnpm lint` | Biome check |
| `pnpm format` | Biome format |
| `pnpm fix` | Biome check + write fixes |
| `pnpm typecheck` | TypeScript no-emit |
