import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { Track } from "../../db";
import { Meta, SerifText } from "../../ui";
import { TrackArtwork } from "./TrackArtwork";

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type Props = {
  track: Track;
  onPress: (track: Track) => void;
  onLongPress?: (track: Track) => void;
};

export function TrackRow({ track, onPress, onLongPress }: Props) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => onPress(track)}
      onLongPress={onLongPress ? () => onLongPress(track) : undefined}
    >
      <TrackArtwork uri={track.artworkPath} title={track.title} size={56} />
      <View style={styles.text}>
        <SerifText size={18} numberOfLines={1}>
          {track.title}
        </SerifText>
        {track.artist || track.source ? (
          <Meta numberOfLines={1} style={styles.subline}>
            {[track.artist, track.source].filter(Boolean).join(" · ")}
          </Meta>
        ) : null}
      </View>
      <Meta>{formatDuration(track.durationMs)}</Meta>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.s4,
    paddingVertical: theme.space.s3,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ruleSoft,
  },
  text: {
    flex: 1,
    gap: theme.space.s1,
  },
  subline: {
    marginTop: theme.space.s1,
  },
}));
