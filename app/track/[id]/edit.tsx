import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { getTrack, type Track, updateTrack } from "../../../src/db";
import {
  type AnalysisProgress,
  analyzeTrack,
  dictsAvailable,
  hasApiKey,
} from "../../../src/features/mining";
import {
  Button,
  Display,
  Field,
  Label,
  Meta,
  Rule,
  SafeAreaView,
  SerifText,
} from "../../../src/ui";

function formatPhase(p: AnalysisProgress | null): string {
  if (!p) return "Preparing analysis…";
  switch (p.phase) {
    case "starting":
      return "Starting analysis…";
    case "loading-dictionaries":
      return "Loading JMdict + JMnedict…";
    case "warming-tokenizer":
      return "Warming up the tokenizer…";
    case "tokenizing":
      return `Tokenizing ${p.processed} / ${p.total} cues…`;
    case "translating":
      return `Translating ${p.translated} / ${p.total} cues…`;
    case "saving":
      return "Saving analysis…";
    case "done":
      return "Done.";
  }
}

export default function EditTrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [reqs, setReqs] = useState<{ key: boolean; dict: boolean }>({ key: false, dict: false });

  useEffect(() => {
    Promise.all([hasApiKey(), dictsAvailable()])
      .then(([key, dict]) => setReqs({ key, dict }))
      .catch((err) => console.error("[track-edit] mining-reqs probe failed", err));
  }, []);

  useEffect(() => {
    if (!id) return;
    getTrack(id).then((t) => {
      if (t) {
        setTrack(t);
        setTitle(t.title);
        setArtist(t.artist ?? "");
        setSource(t.source ?? "");
      } else {
        setError("Track not found.");
      }
    });
  }, [id]);

  const onAnalyze = async () => {
    if (!track?.subtitlePath) return;
    setError(null);
    setAnalyzing(true);
    try {
      const updated = await analyzeTrack({
        trackId: track.id,
        subtitlePath: track.subtitlePath,
        onProgress: setAnalysisProgress,
      });
      // Refresh track row with completed state.
      const next = await getTrack(track.id);
      if (next) setTrack(next);
      setAnalyzing(false);
      setAnalysisProgress(null);
      console.log("[track-edit] analysis written", updated.cues.length, "cues");
    } catch (err) {
      console.error("[track-edit] analyzeTrack failed", err);
      setError(err instanceof Error ? err.message : String(err));
      setAnalyzing(false);
      const next = await getTrack(track.id);
      if (next) setTrack(next);
    }
  };

  const onSave = async () => {
    if (!track) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateTrack(track.id, {
        title: trimmed,
        artist: artist.trim() || null,
        source: source.trim() || null,
      });
      router.back();
    } catch (err) {
      console.error("[track-edit] updateTrack failed", err);
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Meta>Cancel</Meta>
        </Pressable>
        <Meta>Edit track</Meta>
      </View>
      <Rule variant="solid" />
      <ScrollView contentContainerStyle={styles.body}>
        <Display size="lg">Edit.</Display>

        <View style={styles.section}>
          <Label>Title</Label>
          <Field value={title} onChangeText={setTitle} placeholder="Track title" />
        </View>

        <View style={styles.section}>
          <Label>Artist</Label>
          <Field value={artist} onChangeText={setArtist} placeholder="Optional" />
        </View>

        <View style={styles.section}>
          <Label>Source</Label>
          <Field
            value={source}
            onChangeText={setSource}
            placeholder='e.g. "One Piece S1E47 12:34"'
          />
        </View>

        {track?.subtitlePath ? (
          <View style={styles.section}>
            <Label>Mining analysis</Label>
            <Rule variant="soft" />
            <SerifText soft>
              {track.analysisState === "completed"
                ? "Analysis ready. Re-running replaces the existing blob."
                : track.analysisState === "failed"
                  ? `Last attempt failed: ${track.analysisError ?? "unknown"}`
                  : track.analysisState === "analyzing"
                    ? "An analysis is already running for this track."
                    : "Not analysed yet."}
            </SerifText>
            {analyzing ? (
              <SerifText italic style={styles.progress}>
                {formatPhase(analysisProgress)}
              </SerifText>
            ) : null}
            {!reqs.key || !reqs.dict ? (
              <SerifText soft italic style={styles.progress}>
                {!reqs.key && !reqs.dict
                  ? "Configure the OpenRouter key and install the dictionaries in Settings to enable analysis."
                  : !reqs.key
                    ? "Configure the OpenRouter key in Settings to enable analysis."
                    : "Install the dictionaries in Settings to enable analysis."}
              </SerifText>
            ) : null}
            <View style={styles.actions}>
              <Button onPress={onAnalyze} disabled={!track || analyzing || !reqs.key || !reqs.dict}>
                {analyzing
                  ? "Analyzing…"
                  : track.analysisState === "completed"
                    ? "Re-analyze"
                    : "Analyze"}
              </Button>
            </View>
          </View>
        ) : null}

        {error ? (
          <SerifText soft italic>
            {error}
          </SerifText>
        ) : null}

        <View style={styles.actions}>
          <Button variant="primary" onPress={onSave} disabled={!track || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </View>
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
    gap: theme.space.s5,
  },
  section: {
    gap: theme.space.s2,
  },
  actions: {
    marginTop: theme.space.s4,
  },
  progress: {
    marginTop: theme.space.s2,
  },
}));
