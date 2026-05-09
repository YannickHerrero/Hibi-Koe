// Heuristic filename → human title parser. Tuned for the kinds of names
// users tend to throw at us (anime / dramas / podcasts) without becoming
// a full release-name parser. Returns both the cleaned title and the
// detected episode label so callers can render them however they want.

const EXTENSIONS = new Set([
  // audio
  "mp3",
  "m4a",
  "m4b",
  "flac",
  "ogg",
  "opus",
  "wav",
  "aac",
  "wma",
  "alac",
  "ape",
  // containers (we'll often see them on stripped-audio rips)
  "mka",
  "mkv",
  "mp4",
  "mov",
  "avi",
  "webm",
]);

const RELEASE_TAGS = new Set([
  "condensed",
  "condensedaudio",
  "raw",
  "subbed",
  "dubbed",
  "bd",
  "bluray",
  "web",
  "webrip",
  "tv",
  "tvrip",
  "hdtv",
  "dvd",
  "dvdrip",
  "x264",
  "x265",
  "h264",
  "h265",
  "hevc",
  "aac",
  "ac3",
  "flac",
  "1080p",
  "720p",
  "480p",
  "2160p",
  "4k",
  "uhd",
  "hdr",
  "remux",
  "proper",
  "repack",
  "internal",
  "v2",
  "v3",
  "final",
  "uncut",
  "extended",
  "directors",
]);

export type ParsedTitle = {
  title: string;
  episodeLabel: string | null;
};

function stripPath(name: string): string {
  const idx = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
  return idx >= 0 ? name.slice(idx + 1) : name;
}

function stripTrailingTags(name: string): string {
  let current = name;
  while (true) {
    const dot = current.lastIndexOf(".");
    if (dot < 0) break;
    const tail = current.slice(dot + 1).toLowerCase();
    if (EXTENSIONS.has(tail) || RELEASE_TAGS.has(tail)) {
      current = current.slice(0, dot);
      continue;
    }
    break;
  }
  return current;
}

function stripBrackets(name: string): string {
  return name
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\{[^}]*\}/g, " ");
}

function extractEpisodeLabel(name: string): { rest: string; label: string | null } {
  // S01E02 — episode digits up to 4 to cover long-running anime
  const se = name.match(/\bS(\d{1,2})E(\d{1,4})\b/i);
  if (se) {
    const s = se[1].padStart(2, "0");
    const e = se[2].padStart(2, "0");
    return { rest: name.replace(se[0], " "), label: `S${s}E${e}` };
  }
  // 1x02
  const cross = name.match(/\b(\d{1,2})x(\d{1,4})\b/i);
  if (cross) {
    const s = cross[1].padStart(2, "0");
    const e = cross[2].padStart(2, "0");
    return { rest: name.replace(cross[0], " "), label: `S${s}E${e}` };
  }
  // Episode N / Ep N / EP N
  const ep = name.match(/\b(?:episode|ep)\s*(\d{1,4})\b/i);
  if (ep) {
    const e = ep[1].padStart(2, "0");
    return { rest: name.replace(ep[0], " "), label: `E${e}` };
  }
  return { rest: name, label: null };
}

function normaliseSeparators(name: string): string {
  return name
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(name: string): string {
  // Lowercase first so existing ALL-CAPS words don't survive; capitalise
  // the first letter of each whitespace-separated token.
  return name.toLowerCase().replace(/(?:^|\s)([\p{L}])/gu, (match) => match.toUpperCase());
}

export function parseFilename(raw: string): ParsedTitle {
  const base = stripPath(raw.trim());
  const detagged = stripTrailingTags(base);
  const debracketed = stripBrackets(detagged);
  const { rest, label } = extractEpisodeLabel(debracketed);
  const cleaned = normaliseSeparators(rest);
  const title = titleCase(cleaned) || "Untitled";
  return { title, episodeLabel: label };
}

export function formatTitle(raw: string): string {
  const { title, episodeLabel } = parseFilename(raw);
  return episodeLabel ? `${title} · ${episodeLabel}` : title;
}
