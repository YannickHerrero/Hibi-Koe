import { router, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { TrackRow } from "../../src/features/library";
import { loadTrack } from "../../src/features/player";
import { usePlaylist } from "../../src/features/playlists";
import { Display, Label, Meta, Rule, SafeAreaView, SerifText } from "../../src/ui";

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { playlist, tracks, error } = usePlaylist(id);
  const isEmpty = tracks !== null && tracks.length === 0;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Meta>← Back</Meta>
        </Pressable>
        <Meta>Playlist</Meta>
      </View>
      <Rule variant="solid" />

      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <Display size="lg">{playlist?.name ?? "…"}</Display>
          <Label num="№ 01">
            {tracks ? `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}` : "Loading…"}
          </Label>
        </View>
        <Rule variant="soft" style={styles.rule} />

        {error ? (
          <SerifText soft italic>
            {error}
          </SerifText>
        ) : null}

        {isEmpty ? (
          <SerifText soft italic style={styles.empty}>
            No tracks in this playlist yet. Add one from the Library long-press menu.
          </SerifText>
        ) : (
          <FlatList
            data={tracks ?? []}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => (
              <TrackRow
                track={item}
                onPress={(t) => {
                  loadTrack(t, { kind: "playlist", playlistId: id });
                  router.push(`/player/${t.id}`);
                }}
              />
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  safe: { flex: 1, backgroundColor: theme.colors.paper },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.space.s5,
    paddingVertical: theme.space.s4,
  },
  body: { flex: 1, paddingHorizontal: theme.space.s5, paddingTop: theme.space.s5 },
  titleBlock: { gap: theme.space.s2 },
  rule: { marginVertical: theme.space.s2 },
  empty: { paddingTop: theme.space.s5, maxWidth: 320 },
  list: { paddingBottom: theme.space.s8 },
}));
