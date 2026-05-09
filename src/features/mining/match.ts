// For each token position try the longest compound (up to 5 tokens)
// first, falling back to shorter spans. Two flavours of match are
// emitted:
//
//   • Surface match — the literal concatenation of token surfaces
//     looked up in JMdict / JMnedict. Catches compound nouns
//     ("大学院", "機械学習") and any phrase that's a dict entry.
//
//   • Conjugated-head match — a span where the FIRST token is a verb
//     or i-adjective and every following token is an auxiliary verb
//     or particle. We look up the FIRST token's lemma (kuromoji's
//     basic_form) and emit a match for that, with the span covering
//     the whole conjugated form. This is what makes tapping "食わ"
//     in "食わない" surface 食う as a 2-token match instead of just
//     a 1-token lemma match — closer to Yomitan's deconjugation.
//
// On the single-token case we also try the lemma directly (covers
// stand-alone conjugated forms with no trailing aux).
//
// Output map keyed by start-token-index, list sorted longest-first;
// surface beats lemma on ties; jmdict beats jmnedict.

import { lookup } from "./dict";
import type { DictMatch, Token } from "./types";

const COMPOUND_WINDOW = 5;

const VERB_LIKE_POS = new Set(["動詞", "形容詞"]);
const AUX_LIKE_POS = new Set(["助動詞", "助詞"]);

function isConjugatedHead(slice: Token[]): boolean {
  if (slice.length < 2) return false;
  if (!VERB_LIKE_POS.has(slice[0].pos)) return false;
  for (let i = 1; i < slice.length; i++) {
    if (!AUX_LIKE_POS.has(slice[i].pos)) return false;
  }
  return true;
}

export function buildMatches(tokens: Token[]): Record<number, DictMatch[]> {
  const out: Record<number, DictMatch[]> = {};
  for (let i = 0; i < tokens.length; i++) {
    const matches: DictMatch[] = [];
    const maxSpan = Math.min(COMPOUND_WINDOW, tokens.length - i);
    for (let span = maxSpan; span >= 1; span--) {
      const slice = tokens.slice(i, i + span);
      const surfaceForm = slice.map((t) => t.surface).join("");
      pushMatch(matches, surfaceForm, "surface", i, i + span - 1);

      // Conjugated-head: first is a verb / adjective, rest are aux.
      // Look up the first token's dictionary form.
      if (span >= 2 && isConjugatedHead(slice)) {
        const headLemma = slice[0].lemma;
        if (headLemma && headLemma !== surfaceForm) {
          pushMatch(matches, headLemma, "lemma", i, i + span - 1);
        }
      }

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

// Returns every DictMatch whose tokenSpan covers `tokenIndex`, regardless
// of where the span starts. So tapping a token that lives inside a
// multi-token compound (e.g. ない inside 食わない) surfaces the compound
// match too, not only matches that start at that exact position.
//
// Sorted longest-first; ties: surface before lemma; jmdict before
// jmnedict — same ordering as buildMatches' per-position lists.
export function getMatchesCoveringToken(
  matchesByTokenIndex: Record<number, DictMatch[]>,
  tokenIndex: number,
): DictMatch[] {
  const seen = new Set<string>();
  const out: DictMatch[] = [];
  for (const key of Object.keys(matchesByTokenIndex)) {
    const list = matchesByTokenIndex[Number(key)];
    if (!list) continue;
    for (const m of list) {
      if (m.tokenSpan[0] <= tokenIndex && tokenIndex <= m.tokenSpan[1]) {
        const id = `${m.dict}:${m.form}:${m.tokenSpan[0]}:${m.tokenSpan[1]}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(m);
      }
    }
  }
  out.sort((a, b) => {
    const lenA = a.tokenSpan[1] - a.tokenSpan[0];
    const lenB = b.tokenSpan[1] - b.tokenSpan[0];
    if (lenA !== lenB) return lenB - lenA;
    if (a.source !== b.source) return a.source === "surface" ? -1 : 1;
    return a.dict === b.dict ? 0 : a.dict === "jmdict" ? -1 : 1;
  });
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
  // Skip duplicates: same form at the same span produced twice (e.g.
  // a verb whose lemma equals its surface).
  if (out.some((m) => m.form === form && m.tokenSpan[0] === start && m.tokenSpan[1] === end)) {
    return;
  }
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
