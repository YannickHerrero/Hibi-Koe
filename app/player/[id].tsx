import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { getTrack, type Track, updateTrack } from "../../src/db";
import { TrackArtwork } from "../../src/features/library";
import {
  type AnalyzedCue,
  DictionaryPopup,
  type DictMatch,
  MiningSheet,
  useAnalysis,
} from "../../src/features/mining";
import {
  loadTrack,
  PlayerSettingsModal,
  Scrubber,
  seekToMs,
  Transport,
  useCurrentTrack,
  usePlaybackProgress,
} from "../../src/features/player";
import { SubtitlePane, useSubtitles } from "../../src/features/subtitles";
import { Display, Meta, Rule, SafeAreaView, SerifText } from "../../src/ui";

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
      .catch((err) => {
        console.error("[player] getTrack failed", err);
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [id, current]);

  const subtitles = useSubtitles(track?.subtitlePath);
  const [offsetMs, setOffsetMs] = useState(track?.offsetMs ?? 0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [miningOpen, setMiningOpen] = useState(false);
  const [dictTarget, setDictTarget] = useState<{
    cue: AnalyzedCue;
    tokenIndex: number;
    matches: DictMatch[];
  } | null>(null);
  const analysis = useAnalysis(track?.analysisState === "completed" ? track.id : null);

  const onPlayLine = (startMs: number, endMs: number) => {
    seekToMs(startMs);
    void endMs;
  };
  const onTokenSelect = (cue: AnalyzedCue, tokenIndex: number, matches: DictMatch[]) => {
    setDictTarget({ cue, tokenIndex, matches });
  };

  useEffect(() => {
    if (track) setOffsetMs(track.offsetMs);
  }, [track]);

  // Debounce-write the offset back to the DB so rapid taps coalesce
  // into one UPDATE.
  useEffect(() => {
    if (!track) return;
    if (offsetMs === track.offsetMs) return;
    const handle = setTimeout(() => {
      updateTrack(track.id, { offsetMs }).catch((err) => {
        console.warn("Failed to persist subtitle offset", err);
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [offsetMs, track]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Meta>Close</Meta>
        </Pressable>
        <Pressable onPress={() => setSettingsOpen(true)} hitSlop={12}>
          <Meta style={styles.settings}>Settings</Meta>
        </Pressable>
      </View>
      <Rule variant="solid" />

      <PlayerSettingsModal
        visible={settingsOpen}
        offsetMs={track?.subtitlePath ? offsetMs : null}
        onChangeOffset={setOffsetMs}
        onClose={() => setSettingsOpen(false)}
      />

      <MiningSheet
        visible={miningOpen}
        analysis={analysis.analysis}
        positionMs={positionMs}
        onClose={() => setMiningOpen(false)}
        onPlayLine={onPlayLine}
        onTokenSelect={onTokenSelect}
      />

      <DictionaryPopup
        visible={dictTarget !== null}
        cue={dictTarget?.cue ?? null}
        tokenIndex={dictTarget?.tokenIndex ?? 0}
        matches={dictTarget?.matches ?? []}
        track={track}
        onClose={() => setDictTarget(null)}
      />

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

          <View style={styles.controls}>
            <Scrubber positionMs={positionMs} durationMs={durationMs} isLoaded={isLoaded} />
            {track.analysisState === "completed" ? (
              <View style={styles.mineRow}>
                <Pressable onPress={() => setMiningOpen(true)} hitSlop={8}>
                  <Meta style={styles.mineLabel}>Mine</Meta>
                </Pressable>
              </View>
            ) : null}
            <Transport playing={playing} isLoaded={isLoaded} />
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
  settings: {
    color: theme.colors.accent,
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
  mineRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: theme.space.s1,
  },
  mineLabel: {
    color: theme.colors.accent,
  },
}));
