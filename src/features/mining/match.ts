// Ported from Pureyaa src/analysis/match.ts. Pure function over the
// dictionary singleton in dict.ts: for each token position try the
// longest possible compound (5 tokens) down to a single token, and on
// the single-token case also try the lemma form. Sort results so the
// longest match is first; surface beats lemma; jmdict beats jmnedict.

import { lookup } from "./dict";
import type { DictMatch, Token } from "./types";

const COMPOUND_WINDOW = 5;

export function buildMatches(tokens: Token[]): Record<number, DictMatch[]> {
  const out: Record<number, DictMatch[]> = {};
  for (let i = 0; i < tokens.length; i++) {
    const matches: DictMatch[] = [];
    const maxSpan = Math.min(COMPOUND_WINDOW, tokens.length - i);
    for (let span = maxSpan; span >= 1; span--) {
      const slice = tokens.slice(i, i + span);
      const surfaceForm = slice.map((t) => t.surface).join("");
      pushMatch(matches, surfaceForm, "surface", i, i + span - 1);
      if (span === 1) {
        const lemma = slice[0].lemma;
        if (lemma && lemma !== surfaceForm) {
          pushMatch(matches, lemma, "lemma", i, i + span - 1);
        }
      }
    }
    if (matches.length > 0) {
      // longest-first; ties: surface before lemma; jmdict before jmnedict
      matches.sort((a, b) => {
        const lenA = a.tokenSpan[1] - a.tokenSpan[0];
        const lenB = b.tokenSpan[1] - b.tokenSpan[0];
        if (lenA !== lenB) return lenB - lenA;
        if (a.source !== b.source) return a.source === "surface" ? -1 : 1;
        return a.dict === b.dict ? 0 : a.dict === "jmdict" ? -1 : 1;
      });
      out[i] = matches;
    }
  }
  return out;
}

function pushMatch(
  out: DictMatch[],
  form: string,
  source: "surface" | "lemma",
  start: number,
  end: number,
): void {
  if (!form) return;
  const jmdictHits = lookup(form, "jmdict");
  if (jmdictHits.length > 0) {
    out.push({
      tokenSpan: [start, end],
      form,
      source,
      dict: "jmdict",
      entryIds: jmdictHits,
    });
  }
  const jmnedictHits = lookup(form, "jmnedict");
  if (jmnedictHits.length > 0) {
    out.push({
      tokenSpan: [start, end],
      form,
      source,
      dict: "jmnedict",
      entryIds: jmnedictHits,
    });
  }
}
