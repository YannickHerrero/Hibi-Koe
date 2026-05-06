import { useEffect, useRef } from "react";
import { FlatList, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { SerifText } from "../../ui";
import type { CueIndex } from "./cueIndex";
import { findActiveCue, findNextCue } from "./cueIndex";
import { SubtitleLine } from "./SubtitleLine";
import type { Cue } from "./srt";

type Props = {
  index: CueIndex | null;
  loading?: boolean;
  positionMs: number;
  offsetMs?: number;
  onSeek?: (ms: number) => void;
};

export function SubtitlePane({ index, loading, positionMs, offsetMs = 0, onSeek }: Props) {
  const listRef = useRef<FlatList<Cue>>(null);
  const lastScrolledIdx = useRef<number>(-1);

  const adjusted = positionMs - offsetMs;
  const activeIdx = index ? findActiveCue(index, adjusted) : -1;
  // In gaps between cues we still want to scroll forward to the upcoming line
  // so the user has reading context, not stay anchored on the last active row.
  const targetIdx = activeIdx >= 0 ? activeIdx : index ? findNextCue(index, adjusted) : -1;

  useEffect(() => {
    if (!index || targetIdx < 0) return;
    if (targetIdx === lastScrolledIdx.current) return;
    lastScrolledIdx.current = targetIdx;
    listRef.current?.scrollToIndex({
      index: targetIdx,
      animated: true,
      viewPosition: 0.4,
    });
  }, [index, targetIdx]);

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

  return (
    <FlatList
      ref={listRef}
      data={index.cues}
      keyExtractor={(cue) => `${cue.startMs}-${cue.index}`}
      renderItem={({ item, index: i }) => (
        <SubtitleLine
          text={item.text}
          active={i === activeIdx}
          onPress={onSeek ? () => onSeek(item.startMs + offsetMs) : undefined}
        />
      )}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScrollToIndexFailed={(info) => {
        // FlatList may not have measured the target row yet; retry after a tick.
        setTimeout(() => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }, 50);
      }}
    />
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
