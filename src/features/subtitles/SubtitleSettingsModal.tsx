import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { getOffsetPresets, type OffsetPresets, setOffsetPresets } from "../../db";
import { Display, Label, Meta, Rule } from "../../ui";
import { OffsetControl } from "./OffsetControl";
import { OffsetPresetSlot } from "./OffsetPresetSlot";

type Props = {
  visible: boolean;
  valueMs: number;
  onChange: (next: number) => void;
  onClose: () => void;
};

export function SubtitleSettingsModal({ visible, valueMs, onChange, onClose }: Props) {
  const [presets, setPresets] = useState<OffsetPresets | null>(null);

  // Load on first open; subsequent opens reuse cached state.
  useEffect(() => {
    if (!visible || presets) return;
    getOffsetPresets()
      .then(setPresets)
      .catch((err) => console.error("[subtitle-settings] getOffsetPresets failed", err));
  }, [visible, presets]);

  const persist = useCallback((next: OffsetPresets) => {
    setPresets(next);
    setOffsetPresets(next).catch((err) =>
      console.error("[subtitle-settings] setOffsetPresets failed", err),
    );
  }, []);

  const onApply = useCallback(
    (ms: number) => {
      onChange(ms);
    },
    [onChange],
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
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Stop propagation so taps on the sheet don't close it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.headerRow}>
            <Display size="md">Subtitle delay</Display>
            <Pressable onPress={onClose} hitSlop={12}>
              <Meta style={styles.close}>Done</Meta>
            </Pressable>
          </View>
          <Rule variant="solid" style={styles.rule} />

          <View style={styles.section}>
            <Label num="№ 01">Adjust</Label>
            <Rule variant="soft" style={styles.softRule} />
            <OffsetControl valueMs={valueMs} onChange={onChange} />
          </View>

          <View style={styles.section}>
            <Label num="№ 02">Presets</Label>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
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
