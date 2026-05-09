// Extracts unique kanji characters from a focus word for the
// KanjiEntry[] field on a Hibi card. We don't have meaning or WaniKani
// level on this side; the Hibi backend can enrich those later.

import type { KanjiEntry } from "hibi-client";

const KANJI_RE = /[㐀-䶿一-鿿豈-﫿]/;

export function extractKanjiList(focusWord: string): KanjiEntry[] {
  const seen = new Set<string>();
  const out: KanjiEntry[] = [];
  for (const ch of focusWord) {
    if (!KANJI_RE.test(ch) || seen.has(ch)) continue;
    seen.add(ch);
    out.push({ kanji: ch, meaning: "", wanikaniLevel: null });
  }
  return out;
}
