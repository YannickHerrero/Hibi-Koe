import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Meta } from "../../ui";

const STEP_MS = 100;

type Props = {
  valueMs: number;
  onChange: (next: number) => void;
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

// Per-track subtitle offset. Negative values render subtitles earlier;
// positive values delay them. Stepped in 100ms increments to keep the
// thumb-friendly target large.
export function OffsetControl({ valueMs, onChange }: Props) {
  const adjust = (delta: number) => onChange(valueMs + delta);

  return (
    <View style={styles.row}>
      <Step label="−1s" onPress={() => adjust(-1000)} />
      <Step label="−100ms" onPress={() => adjust(-STEP_MS)} />
      <View style={styles.value}>
        <Meta>{format(valueMs)}</Meta>
      </View>
      <Step label="+100ms" onPress={() => adjust(STEP_MS)} />
      <Step label="+1s" onPress={() => adjust(1000)} />
      {valueMs !== 0 ? <Step label="Reset" onPress={() => onChange(0)} /> : null}
    </View>
  );
}

function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.step}>
      <Meta style={styles.stepLabel}>{label}</Meta>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.space.s2,
  },
  step: {
    paddingVertical: theme.space.s2,
    paddingHorizontal: theme.space.s3,
    borderWidth: 1,
    borderColor: theme.colors.ink,
  },
  stepLabel: {
    color: theme.colors.ink,
  },
  value: {
    flex: 1,
    alignItems: "center",
  },
}));
