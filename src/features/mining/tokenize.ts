// Ported from Pureyaa src/analysis/tokenize.ts. Two patches make
// kuromoji-react-native viable on Hermes:
//   1. The default loader uses zlibjs/bin/gunzip.min.js, which doesn't
//      expose its Zlib namespace under Hermes. Replace with pako.
//   2. TokenInfoDictionary builds target_map as a plain object with
//      ~250k integer keys; Hermes caps single objects at 196,607
//      properties. Replace with a Map wrapped in a Proxy so the
//      existing target_map[trie_id] reads continue to work.
//
// Both patches must run BEFORE the first `import('kuromoji-react-native')`
// so that the prototype mutations are visible to its internal builders.

import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import pako from "pako";
import type { Token } from "./types";

// Patch the dict loader to read bytes via expo-file-system instead of
// RN's fetch. fetch() on a file:// URL goes through the Blob bridge,
// which on Android intermittently rejects with "The specified blob
// is invalid" when the underlying blob handle is GC'd before resolve.
// File.bytesSync() reads directly through the FileSystem module.
const RNDictionaryLoader = require("kuromoji-react-native/src/loader/ReactNativeDictionaryLoader");
RNDictionaryLoader.prototype.loadArrayBuffer = (
  url: string,
  callback: (err: Error | null, buffer: ArrayBuffer | null) => void,
) => {
  const tag = `[kuromoji-load ${url.split("/").pop() ?? url}]`;
  try {
    console.log(tag, "open", url);
    const t0 = Date.now();
    const bytes = new File(url).bytesSync();
    console.log(tag, "read", bytes.byteLength, "bytes in", `${Date.now() - t0}ms`);
    const inflated = pako.ungzip(bytes);
    console.log(tag, "inflated", inflated.byteLength, "bytes");
    callback(null, inflated.buffer as ArrayBuffer);
  } catch (err) {
    console.error(tag, "failed:", err instanceof Error ? err.message : String(err), err);
    callback(err instanceof Error ? err : new Error(String(err)), null);
  }
};

const TokenInfoDictionary = require("kuromoji-react-native/src/dict/TokenInfoDictionary");
const ByteBuffer = require("kuromoji-react-native/src/util/ByteBuffer");

function mapAsTargetMap(map: Map<number, number[]>): Map<number, number[]> {
  return new Proxy(map, {
    get(target, prop) {
      // biome-ignore lint/suspicious/noExplicitAny: prototype method passthrough
      const own = (target as any)[prop];
      if (typeof own === "function") return own.bind(target);
      if (own !== undefined) return own;
      if (typeof prop === "string") {
        const n = Number(prop);
        if (Number.isFinite(n)) return target.get(n);
      }
      return undefined;
    },
    set(target, prop, value) {
      if (typeof prop === "string") {
        const n = Number(prop);
        if (Number.isFinite(n)) {
          target.set(n, value);
          return true;
        }
      }
      return false;
    },
  }) as unknown as Map<number, number[]>;
}

TokenInfoDictionary.prototype.loadTargetMap = function (array_buffer: ArrayBuffer) {
  const buffer = new ByteBuffer(array_buffer);
  buffer.position = 0;
  const map = new Map<number, number[]>();
  buffer.readInt(); // map_keys_size — informational, ignored
  while (true) {
    if (buffer.buffer.length < buffer.position + 1) break;
    const key = buffer.readInt();
    const valuesSize = buffer.readInt();
    const values: number[] = new Array(valuesSize);
    for (let i = 0; i < valuesSize; i++) {
      values[i] = buffer.readInt();
    }
    map.set(key, values);
  }
  this.target_map = mapAsTargetMap(map);
  return this;
};

interface KuromojiToken {
  surface_form: string;
  reading?: string;
  basic_form?: string;
  pos?: string;
}

interface KuromojiTokenizer {
  tokenize(text: string): KuromojiToken[];
}

