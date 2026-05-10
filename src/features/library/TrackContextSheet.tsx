// Editorial bottom sheet that replaces the native Alert.alert track
// context menu. Animation pattern lifted from PlayerSettingsModal so
// the visual rhythm matches the rest of the app.

import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { Track } from "../../db";
import { Display, Meta, Rule } from "../../ui";
import { confirmDeleteTrack } from "./deleteTrackFlow";

export type TrackSheetActions = {
  onEdit: (track: Track) => void;
  onAddToPlaylist?: (track: Track) => void;
  onDeleted: () => void;
};

type Props = {
  track: Track | null;
  visible: boolean;
  actions: TrackSheetActions;
  onClose: () => void;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const FADE_DURATION = 200;
const SLIDE_DURATION = 260;

export function TrackContextSheet({ track, visible, actions, onClose }: Props) {
  const [mounted, setMounted] = useState(visible);
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

  const onEdit = () => {
    if (!track) return;
    onClose();
    actions.onEdit(track);
  };

  const onDelete = () => {
    if (!track) return;
    onClose();
    confirmDeleteTrack(track, actions.onDeleted);
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
                  {track?.title ?? ""}
                </Display>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Meta style={styles.close}>Done</Meta>
                </Pressable>
              </View>
              <Rule variant="solid" style={styles.rule} />

              <Pressable onPress={onEdit} style={styles.row} hitSlop={6}>
                <Meta>Edit details</Meta>
              </Pressable>
              <Rule variant="soft" />

              {actions.onAddToPlaylist ? (
                <>
                  <Pressable
                    onPress={() => {
                      if (!track) return;
                      onClose();
                      actions.onAddToPlaylist?.(track);
                    }}
                    style={styles.row}
                    hitSlop={6}
                  >
                    <Meta>Add to playlist…</Meta>
                  </Pressable>
                  <Rule variant="soft" />
                </>
              ) : null}

              <Pressable onPress={onDelete} style={styles.row} hitSlop={6}>
                <Meta style={styles.destructive}>Delete</Meta>
              </Pressable>
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
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.space.s3,
  },
  close: {
    color: theme.colors.accent,
  },
  rule: {
    marginTop: theme.space.s1,
  },
  row: {
    paddingVertical: theme.space.s3,
  },
  destructive: {
    color: theme.colors.accent,
  },
}));
