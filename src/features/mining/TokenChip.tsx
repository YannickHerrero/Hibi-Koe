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
// Tokens with no kanji (already kana) skip the row to keep visual noise
// down — we only show readings ON TOP of kanji.
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

// One pressable subtitle token. Renders surface in serif on a paper-alt
// chip; furigana sits above on a smaller mono line, ink-soft.
// Active = currently selected (post-tap), gets an accent underline.
// HasMatch = at least one dictionary hit at this token, which earns
// a small accent dot in the corner so the user can target words that
// will return real results.
export function TokenChip({ token, index, showFurigana, hasMatch, active, onPress }: Props) {
  const reading = showFurigana && hasKanji(token.surface) ? toHiragana(token.reading) : null;
  styles.useVariants({ active: active ? "yes" : "no" });
  return (
    <Pressable onPress={() => onPress(index)} style={styles.chip} hitSlop={2}>
      {reading ? <Text style={styles.reading}>{reading}</Text> : null}
      <Text style={styles.surface}>{token.surface}</Text>
      {hasMatch ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    paddingHorizontal: theme.space.s2,
    paddingVertical: theme.space.s1,
    backgroundColor: theme.colors.paperAlt,
    borderWidth: 1,
    alignItems: "center",
    variants: {
      active: {
        yes: { borderColor: theme.colors.accent },
        no: { borderColor: theme.colors.ruleSoft },
      },
    },
  },
  reading: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.mono.xs,
    color: theme.colors.inkSoft,
    letterSpacing: theme.typography.mono.xs * theme.tracking.mono,
  },
  surface: {
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    color: theme.colors.ink,
    lineHeight: 28,
  },
  dot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 4,
    height: 4,
    backgroundColor: theme.colors.accent,
  },
}));
