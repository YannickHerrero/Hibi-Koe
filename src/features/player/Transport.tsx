import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { skipBy, togglePlay } from "./store";

const SKIP_MS = 15_000;

type Props = {
  playing: boolean;
  isLoaded: boolean;
};

export function Transport({ playing, isLoaded }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.skip}
        onPress={() => skipBy(-SKIP_MS)}
        disabled={!isLoaded}
        hitSlop={8}
      >
        <Text style={styles.skipLabel}>−15s</Text>
      </Pressable>

      <Pressable style={styles.play} onPress={togglePlay} disabled={!isLoaded} hitSlop={8}>
        <Text style={styles.playLabel}>{playing ? "Pause" : "Play"}</Text>
      </Pressable>

      <Pressable
        style={styles.skip}
        onPress={() => skipBy(SKIP_MS)}
        disabled={!isLoaded}
        hitSlop={8}
      >
        <Text style={styles.skipLabel}>+15s</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.s5,
  },
  skip: {
    paddingHorizontal: theme.space.s4,
    paddingVertical: theme.space.s3,
  },
  skipLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.mono.md,
    color: theme.colors.ink,
    letterSpacing: theme.typography.mono.md * theme.tracking.mono,
    textTransform: "uppercase",
  },
  play: {
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.space.s4,
    paddingHorizontal: theme.space.s6,
    backgroundColor: theme.colors.ink,
  },
  playLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.mono.sm,
    color: theme.colors.paper,
    letterSpacing: theme.typography.mono.sm * theme.tracking.monoWide,
    textTransform: "uppercase",
  },
}));
