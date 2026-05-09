import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { Token } from "./types";

type Props = {
  token: Token;
  index: number;
  showFurigana: boolean;
  hasMatch: boolean;
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
//   • a 2px accent bar under tokens that have at least one dict match
//   • active state colours the surface in accent (set after tap, while
//     the dictionary popup is open)
export function TokenChip({ token, index, showFurigana, hasMatch, active, onPress }: Props) {
  const reading = showFurigana && hasKanji(token.surface) ? toHiragana(token.reading) : null;
  styles.useVariants({ active: active ? "yes" : "no", hasMatch: hasMatch ? "yes" : "no" });
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
      hasMatch: { yes: {}, no: {} },
    },
  },
  underline: {
    height: 2,
    alignSelf: "stretch",
    variants: {
      active: { yes: {}, no: {} },
      hasMatch: {
        yes: { backgroundColor: theme.colors.accent },
        no: { backgroundColor: "transparent" },
      },
    },
  },
}));
