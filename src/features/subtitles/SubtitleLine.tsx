import { memo } from "react";
import { Pressable, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type Props = {
  cueIndex: number;
  text: string;
  active: boolean;
  // Pass the cue index back so the parent can resolve start time
  // without us closing over per-row callbacks.
  onPressCue?: (cueIndex: number) => void;
};

// One row in the subtitle pane. Active row is rendered in serif body
// at full ink; inactive rows are sans-light at ink-faint to recede.
//
// Memoised: the parent re-renders ~5×/s with playback ticks, but the
// only line whose props actually change is the one crossing the active
// boundary, so memo skips render for every other row.
function SubtitleLineImpl({ cueIndex, text, active, onPressCue }: Props) {
  styles.useVariants({ active: active ? "yes" : "no" });
  return (
    <Pressable
      onPress={onPressCue ? () => onPressCue(cueIndex) : undefined}
      style={styles.wrap}
      hitSlop={4}
    >
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

export const SubtitleLine = memo(SubtitleLineImpl);

const styles = StyleSheet.create((theme) => ({
  wrap: {
    paddingVertical: theme.space.s2,
  },
  text: {
    variants: {
      active: {
        yes: {
          fontFamily: theme.fonts.serif,
          color: theme.colors.ink,
          fontSize: 22,
          lineHeight: 22 * theme.lineHeight.serif,
        },
        no: {
          fontFamily: theme.fonts.sans,
          color: theme.colors.inkFaint,
          fontSize: 18,
          lineHeight: 18 * theme.lineHeight.sans,
        },
      },
    },
  },
}));
