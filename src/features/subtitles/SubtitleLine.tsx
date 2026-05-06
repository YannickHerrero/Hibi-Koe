import { Pressable, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type Props = {
  text: string;
  active: boolean;
  onPress?: () => void;
};

// One row in the subtitle pane. Active row is rendered in serif body
// at full ink; inactive rows are sans-light at ink-faint to recede.
export function SubtitleLine({ text, active, onPress }: Props) {
  styles.useVariants({ active: active ? "yes" : "no" });
  return (
    <Pressable onPress={onPress} style={styles.wrap} hitSlop={4}>
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

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
