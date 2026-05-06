import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { getTrack, type Track } from "../../src/db";
import { TrackArtwork } from "../../src/features/library";
import {
  loadTrack,
  Scrubber,
  SpeedPicker,
  Transport,
  useCurrentTrack,
  usePlaybackProgress,
} from "../../src/features/player";
import { Display, Label, Meta, Rule, SerifText } from "../../src/ui";

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

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Meta>Close</Meta>
        </Pressable>
        <Meta>Now playing</Meta>
      </View>
      <Rule variant="solid" />
      <ScrollView contentContainerStyle={styles.body}>
        {error ? (
          <SerifText soft italic>
            {error}
          </SerifText>
        ) : null}

        {track ? (
          <>
            <View style={styles.artworkWrap}>
              <TrackArtwork uri={track.artworkPath} title={track.title} size={240} />
            </View>

            <View style={styles.titleBlock}>
              <Display size="md">{track.title}</Display>
              {track.artist || track.source ? (
                <Meta style={styles.subline}>
                  {[track.artist, track.source].filter(Boolean).join(" · ")}
                </Meta>
              ) : null}
            </View>

            <Scrubber positionMs={positionMs} durationMs={durationMs} isLoaded={isLoaded} />

            <Transport playing={playing} isLoaded={isLoaded} />

            <View style={styles.speedSection}>
              <Label num="№ 01">Speed</Label>
              <Rule variant="soft" style={styles.speedRule} />
              <SpeedPicker />
            </View>
          </>
        ) : null}
      </ScrollView>
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
  body: {
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s6,
    paddingBottom: theme.space.s8,
    gap: theme.space.s6,
  },
  artworkWrap: {
    alignItems: "center",
    paddingVertical: theme.space.s4,
  },
  titleBlock: {
    gap: theme.space.s2,
  },
  subline: {
    marginTop: theme.space.s1,
  },
  speedSection: {
    gap: theme.space.s2,
  },
  speedRule: {
    marginTop: theme.space.s1,
    marginBottom: theme.space.s2,
  },
}));
