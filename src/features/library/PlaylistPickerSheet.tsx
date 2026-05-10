// Multi-select sheet for adding a track to one or more playlists.
// Opens on top of TrackContextSheet ("Add to playlist…" row).
//
// Toggle a row → immediate add/remove (no batch save). Inline
// "+ New playlist" prompt at the bottom creates and adds in one step.

import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  addTrackToPlaylist,
  createPlaylist,
  listPlaylists,
  listPlaylistsForTrack,
  type Playlist,
  removeTrackFromPlaylist,
  type Track,
} from "../../db";
import { Display, Field, Meta, Rule, SerifText } from "../../ui";

type Props = {
  track: Track | null;
  visible: boolean;
  onClose: () => void;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const FADE_DURATION = 200;
const SLIDE_DURATION = 260;

export function PlaylistPickerSheet({ track, visible, onClose }: Props) {
  const [mounted, setMounted] = useState(visible);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: FADE_DURATION, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: SLIDE_DURATION, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: FADE_DURATION, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: SLIDE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, opacity, translateY]);

  useEffect(() => {
    if (!visible || !track) return;
    Promise.all([listPlaylists(), listPlaylistsForTrack(track.id)])
      .then(([all, members]) => {
        setPlaylists(all);
        setMemberIds(new Set(members.map((p) => p.id)));
      })
      .catch((err) => console.error("[playlists] picker load failed", err));
  }, [visible, track]);

  const toggle = async (playlist: Playlist) => {
    if (!track || busy) return;
    setBusy(true);
    const isMember = memberIds.has(playlist.id);
    const next = new Set(memberIds);
    if (isMember) next.delete(playlist.id);
    else next.add(playlist.id);
    setMemberIds(next);
    try {
      if (isMember) await removeTrackFromPlaylist(playlist.id, track.id);
      else await addTrackToPlaylist(playlist.id, track.id);
    } catch (err) {
      console.error("[playlists] toggle failed", err);
      // revert optimistic flip
      setMemberIds(memberIds);
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async () => {
    if (!track || !newName.trim() || busy) return;
    setBusy(true);
    try {
      const created = await createPlaylist(newName);
      await addTrackToPlaylist(created.id, track.id);
      setPlaylists((prev) => [created, ...prev]);
      setMemberIds((prev) => {
        const next = new Set(prev);
        next.add(created.id);
        return next;
      });
      setNewName("");
    } catch (err) {
      console.error("[playlists] create failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={styles.backdropTouchable} onPress={onClose}>
          <Pressable onPress={() => {}}>
            <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
              <View style={styles.headerRow}>
                <Display size="md">Add to playlist</Display>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Meta style={styles.close}>Done</Meta>
                </Pressable>
              </View>
              <Rule variant="solid" style={styles.rule} />

              <ScrollView style={styles.list}>
                {playlists.length === 0 ? (
                  <SerifText soft italic style={styles.empty}>
                    No playlists yet. Create one below.
                  </SerifText>
                ) : (
                  playlists.map((p) => (
                    <Pressable key={p.id} style={styles.row} onPress={() => toggle(p)} hitSlop={6}>
                      <Meta style={memberIds.has(p.id) ? styles.checked : styles.unchecked}>
                        {memberIds.has(p.id) ? "✓" : "○"}
                      </Meta>
                      <SerifText style={styles.rowText}>{p.name}</SerifText>
                      <Meta style={styles.count}>{p.trackCount}</Meta>
                    </Pressable>
                  ))
                )}
              </ScrollView>

              <Rule variant="soft" style={styles.softRule} />
              <View style={styles.createRow}>
                <Field
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="New playlist name"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <Pressable onPress={onCreate} hitSlop={6} disabled={!newName.trim() || busy}>
                  <Meta style={newName.trim() ? styles.create : styles.createDisabled}>
                    + New
                  </Meta>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdropTouchable: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.paper,
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s5,
    paddingBottom: theme.space.s7,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink,
    gap: theme.space.s4,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  close: {
    color: theme.colors.accent,
  },
  rule: {
    marginTop: theme.space.s1,
  },
  list: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  empty: {
    paddingVertical: theme.space.s4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.space.s3,
    gap: theme.space.s3,
  },
  rowText: {
    flex: 1,
  },
  checked: {
    color: theme.colors.accent,
  },
  unchecked: {
    color: theme.colors.inkFaint,
  },
  count: {
    color: theme.colors.inkFaint,
  },
  softRule: {
    marginVertical: theme.space.s1,
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.s3,
  },
  create: {
    color: theme.colors.accent,
  },
  createDisabled: {
    color: theme.colors.inkFaint,
  },
}));
