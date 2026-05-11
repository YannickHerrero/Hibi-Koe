import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { WordStatus } from "../../db";
import type { Token } from "./types";

// 'unknown' is the implicit default for any token with a dict match
// the user hasn't classified.
export type TokenWordStatus = WordStatus | "unknown";

type Props = {
  token: Token;
  index: number;
  showFurigana: boolean;
  hasMatch: boolean;
  // Drives the underline opacity. Tokens without a dict match never
  // underline regardless of status. Defaults to 'unknown' so callers
  // that haven't yet wired status through still render correctly.
  status?: TokenWordStatus;
  active: boolean;
  onPress: (index: number) => void;
};

// Convert katakana code points to hiragana for furigana rendering.
function toHiragana(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCharCode(code - 0x60);
    } else {
      out += s[i];
    }
  }
  return out;
}

function hasKanji(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0x4e00 && code <= 0x9fff) return true;
    if (code >= 0x3400 && code <= 0x4dbf) return true;
  }
  return false;
}

// One subtitle token rendered as inline-style text — no border, no
// background. Tokens flow horizontally and wrap on long lines, so the
// cue reads as natural Japanese rather than a row of buttons.
//
// Visual cues, all subtle:
//   • furigana in a small mono row above the surface (kanji only)
//   • a 2px accent bar under tokens that have a dict match AND aren't
//     classified known/ignored. Opacity encodes status:
//       unknown  → 1.0   (full underline)
//       learning → 0.35  (faded underline)
//       known    → 0     (no underline)
//       ignored  → 0     (no underline)
//   • active state colours the surface in accent (set after tap, while
//     the dictionary popup is open)
export function TokenChip({
  token,
  index,
  showFurigana,
  hasMatch,
  status = "unknown",
  active,
  onPress,
}: Props) {
  const reading = showFurigana && hasKanji(token.surface) ? toHiragana(token.reading) : null;
  // NB: variant key is 'mark', not 'underline' — Unistyles 3 treats a
  // variant key that collides with a sibling style-object key as a
  // no-op (we hit this in hibi-yomi), so deliberately picked a name
  // distinct from the 'underline' style below.
  styles.useVariants({
    active: active ? "yes" : "no",
    mark:
      !hasMatch || status === "known" || status === "ignored"
        ? "off"
        : status === "learning"
          ? "learning"
          : "unknown",
  });
  return (
    <Pressable onPress={() => onPress(index)} style={styles.col} hitSlop={2}>
      {/* Always render the reading row so adjacent tokens with and
          without furigana share the same baseline. Empty space is a
          non-breaking thin character so RN doesn't collapse the row. */}
      <Text style={styles.reading}>{reading ?? " "}</Text>
      <Text style={styles.surface}>{token.surface}</Text>
      <View style={styles.underline} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  col: {
    alignItems: "center",
  },
  reading: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.mono.xs,
    color: theme.colors.inkSoft,
    letterSpacing: theme.typography.mono.xs * theme.tracking.mono,
  },
  surface: {
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    lineHeight: 28,
    variants: {
      active: {
        yes: { color: theme.colors.accent },
        no: { color: theme.colors.ink },
      },
      mark: { off: {}, unknown: {}, learning: {} },
    },
  },
  underline: {
    height: 2,
    alignSelf: "stretch",
    backgroundColor: theme.colors.accent,
    variants: {
      active: { yes: {}, no: {} },
      mark: {
        off: { backgroundColor: "transparent", opacity: 0 },
        unknown: { opacity: 1 },
        learning: { opacity: 0.35 },
      },
    },
  },
}));
