import * as Crypto from "expo-crypto";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { insertSavedWord, type Track } from "../../db";
import { Display, Meta, Rule, SerifText } from "../../ui";
import { getEntries, loadDictionaries } from "./dict";
import type { AnalyzedCue, DictEntry, DictMatch } from "./types";

type Props = {
  visible: boolean;
  cue: AnalyzedCue | null;
  tokenIndex: number;
  matches: DictMatch[];
  track: Track | null;
  onClose: () => void;
  onSaved?: () => void;
};

type ResolvedMatch = DictMatch & {
  entries: DictEntry[];
};

function pickPrimary(_match: DictMatch, entries: DictEntry[]): DictEntry | null {
  // Prefer entries marked common (jmdict frequency: 'common'); fall back
  // to the first.
  const common = entries.find((e) => e.frequency === "common");
  return common ?? entries[0] ?? null;
}

export function DictionaryPopup({
  visible,
  cue,
  tokenIndex,
  matches,
  track,
  onClose,
  onSaved,
}: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [resolved, setResolved] = useState<ResolvedMatch[] | null>(null);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const tappedSurface = cue?.tokens[tokenIndex]?.surface ?? "";

  // Reset state whenever the underlying token changes.
  useEffect(() => {
    setActiveIdx(0);
    setSavingState("idle");
    setError(null);
  }, []);

  // Resolve match → DictEntry[] lazily on open. loadDictionaries is
  // idempotent and will no-op if the bundles are already in memory.
  useEffect(() => {
    if (!visible || matches.length === 0) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadDictionaries();
        if (cancelled) return;
        const resolvedEntries = await Promise.all(
          matches.map((m) => getEntries(m.entryIds, m.dict)),
        );
        if (cancelled) return;
        const out: ResolvedMatch[] = matches.map((m, i) => ({
          ...m,
          entries: resolvedEntries[i],
        }));
        setResolved(out);
      } catch (err) {
        if (!cancelled) {
          console.error("[mining] dictionary popup load failed", err);
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, matches]);

  const activeMatch = resolved?.[activeIdx] ?? null;
  const activeEntry = useMemo(
    () => (activeMatch ? pickPrimary(activeMatch, activeMatch.entries) : null),
    [activeMatch],
  );

  const onSave = async () => {
    if (!cue || !track || !activeMatch || !activeEntry) return;
    setSavingState("saving");
    setError(null);
    try {
      const reading = activeEntry.readings[0] ?? null;
      const lemma = activeEntry.forms[0] ?? activeMatch.form;
      const glosses = activeEntry.senses.flatMap((s) => s.glosses).slice(0, 8);
      const pos = activeEntry.senses[0]?.pos.join(" / ") ?? null;
      await insertSavedWord({
        id: Crypto.randomUUID(),
        trackId: track.id,
        cueIndex: cue.index,
        surface: tappedSurface,
        reading,
        lemma,
        pos,
        glosses,
        sentenceJp: cue.text,
        sentenceEn: cue.translation,
        grammarNote: cue.grammarNote,
        audioStartMs: cue.startMs,
        audioEndMs: cue.endMs,
        audioClipPath: null,
        artworkPath: track.artworkPath,
      });
      setSavingState("saved");
      onSaved?.();
    } catch (err) {
      console.error("[mining] insertSavedWord failed", err);
      setError(err instanceof Error ? err.message : String(err));
      setSavingState("error");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.dialog}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Display size="md">{tappedSurface}</Display>
              {activeEntry?.readings[0] && activeEntry.readings[0] !== tappedSurface ? (
                <Meta>{activeEntry.readings[0]}</Meta>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Meta style={styles.close}>Done</Meta>
            </Pressable>
          </View>
          <Rule variant="solid" style={styles.rule} />

          <ScrollView contentContainerStyle={styles.body}>
            {matches.length === 0 ? (
              <SerifText soft italic>
                No dictionary match for this token.
              </SerifText>
            ) : !resolved ? (
              <SerifText soft italic>
                Loading…
              </SerifText>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabsRow}
                >
                  {resolved.map((m, i) => (
                    <Pressable
                      // biome-ignore lint/suspicious/noArrayIndexKey: match list is positional
                      key={`${m.dict}-${m.form}-${i}`}
                      onPress={() => setActiveIdx(i)}
                      style={i === activeIdx ? styles.tabActive : styles.tab}
                    >
                      <Meta style={i === activeIdx ? styles.tabLabelActive : styles.tabLabel}>
                        {m.form}
                      </Meta>
                      <Meta style={styles.tabHint}>{m.dict === "jmdict" ? "JM" : "JN"}</Meta>
                    </Pressable>
                  ))}
                </ScrollView>

                {activeEntry ? (
                  <View style={styles.entryBlock}>
                    {activeEntry.forms.length > 0 ? (
                      <SerifText size={20}>{activeEntry.forms.join(" · ")}</SerifText>
                    ) : null}
                    {activeEntry.readings.length > 0 ? (
                      <Meta style={styles.readings}>{activeEntry.readings.join(" · ")}</Meta>
                    ) : null}
                    {activeEntry.senses.map((sense, si) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: senses are positional
                      <View key={`s-${si}`} style={styles.sense}>
                        {sense.pos.length > 0 ? (
                          <Meta style={styles.pos}>{sense.pos.join(" · ")}</Meta>
                        ) : null}
                        <SerifText>{sense.glosses.join("; ")}</SerifText>
                        {sense.misc && sense.misc.length > 0 ? (
                          <Meta style={styles.misc}>{sense.misc.join(" · ")}</Meta>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            )}

            {error ? (
              <SerifText soft italic style={styles.errorLine}>
                {error}
              </SerifText>
            ) : null}
          </ScrollView>

          {activeEntry && cue && track ? (
            <View style={styles.footer}>
              <Pressable
                onPress={onSave}
                disabled={savingState === "saving" || savingState === "saved"}
                style={styles.saveBtn}
                hitSlop={6}
              >
                <Meta style={styles.saveLabel}>
                  {savingState === "saving"
                    ? "Saving…"
                    : savingState === "saved"
                      ? "★ Saved"
                      : "★ Save to vocabulary"}
                </Meta>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space.s5,
  },
  dialog: {
    backgroundColor: theme.colors.paper,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s5,
    paddingBottom: theme.space.s4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    gap: theme.space.s1,
  },
  close: {
    color: theme.colors.accent,
  },
  rule: {
    marginVertical: theme.space.s3,
  },
  body: {
    gap: theme.space.s4,
    paddingBottom: theme.space.s4,
  },
  tabsRow: {
    flexDirection: "row",
    gap: theme.space.s2,
    paddingBottom: theme.space.s2,
  },
  tab: {
    paddingHorizontal: theme.space.s3,
    paddingVertical: theme.space.s2,
    borderWidth: 1,
    borderColor: theme.colors.ruleSoft,
    backgroundColor: "transparent",
    alignItems: "center",
    gap: 2,
  },
  tabActive: {
    paddingHorizontal: theme.space.s3,
    paddingVertical: theme.space.s2,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    gap: 2,
  },
  tabLabel: {
    color: theme.colors.inkSoft,
  },
  tabLabelActive: {
    color: theme.colors.ink,
  },
  tabHint: {
    color: theme.colors.inkFaint,
    fontSize: 9,
  },
  entryBlock: {
    gap: theme.space.s3,
  },
  readings: {
    color: theme.colors.inkSoft,
  },
  sense: {
    gap: theme.space.s1,
    paddingTop: theme.space.s2,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ruleSoft,
  },
  pos: {
    color: theme.colors.accent,
  },
  misc: {
    color: theme.colors.inkFaint,
  },
  errorLine: {
    paddingTop: theme.space.s2,
  },
  footer: {
    paddingTop: theme.space.s3,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ruleSoft,
  },
  saveBtn: {
    alignSelf: "stretch",
    paddingVertical: theme.space.s3,
    backgroundColor: theme.colors.ink,
    alignItems: "center",
  },
  saveLabel: {
    color: theme.colors.paper,
  },
}));
