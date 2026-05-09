import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import {
  type PickedAudio,
  type PickedSubtitle,
  pickAudio,
  pickSubtitle,
  saveTrack,
} from "../src/features/import";
import { Button, Display, Label, Meta, Rule, SerifText } from "../src/ui";

export default function ImportScreen() {
  const [audio, setAudio] = useState<PickedAudio | null>(null);
  const [subtitle, setSubtitle] = useState<PickedSubtitle | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickAudio = async () => {
    setError(null);
    try {
      const result = await pickAudio();
      if (result) setAudio(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onPickSubtitle = async () => {
    setError(null);
    try {
      const result = await pickSubtitle();
      if (result) setSubtitle(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onSave = async () => {
    if (!audio) return;
    setError(null);
    setSaving(true);
    try {
      await saveTrack({ audio, subtitle });
      router.replace("/");
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
        <Meta>New track</Meta>
      </View>
      <Rule variant="solid" />
      <ScrollView contentContainerStyle={styles.body}>
        <Display size="lg">Import.</Display>

        <View style={styles.section}>
          <Label num="№ 01">Audio</Label>
          <Rule variant="soft" style={styles.rule} />
          {audio ? (
            <SerifText>{audio.name}</SerifText>
          ) : (
            <SerifText soft italic>
              Pick an audio file to begin.
            </SerifText>
          )}
          <View style={styles.action}>
            <Button onPress={onPickAudio}>{audio ? "Replace audio" : "Pick audio"}</Button>
          </View>
        </View>

        <View style={styles.section}>
          <Label num="№ 02">Subtitle</Label>
          <Rule variant="soft" style={styles.rule} />
          {subtitle ? (
            <SerifText>{subtitle.name}</SerifText>
          ) : (
            <SerifText soft italic>
              Optional. Pick a matching .srt file.
            </SerifText>
          )}
          <View style={styles.action}>
            <Button onPress={onPickSubtitle}>
              {subtitle ? "Replace subtitle" : "Pick subtitle"}
            </Button>
          </View>
        </View>

        {error ? (
          <View style={styles.error}>
            <Meta style={styles.errorLabel}>Error</Meta>
            <SerifText>{error}</SerifText>
          </View>
        ) : null}

        <View style={styles.save}>
          <Button variant="primary" onPress={onSave} disabled={!audio || saving}>
            {saving ? "Saving…" : "Save to library"}
          </Button>
          {saving ? <ActivityIndicator style={styles.spinner} /> : null}
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
    gap: theme.space.s7,
  },
  section: {
    gap: theme.space.s2,
  },
  rule: {
    marginTop: theme.space.s1,
    marginBottom: theme.space.s2,
  },
  action: {
    marginTop: theme.space.s3,
  },
  save: {
    marginTop: theme.space.s4,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.s3,
  },
  spinner: {
    marginLeft: theme.space.s2,
  },
  error: {
    paddingTop: theme.space.s3,
    gap: theme.space.s2,
  },
  errorLabel: {
    color: theme.colors.accent,
  },
}));
