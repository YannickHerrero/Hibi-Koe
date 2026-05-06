import { Image, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type Props = {
  uri?: string | null;
  title: string;
  size?: number;
};

const SIZES = {
  sm: 48,
  md: 64,
  lg: 240,
} as const;

function initialOf(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "·";
  // Use the first non-whitespace code point so emoji + non-Latin scripts work too.
  return [...trimmed][0] ?? "·";
}

export function TrackArtwork({ uri, title, size = SIZES.md }: Props) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size }]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[styles.placeholder, { width: size, height: size }]}>
      <Text style={[styles.initial, { fontSize: size * 0.5 }]}>{initialOf(title)}</Text>
      <View style={styles.dot} />
    </View>
  );
}

export const ArtworkSizes = SIZES;

const styles = StyleSheet.create((theme) => ({
  image: {
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderColor: theme.colors.ink,
  },
  placeholder: {
    borderWidth: 1,
    borderColor: theme.colors.ink,
    backgroundColor: theme.colors.paperAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initial: {
    fontFamily: theme.fonts.serif,
    color: theme.colors.ink,
    lineHeight: undefined,
  },
  dot: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 6,
    height: 6,
    backgroundColor: theme.colors.accent,
  },
}));
