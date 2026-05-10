import { router } from "expo-router";
import { FlatList, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useState } from "react";
import type { Track } from "../../src/db";
import {
  PlaylistPickerSheet,
  TrackContextSheet,
  TrackRow,
  useTrackContextSheet,
  useTracks,
} from "../../src/features/library";
import { loadTrack } from "../../src/features/player";
import { Display, Label, Masthead, Meta, Rule, SafeAreaView, SerifText } from "../../src/ui";

export default function LibraryScreen() {
  const { tracks, error, refresh } = useTracks();
  const isEmpty = tracks !== null && tracks.length === 0;
  const sheet = useTrackContextSheet();
  const [pickerTrack, setPickerTrack] = useState<Track | null>(null);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <Masthead right="№ 01 · Library" />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Label num="№ 01">Tracks</Label>
          <Pressable onPress={() => router.push("/import")} hitSlop={12}>
            <Meta style={styles.action}>+ Import</Meta>
          </Pressable>
        </View>
        <Rule variant="solid" style={styles.rule} />

        {error ? (
          <SerifText soft italic>
            {error}
          </SerifText>
        ) : null}

        {isEmpty ? (
          <View style={styles.empty}>
            <Display size="lg">A quiet shelf.</Display>
            <SerifText soft italic style={styles.emptyHint}>
              Import an audio file with a matching .srt to begin.
            </SerifText>
          </View>
        ) : (
          <FlatList
            data={tracks ?? []}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => (
              <TrackRow
                track={item}
                onPress={(t) => {
                  // Record the launched-from list before navigating so the
                  // player's auto-advance walks Library order even if the
                  // player screen short-circuits its own loadTrack call.
                  loadTrack(t, { kind: "library" });
                  router.push(`/player/${t.id}`);
                }}
                onLongPress={(t) => sheet.open(t)}
              />
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
      <TrackContextSheet
        track={sheet.track}
        visible={sheet.visible}
        onClose={sheet.close}
        actions={{
          onEdit: (target) => router.push(`/track/${target.id}/edit`),
          onAddToPlaylist: (target) => setPickerTrack(target),
          onDeleted: refresh,
        }}
      />
      <PlaylistPickerSheet
        track={pickerTrack}
        visible={pickerTrack !== null}
        onClose={() => setPickerTrack(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s7,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rule: {
    marginTop: theme.space.s3,
    marginBottom: theme.space.s4,
  },
  action: {
    color: theme.colors.accent,
  },
  empty: {
    paddingTop: theme.space.s6,
    gap: theme.space.s3,
  },
  emptyHint: {
    maxWidth: 280,
  },
  list: {
    paddingBottom: theme.space.s8,
  },
}));
