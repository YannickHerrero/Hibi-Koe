import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Display, Meta, Rule, SerifText } from "../../ui";
import { seekToMs } from "../player";
import { getMatchesCoveringToken } from "./match";
import { TokenChip } from "./TokenChip";
import type { AnalysisData, AnalyzedCue, DictMatch } from "./types";
import { useFurigana } from "./useFurigana";
import { useMatchUnderline } from "./useMatchUnderline";

type Props = {
  visible: boolean;
  analysis: AnalysisData | null;
  // Live playback position; the sheet auto-follows this unless the
  // user has manually navigated.
  positionMs: number;
  onClose: () => void;
  onPlayLine: (startMs: number, endMs: number) => void;
  onTokenSelect: (cue: AnalyzedCue, tokenIndex: number, matches: DictMatch[]) => void;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const FADE_DURATION = 200;
const SLIDE_DURATION = 260;

function findCueIndexAt(cues: AnalyzedCue[], time: number): number {
  // Binary search on startMs; choose the cue whose [start, end) covers
  // time, falling back to the last cue ≤ time.
  let lo = 0;
  let hi = cues.length - 1;
  let candidate = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (cues[mid].startMs <= time) {
      candidate = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return candidate;
}

export function MiningSheet({
  visible,
  analysis,
  positionMs,
  onClose,
  onPlayLine,
  onTokenSelect,
}: Props) {
  const { furiganaOn } = useFurigana();
  const { matchUnderlineOn } = useMatchUnderline();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Auto-follow toggle: true while we honour playback position; flips
  // to false the moment the user taps Prev/Next.
  const [following, setFollowing] = useState(true);
  const [manualIndex, setManualIndex] = useState<number | null>(null);

  // Reset to following whenever the sheet opens or the analysis changes.
  useEffect(() => {
    if (visible) {
      setFollowing(true);
      setManualIndex(null);
    }
  }, [visible]);

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

  const cues = analysis?.cues ?? [];
  const total = cues.length;

  const focusedIndex = useMemo(() => {
    if (!following && manualIndex !== null) return manualIndex;
    if (cues.length === 0) return -1;
    return findCueIndexAt(cues, positionMs);
  }, [cues, following, manualIndex, positionMs]);

  const cue: AnalyzedCue | null = focusedIndex >= 0 ? (cues[focusedIndex] ?? null) : null;

  // Per-token covering matches — includes compound matches that don't
  // start at this index but pass through it. Memoised per cue so the
  // O(tokens × matches) walk doesn't run on every render.
  const coveringByIndex = useMemo<DictMatch[][]>(() => {
    if (!cue) return [];
    return cue.tokens.map((_, i) => getMatchesCoveringToken(cue.matchesByTokenIndex, i));
  }, [cue]);

  // Prev/Next seek the player to the target cue's startMs and resume
  // auto-follow so the sheet tracks the new playback position. The
  // user almost always wants 'jump to that cue' rather than just
  // 'preview the line text', so navigation and audio stay in sync.
  const onPrev = useCallback(() => {
    if (cues.length === 0) return;
    const target = Math.max(0, (focusedIndex < 0 ? 0 : focusedIndex) - 1);
    const cue = cues[target];
    if (!cue) return;
    seekToMs(cue.startMs);
    setFollowing(true);
    setManualIndex(null);
  }, [cues, focusedIndex]);

  const onNext = useCallback(() => {
    if (cues.length === 0) return;
    const target = Math.min(cues.length - 1, (focusedIndex < 0 ? -1 : focusedIndex) + 1);
    const cue = cues[target];
    if (!cue) return;
    seekToMs(cue.startMs);
    setFollowing(true);
    setManualIndex(null);
  }, [cues, focusedIndex]);

  const onResume = useCallback(() => {
    setFollowing(true);
    setManualIndex(null);
  }, []);

  const onPlayCurrentLine = useCallback(() => {
    if (cue) onPlayLine(cue.startMs, cue.endMs);
  }, [cue, onPlayLine]);

  const onTokenPress = useCallback(
    (idx: number) => {
      if (!cue) return;
      onTokenSelect(cue, idx, coveringByIndex[idx] ?? []);
    },
    [cue, coveringByIndex, onTokenSelect],
  );

  const sheetStyle = [
    styles.sheet,
    { transform: [{ translateY }], paddingBottom: insets.bottom + 12 },
  ];

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
          <Pressable style={styles.sheetWrap} onPress={() => {}}>
            <Animated.View style={sheetStyle}>
              <View style={styles.headerRow}>
                <Display size="md">Mine</Display>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Meta style={styles.close}>Done</Meta>
                </Pressable>
              </View>
              <View style={styles.metaRow}>
                <Meta>
                  {cues.length === 0
                    ? "—"
                    : `№ ${(focusedIndex + 1).toString().padStart(2, "0")} / ${total}`}
                </Meta>
                {following ? (
                  <Meta style={styles.followLabel}>Following</Meta>
                ) : (
                  <Pressable onPress={onResume} hitSlop={6}>
                    <Meta style={styles.resume}>Resume follow</Meta>
                  </Pressable>
                )}
              </View>
              <Rule variant="solid" style={styles.rule} />

              {!analysis ? (
                <SerifText soft italic>
                  This track has not been analysed yet. Run analysis from the track edit screen to
                  enable mining.
                </SerifText>
              ) : !cue ? (
                <SerifText soft italic>
                  No cue at this position.
                </SerifText>
              ) : (
                <>
                  <ScrollView contentContainerStyle={styles.body}>
                    <View style={styles.tokensRow}>
                      {cue.tokens.map((token, i) => (
                        <TokenChip
                          // biome-ignore lint/suspicious/noArrayIndexKey: token position IS the identity within a cue
                          key={`${focusedIndex}-${i}`}
                          token={token}
                          index={i}
                          showFurigana={furiganaOn}
                          hasMatch={matchUnderlineOn && (coveringByIndex[i]?.length ?? 0) > 0}
                          active={false}
                          onPress={onTokenPress}
                        />
                      ))}
                    </View>

                    {cue.translation ? (
                      <View style={styles.section}>
                        <Meta>English</Meta>
                        <SerifText size={18}>{cue.translation}</SerifText>
                      </View>
                    ) : null}

                    {cue.grammarNote ? (
                      <View style={styles.section}>
                        <Meta>Grammar note</Meta>
                        <SerifText size={15} soft italic>
                          {cue.grammarNote}
                        </SerifText>
                      </View>
                    ) : null}
                  </ScrollView>

                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={onPrev}
                      style={styles.navBtn}
                      hitSlop={6}
                      disabled={focusedIndex <= 0}
                    >
                      <Meta style={styles.navLabel}>← Prev</Meta>
                    </Pressable>
                    <Pressable onPress={onPlayCurrentLine} style={styles.playBtn} hitSlop={6}>
                      <Meta style={styles.playLabel}>▶ Play line</Meta>
                    </Pressable>
                    <Pressable
                      onPress={onNext}
                      style={styles.navBtn}
                      hitSlop={6}
                      disabled={focusedIndex >= total - 1}
                    >
                      <Meta style={styles.navLabel}>Next →</Meta>
                    </Pressable>
                  </View>
                </>
              )}
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
  sheetWrap: {
    // No styling — exists purely to swallow taps so the backdrop's
    // close handler doesn't fire when the user interacts with the
    // sheet itself.
  },
  sheet: {
    backgroundColor: theme.colors.paper,
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s5,
    // paddingBottom is set inline using safe-area insets so the sheet
    // visually flushes with the bottom of the screen on devices with
    // gesture navigation / on-screen system bars.
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink,
    gap: theme.space.s3,
    maxHeight: Math.round(SCREEN_HEIGHT * 0.85),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  close: {
    color: theme.colors.accent,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  followLabel: {
    color: theme.colors.inkSoft,
  },
  resume: {
    color: theme.colors.accent,
  },
  rule: {
    marginVertical: theme.space.s2,
  },
  body: {
    gap: theme.space.s5,
    paddingBottom: theme.space.s4,
  },
  tokensRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    // No horizontal gap — tokens should flow as natural Japanese text.
    // Vertical gap covers wrapping into multiple lines.
    rowGap: theme.space.s3,
  },
  section: {
    gap: theme.space.s2,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.space.s2,
  },
  navBtn: {
    paddingVertical: theme.space.s3,
    paddingHorizontal: theme.space.s4,
    borderWidth: 1,
    borderColor: theme.colors.ink,
  },
  navLabel: {
    color: theme.colors.ink,
  },
  playBtn: {
    paddingVertical: theme.space.s3,
    paddingHorizontal: theme.space.s5,
    backgroundColor: theme.colors.ink,
  },
  playLabel: {
    color: theme.colors.paper,
  },
}));
