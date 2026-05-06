import Slider from "@react-native-community/slider";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Meta } from "../../ui";
import { seekToMs } from "./store";

type Props = {
  positionMs: number;
  durationMs: number;
  isLoaded: boolean;
};

function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Scrubber({ positionMs, durationMs, isLoaded }: Props) {
  const { theme } = useUnistyles();
  const [draggingValue, setDraggingValue] = useState<number | null>(null);
  // Touching the slider gives us fractional control; mirror playback otherwise.
  const isDragging = useRef(false);

  useEffect(() => {
    if (!isDragging.current) {
      setDraggingValue(null);
    }
  }, []);

  const value = draggingValue ?? positionMs;
  const remaining = Math.max(0, durationMs - value);

  return (
    <View style={styles.wrap}>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={Math.max(1, durationMs)}
        value={value}
        disabled={!isLoaded || durationMs <= 0}
        minimumTrackTintColor={theme.colors.ink}
        maximumTrackTintColor={theme.colors.ruleSoft}
        thumbTintColor={theme.colors.ink}
        onSlidingStart={() => {
          isDragging.current = true;
        }}
        onValueChange={(v) => setDraggingValue(v)}
        onSlidingComplete={(v) => {
          isDragging.current = false;
          setDraggingValue(null);
          seekToMs(v);
        }}
      />
      <View style={styles.row}>
        <Meta>{formatTime(value)}</Meta>
        <Meta>−{formatTime(remaining)}</Meta>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: {
    gap: theme.space.s1,
  },
  slider: {
    width: "100%",
    height: 28,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
}));
