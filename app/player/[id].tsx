import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { getTrack, type Track } from "../../src/db";
import { TrackArtwork } from "../../src/features/library";
import {
  loadTrack,
  Scrubber,
  SpeedPicker,
  seekToMs,
  Transport,
  useCurrentTrack,
  usePlaybackProgress,
} from "../../src/features/player";
import { OffsetControl, SubtitlePane, useSubtitles } from "../../src/features/subtitles";
import { Display, Meta, Rule, SerifText } from "../../src/ui";

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const current = useCurrentTrack();
  const { positionMs, durationMs, playing, isLoaded } = usePlaybackProgress();
  const [track, setTrack] = useState<Track | null>(current?.id === id ? current : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (current?.id === id) {
      setTrack(current);
      return;
    }
    getTrack(id)
      .then((t) => {
        if (!t) {
          setError("Track not found.");
          return;
        }
        setTrack(t);
        loadTrack(t);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [id, current]);

  const subtitles = useSubtitles(track?.subtitlePath);
  const [offsetMs, setOffsetMs] = useState(track?.offsetMs ?? 0);

  useEffect(() => {
    if (track) setOffsetMs(track.offsetMs);
  }, [track]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Meta>Close</Meta>
        </Pressable>
        <Meta>Now playing</Meta>
      </View>
      <Rule variant="solid" />

      {error ? (
        <View style={styles.errorWrap}>
          <SerifText soft italic>
            {error}
          </SerifText>
        </View>
      ) : null}

      {track ? (
        <View style={styles.body}>
          <View style={styles.header}>
            <View style={styles.artworkWrap}>
              <TrackArtwork uri={track.artworkPath} title={track.title} size={160} />
            </View>
            <View style={styles.titleBlock}>
              <Display size="md">{track.title}</Display>
              {track.artist || track.source ? (
                <Meta style={styles.subline}>
                  {[track.artist, track.source].filter(Boolean).join(" · ")}
                </Meta>
              ) : null}
            </View>
          </View>

          <View style={styles.subtitlesWrap}>
            <SubtitlePane
              index={subtitles.index}
              loading={subtitles.loading}
              positionMs={positionMs}
              offsetMs={offsetMs}
              onSeek={seekToMs}
            />
          </View>

          {track.subtitlePath ? <OffsetControl valueMs={offsetMs} onChange={setOffsetMs} /> : null}

          <View style={styles.controls}>
            <Scrubber positionMs={positionMs} durationMs={durationMs} isLoaded={isLoaded} />
            <Transport playing={playing} isLoaded={isLoaded} />
            <SpeedPicker />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.space.s5,
    paddingVertical: theme.space.s4,
  },
  errorWrap: {
    paddingHorizontal: theme.space.s5,
    paddingVertical: theme.space.s4,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s4,
    paddingBottom: theme.space.s5,
    gap: theme.space.s4,
  },
  header: {
    flexDirection: "row",
    gap: theme.space.s4,
    alignItems: "center",
  },
  artworkWrap: {},
  titleBlock: {
    flex: 1,
    gap: theme.space.s1,
  },
  subline: {
    marginTop: theme.space.s1,
  },
  subtitlesWrap: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.ruleSoft,
  },
  controls: {
    gap: theme.space.s4,
    paddingTop: theme.space.s2,
  },
}));
