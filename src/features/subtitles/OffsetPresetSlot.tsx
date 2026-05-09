import { Pressable, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type Props = {
  index: number;
  valueMs: number | null;
  onApply: (valueMs: number) => void;
  onSave: (index: number) => void;
  onClear: (index: number) => void;
};

function format(ms: number): string {
  const sign = ms > 0 ? "+" : ms < 0 ? "−" : "";
  const abs = Math.abs(ms);
  if (abs >= 1000) {
    const s = (abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1);
    return `${sign}${s}s`;
  }
  return `${sign}${abs}ms`;
}

// One preset slot. Empty: tap to save the current offset.
// Filled: tap to apply, long-press to clear.
export function OffsetPresetSlot({ index, valueMs, onApply, onSave, onClear }: Props) {
  const isEmpty = valueMs === null;
  styles.useVariants({ filled: isEmpty ? "no" : "yes" });

  return (
    <Pressable
      style={styles.slot}
      onPress={() => {
        if (valueMs === null) onSave(index);
        else onApply(valueMs);
      }}
      onLongPress={() => {
        if (valueMs !== null) onClear(index);
      }}
      hitSlop={4}
    >
      <Text style={styles.label}>№ {String(index + 1).padStart(2, "0")}</Text>
      <Text style={styles.value}>{isEmpty ? "Save" : format(valueMs)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  slot: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: theme.space.s3,
    paddingHorizontal: theme.space.s2,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.s1,
    variants: {
      filled: {
        yes: {
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.muted,
        },
        no: {
          borderColor: theme.colors.ruleSoft,
          backgroundColor: "transparent",
        },
      },
    },
  },
  label: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.mono.xs,
    letterSpacing: theme.typography.mono.xs * theme.tracking.monoWide,
    textTransform: "uppercase",
    variants: {
      filled: {
        yes: { color: theme.colors.inkSoft },
        no: { color: theme.colors.inkFaint },
      },
    },
  },
  value: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.mono.md,
    variants: {
      filled: {
        yes: { color: theme.colors.ink },
        no: { color: theme.colors.inkFaint },
      },
    },
  },
}));
