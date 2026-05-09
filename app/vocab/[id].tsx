import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { getSavedWord, getTrack, type SavedWord, type Track } from "../../src/db";
import { playTrackAt } from "../../src/features/player";
import { Display, Label, Meta, Rule, SafeAreaView, SerifText } from "../../src/ui";

export default function VocabDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [word, setWord] = useState<SavedWord | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const w = await getSavedWord(id);
        if (!w) {
          setError("Vocabulary entry not found.");
          return;
        }
        setWord(w);
        const t = await getTrack(w.trackId);
        setTrack(t);
      } catch (err) {
        console.error("[vocab-detail] load failed", err);
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [id]);

  const onPlayLine = () => {
    if (!word || !track) return;
    playTrackAt(track, word.audioStartMs, word.audioEndMs);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Meta>Close</Meta>
        </Pressable>
        <Meta>Vocabulary</Meta>
      </View>
      <Rule variant="solid" />

      <ScrollView contentContainerStyle={styles.body}>
        {error ? (
          <SerifText soft italic>
            {error}
          </SerifText>
        ) : word ? (
          <>
            <View>
              <Display size="lg">{word.surface}</Display>
              {word.reading && word.reading !== word.surface ? (
                <Meta style={styles.reading}>{word.reading}</Meta>
              ) : null}
              {word.lemma && word.lemma !== word.surface ? (
                <Meta style={styles.lemma}>Lemma · {word.lemma}</Meta>
              ) : null}
            </View>

            {word.glosses.length > 0 ? (
              <View style={styles.section}>
                <Label num="№ 01">Glosses</Label>
                <Rule variant="soft" style={styles.rule} />
                {word.glosses.map((g, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: ordered, positional
                  <SerifText key={`g-${i}`}>• {g}</SerifText>
                ))}
                {word.pos ? <Meta style={styles.pos}>{word.pos}</Meta> : null}
              </View>
            ) : null}

            <View style={styles.section}>
              <Label num="№ 02">Source</Label>
              <Rule variant="soft" style={styles.rule} />
              <SerifText size={18}>{word.sentenceJp}</SerifText>
              {word.sentenceEn ? (
                <SerifText soft italic style={styles.translation}>
                  {word.sentenceEn}
                </SerifText>
              ) : null}
              {word.grammarNote ? (
                <SerifText size={15} soft style={styles.translation}>
                  {word.grammarNote}
                </SerifText>
              ) : null}
            </View>

            {track ? (
              <View style={styles.section}>
                <Label num="№ 03">Track</Label>
                <Rule variant="soft" style={styles.rule} />
                <SerifText>{track.title}</SerifText>
                <View style={styles.actions}>
                  <Pressable onPress={onPlayLine} style={styles.playBtn} hitSlop={6}>
                    <Meta style={styles.playLabel}>▶ Play line</Meta>
                  </Pressable>
                </View>
              </View>
            ) : (
              <SerifText soft italic>
                The source track for this entry has been deleted; audio playback is unavailable.
              </SerifText>
            )}
          </>
        ) : (
          <SerifText soft italic>
            Loading…
          </SerifText>
        )}
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
    paddingTop: theme.space.s5,
    paddingBottom: theme.space.s8,
    gap: theme.space.s5,
  },
  reading: {
    color: theme.colors.inkSoft,
    marginTop: theme.space.s1,
  },
  lemma: {
    color: theme.colors.inkFaint,
    marginTop: theme.space.s1,
  },
  section: {
    gap: theme.space.s2,
  },
  rule: {
    marginVertical: theme.space.s1,
  },
  pos: {
    color: theme.colors.accent,
    marginTop: theme.space.s2,
  },
  translation: {
    marginTop: theme.space.s2,
  },
  actions: {
    flexDirection: "row",
    paddingTop: theme.space.s3,
  },
  playBtn: {
    paddingHorizontal: theme.space.s5,
    paddingVertical: theme.space.s3,
    backgroundColor: theme.colors.ink,
  },
  playLabel: {
    color: theme.colors.paper,
  },
}));
