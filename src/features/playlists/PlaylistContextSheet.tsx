// Same animation pattern as TrackContextSheet. Three internal states:
// menu (Rename / Delete) → renameForm (Field + Save) → confirmDelete
// (destructive confirm row). Avoids native Alert.alert for parity with
// the rest of the editorial sheets.

import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { deletePlaylist, type Playlist, renamePlaylist } from "../../db";
import { Display, Field, Meta, Rule, SerifText } from "../../ui";

type Mode = "menu" | "rename" | "confirmDelete";

type Props = {
  playlist: Playlist | null;
  visible: boolean;
  onClose: () => void;
  // Called after a successful rename or delete so the parent list can refresh.
  onChanged: () => void;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const FADE_DURATION = 200;
const SLIDE_DURATION = 260;

export function PlaylistContextSheet({ playlist, visible, onClose, onChanged }: Props) {
  const [mounted, setMounted] = useState(visible);
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setMode("menu");
      setName(playlist?.name ?? "");
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
  }, [visible, opacity, translateY, playlist]);

  const onSubmitRename = async () => {
    if (!playlist || !name.trim() || busy) return;
    setBusy(true);
    try {
      await renamePlaylist(playlist.id, name);
      onChanged();
      onClose();
    } catch (err) {
      console.error("[playlists] rename failed", err);
    } finally {
      setBusy(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!playlist || busy) return;
    setBusy(true);
    try {
      await deletePlaylist(playlist.id);
      onChanged();
      onClose();
    } catch (err) {
      console.error("[playlists] delete failed", err);
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
                <Display size="md" numberOfLines={1}>
                  {playlist?.name ?? ""}
                </Display>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Meta style={styles.close}>Done</Meta>
                </Pressable>
              </View>
              <Rule variant="solid" style={styles.rule} />

              {mode === "menu" ? (
                <>
                  <Pressable onPress={() => setMode("rename")} style={styles.row} hitSlop={6}>
                    <Meta>Rename</Meta>
                  </Pressable>
                  <Rule variant="soft" />
                  <Pressable
                    onPress={() => setMode("confirmDelete")}
                    style={styles.row}
                    hitSlop={6}
                  >
                    <Meta style={styles.destructive}>Delete</Meta>
                  </Pressable>
                </>
              ) : null}

              {mode === "rename" ? (
                <View style={styles.formRow}>
                  <Field
                    value={name}
                    onChangeText={setName}
                    placeholder="Playlist name"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                  <Pressable onPress={onSubmitRename} hitSlop={6} disabled={!name.trim() || busy}>
                    <Meta style={name.trim() ? styles.action : styles.disabled}>Save</Meta>
                  </Pressable>
                </View>
              ) : null}

              {mode === "confirmDelete" ? (
                <>
                  <SerifText soft italic style={styles.confirm}>
                    The playlist will be deleted. The tracks themselves stay in your Library.
                  </SerifText>
                  <Pressable
                    onPress={onConfirmDelete}
                    style={styles.row}
                    hitSlop={6}
                    disabled={busy}
                  >
                    <Meta style={styles.destructive}>Confirm delete</Meta>
                  </Pressable>
                  <Rule variant="soft" />
                  <Pressable onPress={() => setMode("menu")} style={styles.row} hitSlop={6}>
                    <Meta>Cancel</Meta>
                  </Pressable>
                </>
              ) : null}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  backdropTouchable: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.colors.paper,
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s5,
    paddingBottom: theme.space.s7,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink,
    gap: theme.space.s4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.space.s3,
  },
  close: { color: theme.colors.accent },
  rule: { marginTop: theme.space.s1 },
  row: { paddingVertical: theme.space.s3 },
  destructive: { color: theme.colors.accent },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.s3,
  },
  action: { color: theme.colors.accent },
  disabled: { color: theme.colors.inkFaint },
  confirm: { paddingVertical: theme.space.s2 },
}));
