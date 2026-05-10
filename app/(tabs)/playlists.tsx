import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { createPlaylist, type Playlist } from "../../src/db";
import { usePlaylists } from "../../src/features/playlists";
import { Display, Field, Label, Masthead, Meta, Rule, SafeAreaView, SerifText } from "../../src/ui";

export default function PlaylistsScreen() {
  const { playlists, error, refresh } = usePlaylists();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const isEmpty = playlists !== null && playlists.length === 0;

  const onCreate = async () => {
    if (!name.trim()) return;
    try {
      const created = await createPlaylist(name);
      setName("");
      setCreating(false);
      refresh();
      router.push(`/playlist/${created.id}` as never);
    } catch (err) {
      console.error("[playlists] create failed", err);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <Masthead right="№ 03 · Playlists" />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Label num="№ 01">Playlists</Label>
          <Pressable onPress={() => setCreating((v) => !v)} hitSlop={12}>
            <Meta style={styles.action}>{creating ? "Cancel" : "+ New"}</Meta>
          </Pressable>
        </View>
        <Rule variant="solid" style={styles.rule} />

        {creating ? (
          <View style={styles.createRow}>
            <Field
              value={name}
              onChangeText={setName}
              placeholder="Playlist name"
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Pressable onPress={onCreate} hitSlop={6} disabled={!name.trim()}>
              <Meta style={name.trim() ? styles.action : styles.disabled}>Create</Meta>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <SerifText soft italic>
            {error}
          </SerifText>
        ) : null}

        {isEmpty ? (
          <View style={styles.empty}>
            <Display size="lg">No playlists yet.</Display>
            <SerifText soft italic style={styles.emptyHint}>
              Create one above, or add a track to a playlist from the Library long-press menu.
            </SerifText>
          </View>
        ) : (
          <FlatList
            data={playlists ?? []}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => <PlaylistRow playlist={item} />}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function PlaylistRow({ playlist }: { playlist: Playlist }) {
  return (
    <Pressable onPress={() => router.push(`/playlist/${playlist.id}` as never)} style={styles.row}>
      <View style={styles.rowText}>
        <SerifText size={18}>{playlist.name}</SerifText>
        <Meta style={styles.count}>
          {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"}
        </Meta>
      </View>
      <Meta style={styles.chevron}>›</Meta>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  safe: { flex: 1, backgroundColor: theme.colors.paper },
  body: { flex: 1, paddingHorizontal: theme.space.s5, paddingTop: theme.space.s7 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rule: {
    marginTop: theme.space.s3,
    marginBottom: theme.space.s4,
  },
  action: { color: theme.colors.accent },
  disabled: { color: theme.colors.inkFaint },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.s3,
    marginBottom: theme.space.s4,
  },
  empty: {
    paddingTop: theme.space.s6,
    gap: theme.space.s3,
  },
  emptyHint: { maxWidth: 280 },
  list: { paddingBottom: theme.space.s8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.space.s3,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ruleSoft,
  },
  rowText: { flex: 1, gap: 2 },
  count: { color: theme.colors.inkFaint },
  chevron: { color: theme.colors.inkFaint, fontSize: 18 },
}));
