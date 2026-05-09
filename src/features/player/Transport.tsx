import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { usePlayback } from "./hooks";
import { toggleLoopMode, togglePlay, toggleRandomMode } from "./store";

type Props = {
  playing: boolean;
  isLoaded: boolean;
};

// Random / Play / Loop. The skip-15s buttons are gone; users wanted
// shuffle and repeat instead, which fit the passive-listening loop:
// random picks the next track from the library on finish, loop
// replays the current track natively via expo-audio's player.loop.
export function Transport({ playing, isLoaded }: Props) {
  const { loopMode, randomMode } = usePlayback();

  return (
    <View style={styles.row}>
      <ToggleButton label="Random" active={randomMode} onPress={toggleRandomMode} />

      <Pressable style={styles.play} onPress={togglePlay} disabled={!isLoaded} hitSlop={8}>
        <Text style={styles.playLabel}>{playing ? "Pause" : "Play"}</Text>
      </Pressable>

      <ToggleButton label="Loop" active={loopMode} onPress={toggleLoopMode} />
    </View>
  );
}

function ToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  toggleStyles.useVariants({ active: active ? "yes" : "no" });
  return (
    <Pressable style={toggleStyles.btn} onPress={onPress} hitSlop={8}>
      <Text style={toggleStyles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.s5,
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

const toggleStyles = StyleSheet.create((theme) => ({
  btn: {
    borderWidth: 1,
    paddingVertical: theme.space.s3,
    paddingHorizontal: theme.space.s4,
    variants: {
      active: {
        yes: {
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.ink,
        },
        no: {
          borderColor: theme.colors.ink,
          backgroundColor: "transparent",
        },
      },
    },
  },
  label: {
    fontFamily: theme.fonts.mono,
    fontSize: 10.5,
    letterSpacing: 10.5 * theme.tracking.monoWide,
    textTransform: "uppercase",
    variants: {
      active: {
        yes: { color: theme.colors.paper },
        no: { color: theme.colors.ink },
      },
    },
  },
}));
