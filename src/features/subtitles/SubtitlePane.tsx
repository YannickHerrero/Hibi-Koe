import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { SerifText } from "../../ui";
import type { CueIndex } from "./cueIndex";
import { findActiveCue } from "./cueIndex";
import { SubtitleLine } from "./SubtitleLine";

type Props = {
  index: CueIndex | null;
  loading?: boolean;
  positionMs: number;
  offsetMs?: number;
  onSeek?: (ms: number) => void;
};

export function SubtitlePane({ index, loading, positionMs, offsetMs = 0, onSeek }: Props) {
  if (loading) {
    return (
      <View style={styles.empty}>
        <SerifText soft italic>
          Loading subtitles…
        </SerifText>
      </View>
    );
  }
  if (!index || index.cues.length === 0) {
    return (
      <View style={styles.empty}>
        <SerifText soft italic>
          No subtitles for this track.
        </SerifText>
      </View>
    );
  }

  const adjusted = positionMs - offsetMs;
  const activeIdx = findActiveCue(index, adjusted);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {index.cues.map((cue, i) => (
        <SubtitleLine
          key={`${cue.startMs}-${cue.index}`}
          text={cue.text}
          active={i === activeIdx}
          onPress={onSeek ? () => onSeek(cue.startMs + offsetMs) : undefined}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: theme.space.s4,
  },
  empty: {
    paddingVertical: theme.space.s5,
    alignItems: "center",
  },
}));
