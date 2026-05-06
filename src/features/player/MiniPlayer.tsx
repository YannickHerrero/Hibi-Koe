import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Meta, SerifText } from "../../ui";
import { TrackArtwork } from "../library/TrackArtwork";
import { useCurrentTrack, usePlaybackProgress } from "./hooks";
import { togglePlay } from "./store";

// Persistent footer that appears whenever a track is loaded into the
// playback store. Tap the row to open the full-screen player; the right
// affordance toggles play/pause without leaving the current screen.
export function MiniPlayer() {
  const track = useCurrentTrack();
  const { playing, isLoaded } = usePlaybackProgress();

  if (!track) return null;

  return (
    <View style={styles.bar}>
      <Pressable style={styles.row} onPress={() => router.push(`/player/${track.id}`)} hitSlop={4}>
        <TrackArtwork uri={track.artworkPath} title={track.title} size={40} />
        <View style={styles.text}>
          <SerifText size={15} numberOfLines={1}>
            {track.title}
          </SerifText>
          <Meta numberOfLines={1}>{playing ? "Playing" : isLoaded ? "Paused" : "Loading…"}</Meta>
        </View>
      </Pressable>
      <Pressable style={styles.toggle} onPress={togglePlay} disabled={!isLoaded} hitSlop={8}>
        <Meta style={styles.toggleLabel}>{playing ? "Pause" : "Play"}</Meta>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.space.s5,
    paddingVertical: theme.space.s3,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink,
    backgroundColor: theme.colors.paper,
    gap: theme.space.s4,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.s3,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  toggle: {
    paddingHorizontal: theme.space.s3,
    paddingVertical: theme.space.s2,
    borderWidth: 1,
    borderColor: theme.colors.ink,
  },
  toggleLabel: {
    color: theme.colors.ink,
  },
}));