const DICT_MODULES: Record<string, number> = {
  "base.dat.gz": require("kuromoji-react-native/dict/base.dat.gz"),
  "check.dat.gz": require("kuromoji-react-native/dict/check.dat.gz"),
  "tid.dat.gz": require("kuromoji-react-native/dict/tid.dat.gz"),
  "tid_pos.dat.gz": require("kuromoji-react-native/dict/tid_pos.dat.gz"),
  "tid_map.dat.gz": require("kuromoji-react-native/dict/tid_map.dat.gz"),
  "cc.dat.gz": require("kuromoji-react-native/dict/cc.dat.gz"),
  "unk.dat.gz": require("kuromoji-react-native/dict/unk.dat.gz"),
  "unk_pos.dat.gz": require("kuromoji-react-native/dict/unk_pos.dat.gz"),
  "unk_map.dat.gz": require("kuromoji-react-native/dict/unk_map.dat.gz"),
  "unk_char.dat.gz": require("kuromoji-react-native/dict/unk_char.dat.gz"),
  "unk_compat.dat.gz": require("kuromoji-react-native/dict/unk_compat.dat.gz"),
  "unk_invoke.dat.gz": require("kuromoji-react-native/dict/unk_invoke.dat.gz"),
};

let tokenizerPromise: Promise<KuromojiTokenizer> | null = null;

async function buildTokenizer(log?: (s: string) => void): Promise<KuromojiTokenizer> {
  const tag = "[kuromoji-init]";
  console.log(tag, "begin");
  log?.("resolving 12 kuromoji dict assets");
  const filenames = Object.keys(DICT_MODULES);
  const t0 = Date.now();
  const assets = await Asset.loadAsync(filenames.map((f) => DICT_MODULES[f]));
  console.log(tag, "assets resolved in", `${Date.now() - t0}ms`);
  const dicPath: Record<string, string> = {};
  filenames.forEach((f, i) => {
    const uri = assets[i].localUri ?? assets[i].uri;
    dicPath[f] = uri;
    console.log(tag, f, "→", uri);
  });

  log?.("downloading + decompressing dict files");
  const km = await import("kuromoji-react-native");
  // biome-ignore lint/suspicious/noExplicitAny: kuromoji is untyped JS
  const builder = (km as any).default ?? km;
  return await new Promise<KuromojiTokenizer>((resolve, reject) => {
    const t1 = Date.now();
    builder.builder({ dicPath }).build((err: Error | null, tokenizer: KuromojiTokenizer) => {
      if (err) {
        console.error(tag, "builder.build failed:", err.message, err);
        reject(err);
      } else {
        console.log(tag, "ready in", `${Date.now() - t1}ms`);
        log?.("tokenizer ready");
        resolve(tokenizer);
      }
    });
  });
}

export async function getTokenizer(log?: (s: string) => void): Promise<KuromojiTokenizer> {
  if (!tokenizerPromise) tokenizerPromise = buildTokenizer(log);
  return tokenizerPromise;
}

export function resetTokenizer(): void {
  tokenizerPromise = null;
}

function toKatakana(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0x3041 && code <= 0x3096) {
      out += String.fromCharCode(code + 0x60);
    } else {
      out += s[i];
    }
  }
  return out;
}

export async function tokenize(text: string): Promise<Token[]> {
  const tokenizer = await getTokenizer();
  const raw = tokenizer.tokenize(text);
  let cursor = 0;
  const tokens: Token[] = [];
  for (const t of raw) {
    const surface = t.surface_form ?? "";
    const idx = text.indexOf(surface, cursor);
    const charStart = idx >= 0 ? idx : cursor;
    const charEnd = charStart + surface.length;
    cursor = charEnd;
    tokens.push({
      surface,
      reading: toKatakana(t.reading ?? surface),
      lemma: t.basic_form && t.basic_form !== "*" ? t.basic_form : surface,
      pos: t.pos ?? "",
      charStart,
      charEnd,
    });
  }
  return tokens;
}
