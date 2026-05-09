// Ported from Pureyaa src/onboarding/convert.ts.
//
// Walks the parsed jmdict-simplified / jmnedict-simplified JSON shape
// and produces our DictBundle (index Map + entries Map). Yields back
// to the event loop every YIELD_EVERY items so the install UI can
// repaint progress.

import type { DictBundle, DictEntry, DictSense } from "./types";

type RawGloss = {
  text: string;
  lang?: string;
};

type RawSense = {
  partOfSpeech?: string[];
  field?: string[];
  misc?: string[];
  gloss?: RawGloss[];
};

type RawTranslation = {
  type?: string[];
  translation?: RawGloss[];
  lang?: string;
};

type RawWordCommon = {
  text: string;
  common?: boolean;
};

type RawJmdictWord = {
  id: string;
  kanji: RawWordCommon[];
  kana: RawWordCommon[];
  sense: RawSense[];
};

type RawJmnedictWord = {
  id: string;
  kanji: RawWordCommon[];
  kana: RawWordCommon[];
  translation?: RawTranslation[];
};

function pickEnglishGloss(glosses: RawGloss[]): string[] {
  const eng = glosses.filter((g) => g.lang === "eng" || !g.lang);
  return (eng.length > 0 ? eng : glosses).map((g) => g.text);
}

function pickEnglishTranslation(items: RawGloss[]): string[] {
  const eng = items.filter((t) => t.lang === "eng" || !t.lang);
  return (eng.length > 0 ? eng : items).map((t) => t.text);
}

function pushIndex(index: Map<string, number[]>, key: string, id: number): void {
  if (!key) return;
  const list = index.get(key);
  if (list) {
    if (!list.includes(id)) list.push(id);
  } else {
    index.set(key, [id]);
  }
}

export type ItemProgress = (current: number, total: number) => void;

// Yield to the event loop every N items so the UI can repaint progress.
// Each yield is one frame (~16 ms on RN); 5000 keeps total overhead under
// ~1.5 s for the largest dict (~750k entries).
const YIELD_EVERY = 5000;

const yieldToEventLoop = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function convertJmdict(
  words: RawJmdictWord[],
  onProgress?: ItemProgress,
): Promise<DictBundle> {
  const index = new Map<string, number[]>();
  const entries = new Map<number, DictEntry>();
  const total = words.length;

  for (let i = 0; i < total; i++) {
    const w = words[i];
    const id = Number(w.id);
    if (!Number.isFinite(id)) continue;

    const forms = w.kanji.map((k) => k.text);
    const readings = w.kana.map((k) => k.text);
    const isCommon = w.kanji.some((k) => k.common) || w.kana.some((k) => k.common);

    const senses: DictSense[] = w.sense.map((s) => {
      const out: DictSense = {
        pos: s.partOfSpeech ?? [],
        glosses: pickEnglishGloss(s.gloss ?? []),
      };
      if (s.field && s.field.length > 0) out.fields = s.field;
      if (s.misc && s.misc.length > 0) out.misc = s.misc;
      return out;
    });

    const entry: DictEntry = { id, forms, readings, senses };
    if (isCommon) entry.frequency = "common";

    entries.set(id, entry);
    for (const f of forms) pushIndex(index, f, id);
    for (const r of readings) pushIndex(index, r, id);

    if (i % YIELD_EVERY === 0) {
      onProgress?.(i, total);
      await yieldToEventLoop();
    }
  }

  onProgress?.(total, total);
  return { index, entries };
}

export async function convertJmnedict(
  words: RawJmnedictWord[],
  onProgress?: ItemProgress,
): Promise<DictBundle> {
  const index = new Map<string, number[]>();
  const entries = new Map<number, DictEntry>();
  const total = words.length;

  for (let i = 0; i < total; i++) {
    const w = words[i];
    const id = Number(w.id);
    if (!Number.isFinite(id)) continue;

    const forms = w.kanji.map((k) => k.text);
    const readings = w.kana.map((k) => k.text);

    const senses: DictSense[] = [];
    const nameTypes = new Set<string>();
    for (const t of w.translation ?? []) {
      const types = t.type ?? [];
      for (const ty of types) nameTypes.add(ty);
      senses.push({
        pos: types,
        glosses: pickEnglishTranslation(t.translation ?? []),
      });
    }

    const entry: DictEntry = { id, forms, readings, senses };
    if (nameTypes.size > 0) entry.nameType = Array.from(nameTypes);

    entries.set(id, entry);
    for (const f of forms) pushIndex(index, f, id);
    for (const r of readings) pushIndex(index, r, id);

    if (i % YIELD_EVERY === 0) {
      onProgress?.(i, total);
      await yieldToEventLoop();
    }
  }

  onProgress?.(total, total);
  return { index, entries };
}
