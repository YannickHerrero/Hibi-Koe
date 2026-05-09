import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { getTrack, type Track, updateTrack } from "../../../src/db";
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

export default function EditTrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <View style={styles.body}>
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
      </View>
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
    flex: 1,
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s6,
    gap: theme.space.s5,
  },
  section: {
    gap: theme.space.s2,
  },
  actions: {
    marginTop: theme.space.s4,
  },
}));
