import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import { StyleSheet } from "react-native-unistyles";
import { reorderPlaylistTracks, type Track } from "../../src/db";
import { TrackRow } from "../../src/features/library";
import { loadTrack } from "../../src/features/player";
import { usePlaylist } from "../../src/features/playlists";
import { Display, Label, Meta, Rule, SafeAreaView, SerifText } from "../../src/ui";

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { playlist, tracks, error, refresh } = usePlaylist(id);
  const isEmpty = tracks !== null && tracks.length === 0;

  // While reordering we keep a local mirror of `tracks` that the drag
  // handlers mutate optimistically. On Done we persist + refresh.
  const [reorderMode, setReorderMode] = useState(false);
  const [draftTracks, setDraftTracks] = useState<Track[] | null>(null);

  useEffect(() => {
    if (reorderMode) setDraftTracks(tracks ?? []);
  }, [reorderMode, tracks]);

  const onSaveOrder = async () => {
    if (!id || !draftTracks) {
      setReorderMode(false);
      return;
    }
    try {
      await reorderPlaylistTracks(
        id,
        draftTracks.map((t) => t.id),
      );
      await refresh();
    } catch (err) {
      console.error("[playlists] reorder failed", err);
    } finally {
      setReorderMode(false);
      setDraftTracks(null);
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Track>) => (
    <Pressable
      onLongPress={drag}
      delayLongPress={150}
      style={[styles.draggableRow, isActive ? styles.dragging : null]}
    >
      <Meta style={styles.handle}>≡</Meta>
      <View style={styles.draggableRowText}>
        <SerifText size={18} numberOfLines={1}>
          {item.title}
        </SerifText>
        {item.artist ? (
          <Meta style={styles.draggableRowSubline} numberOfLines={1}>
            {item.artist}
          </Meta>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Meta>← Back</Meta>
        </Pressable>
        <Meta>Playlist</Meta>
        {tracks && tracks.length > 1 ? (
          <Pressable
            onPress={() => (reorderMode ? onSaveOrder() : setReorderMode(true))}
            hitSlop={12}
          >
            <Meta style={styles.action}>{reorderMode ? "Done" : "Reorder"}</Meta>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
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
        ) : reorderMode ? (
          <DraggableFlatList
            data={draftTracks ?? []}
            keyExtractor={(t) => t.id}
            renderItem={renderItem}
            onDragEnd={({ data }) => setDraftTracks(data)}
            contentContainerStyle={styles.list}
          />
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
    alignItems: "center",
    paddingHorizontal: theme.space.s5,
    paddingVertical: theme.space.s4,
  },
  placeholder: { width: 60 },
  action: { color: theme.colors.accent },
  body: { flex: 1, paddingHorizontal: theme.space.s5, paddingTop: theme.space.s5 },
  titleBlock: { gap: theme.space.s2 },
  rule: { marginVertical: theme.space.s2 },
  empty: { paddingTop: theme.space.s5, maxWidth: 320 },
  list: { paddingBottom: theme.space.s8 },
  draggableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.s4,
    paddingVertical: theme.space.s3,
    paddingHorizontal: theme.space.s2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ruleSoft,
    backgroundColor: theme.colors.paper,
  },
  dragging: {
    opacity: 0.6,
  },
  handle: {
    color: theme.colors.inkFaint,
    fontSize: 20,
  },
  draggableRowText: {
    flex: 1,
    gap: theme.space.s1,
  },
  draggableRowSubline: {
    marginTop: theme.space.s1,
  },
}));
