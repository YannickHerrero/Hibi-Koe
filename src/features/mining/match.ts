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
//     the whole conjugated form. Closer to Yomitan's deconjugation.
//
// On the single-token case we also try the lemma directly (covers
// stand-alone conjugated forms with no trailing aux).
//
// The matcher is async because the dict lives in SQLite. We
// pre-collect every candidate form per cue and run two batched
// lookups (one per dict), so the cost is two queries per cue
// regardless of token count.

import { lookupBatch } from "./dict";
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

type Candidate = {
  form: string;
  source: "surface" | "lemma";
  start: number;
  end: number;
};

export async function buildMatches(tokens: Token[]): Promise<Record<number, DictMatch[]>> {
  // Collect every (form, source, span) we'd want to look up, then run
  // one batched lookup per dict to resolve all of them in a single
  // SQLite round trip per dict.
  const candidates: Candidate[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const maxSpan = Math.min(COMPOUND_WINDOW, tokens.length - i);
    for (let span = maxSpan; span >= 1; span--) {
      const slice = tokens.slice(i, i + span);
      const surfaceForm = slice.map((t) => t.surface).join("");
      if (surfaceForm) {
        candidates.push({ form: surfaceForm, source: "surface", start: i, end: i + span - 1 });
      }
      if (span >= 2 && isConjugatedHead(slice)) {
        const headLemma = slice[0].lemma;
        if (headLemma && headLemma !== surfaceForm) {
          candidates.push({ form: headLemma, source: "lemma", start: i, end: i + span - 1 });
        }
      }
      if (span === 1) {
        const lemma = slice[0].lemma;
        if (lemma && lemma !== surfaceForm) {
          candidates.push({ form: lemma, source: "lemma", start: i, end: i + span - 1 });
        }
      }
    }
  }

  const formSet = new Set<string>();
  for (const c of candidates) formSet.add(c.form);
  const forms = Array.from(formSet);

  const [jmdict, jmnedict] = await Promise.all([
    lookupBatch(forms, "jmdict"),
    lookupBatch(forms, "jmnedict"),
  ]);

  const out: Record<number, DictMatch[]> = {};
  for (const c of candidates) {
    const jm = jmdict.get(c.form);
    if (jm && jm.length > 0) {
      pushUnique(out, c.start, {
        tokenSpan: [c.start, c.end],
        form: c.form,
        source: c.source,
        dict: "jmdict",
        entryIds: jm,
      });
    }
    const jn = jmnedict.get(c.form);
    if (jn && jn.length > 0) {
      pushUnique(out, c.start, {
        tokenSpan: [c.start, c.end],
        form: c.form,
        source: c.source,
        dict: "jmnedict",
        entryIds: jn,
      });
    }
  }

  for (const startStr of Object.keys(out)) {
    const list = out[Number(startStr)];
    if (!list) continue;
    list.sort((a, b) => {
      const lenA = a.tokenSpan[1] - a.tokenSpan[0];
      const lenB = b.tokenSpan[1] - b.tokenSpan[0];
      if (lenA !== lenB) return lenB - lenA;
      if (a.source !== b.source) return a.source === "surface" ? -1 : 1;
      return a.dict === b.dict ? 0 : a.dict === "jmdict" ? -1 : 1;
    });
  }
  return out;
}

function pushUnique(bucket: Record<number, DictMatch[]>, start: number, match: DictMatch): void {
  let list = bucket[start];
  if (!list) {
    list = [];
    bucket[start] = list;
  }
  if (
    list.some(
      (m) =>
        m.form === match.form &&
        m.dict === match.dict &&
        m.tokenSpan[0] === match.tokenSpan[0] &&
        m.tokenSpan[1] === match.tokenSpan[1],
    )
  ) {
    return;
  }
  list.push(match);
}

// Returns every DictMatch whose tokenSpan covers `tokenIndex`, regardless
// of where the span starts. So tapping a token that lives inside a
// multi-token compound (e.g. ない inside 食わない) surfaces the compound
// match too, not only matches that start at that exact position.
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
