import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { getOffsetPresets, type OffsetPresets, setOffsetPresets } from "../../db";
import { Display, Label, Meta, Rule } from "../../ui";
import { OffsetControl } from "../subtitles/OffsetControl";
import { OffsetPresetSlot } from "../subtitles/OffsetPresetSlot";
import { SpeedPicker } from "./SpeedPicker";

type Props = {
  visible: boolean;
  // null when the current track has no subtitles; the delay sections
  // are then hidden and only the Speed control is shown.
  offsetMs: number | null;
  onChangeOffset: (next: number) => void;
  onClose: () => void;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const FADE_DURATION = 200;
const SLIDE_DURATION = 260;

export function PlayerSettingsModal({ visible, offsetMs, onChangeOffset, onClose }: Props) {
  const valueMs = offsetMs ?? 0;
  const hasSubtitles = offsetMs !== null;
  const [presets, setPresets] = useState<OffsetPresets | null>(null);
  // Mount the Modal a bit longer than `visible` so we can play the
  // outgoing animation before unmounting.
  const [mounted, setMounted] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Load on first open; subsequent opens reuse cached state.
  useEffect(() => {
    if (!visible || presets) return;
    getOffsetPresets()
      .then(setPresets)
      .catch((err) => console.error("[subtitle-settings] getOffsetPresets failed", err));
  }, [visible, presets]);

  // Drive backdrop fade and sheet slide independently.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: SLIDE_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
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

  const persist = useCallback((next: OffsetPresets) => {
    setPresets(next);
    setOffsetPresets(next).catch((err) =>
      console.error("[subtitle-settings] setOffsetPresets failed", err),
    );
  }, []);

  const onApply = useCallback(
    (ms: number) => {
      onChangeOffset(ms);
    },
    [onChangeOffset],
  );

  const onSave = useCallback(
    (slotIndex: number) => {
      const next = (presets ?? []).slice();
      while (next.length < 5) next.push(null);
      next[slotIndex] = valueMs;
      persist(next);
    },
    [presets, valueMs, persist],
  );

  const onClear = useCallback(
    (slotIndex: number) => {
      const next = (presets ?? []).slice();
      while (next.length < 5) next.push(null);
      next[slotIndex] = null;
      persist(next);
    },
    [presets, persist],
  );

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={styles.backdropTouchable} onPress={onClose}>
          {/* Stop propagation: taps on the sheet shouldn't close it. */}
          <Pressable onPress={() => {}}>
            <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
              <View style={styles.headerRow}>
                <Display size="md">Settings</Display>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Meta style={styles.close}>Done</Meta>
                </Pressable>
              </View>
              <Rule variant="solid" style={styles.rule} />

              <View style={styles.section}>
                <Label num="№ 01">Speed</Label>
                <Rule variant="soft" style={styles.softRule} />
                <SpeedPicker />
              </View>

              {hasSubtitles ? (
                <>
                  <View style={styles.section}>
                    <Label num="№ 02">Subtitle delay</Label>
                    <Rule variant="soft" style={styles.softRule} />
                    <OffsetControl valueMs={valueMs} onChange={onChangeOffset} />
                  </View>

                  <View style={styles.section}>
                    <Label num="№ 03">Delay presets</Label>
                    <Rule variant="soft" style={styles.softRule} />
                    <View style={styles.slots}>
                      {(presets ?? Array.from({ length: 5 }, () => null)).map((slotValue, i) => (
                        <OffsetPresetSlot
                          // biome-ignore lint/suspicious/noArrayIndexKey: slot position IS the identity
                          key={`slot-${i}`}
                          index={i}
                          valueMs={slotValue}
                          onApply={onApply}
                          onSave={onSave}
                          onClear={onClear}
                        />
                      ))}
                    </View>
                    <Meta style={styles.hint}>Tap to apply · long-press to clear</Meta>
                  </View>
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
    gap: theme.space.s5,
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
    marginTop: theme.space.s2,
  },
  section: {
    gap: theme.space.s3,
  },
  softRule: {
    marginTop: theme.space.s1,
    marginBottom: theme.space.s2,
  },
  slots: {
    flexDirection: "row",
    gap: theme.space.s2,
  },
  hint: {
    marginTop: theme.space.s2,
  },
}));
