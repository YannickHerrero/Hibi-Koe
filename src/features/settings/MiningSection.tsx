import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Meta, Rule, SerifText } from "../../ui";
import {
  clearHibiApiKey,
  getHibiApiKey,
  setHibiApiKey,
  useFurigana,
  useMatchUnderline,
} from "../mining";
import { ApiKeyField } from "./ApiKeyField";
import { DictSetupCard } from "./DictSetupCard";

const hibiAccessor = {
  get: getHibiApiKey,
  set: setHibiApiKey,
  clear: clearHibiApiKey,
};

// Composes the three mining-related controls into a single section
// rendered inside the Settings screen. Each row is its own little
// labelled block so the editorial № divider rhythm stays consistent.
export function MiningSection() {
  const { furiganaOn, toggleFurigana } = useFurigana();
  const { matchUnderlineOn, toggleMatchUnderline } = useMatchUnderline();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Meta>Hibi API key</Meta>
        <Rule variant="soft" style={styles.rule} />
        <ApiKeyField accessor={hibiAccessor} placeholder="hibi_…" />
        <SerifText soft italic style={styles.hint}>
          Powers mined-word sync and the AI-driven track translations. Set
          your OpenRouter key once at app.hibi.app — it stays on the server.
        </SerifText>
      </View>

      <View style={styles.row}>
        <Meta>Japanese dictionaries</Meta>
        <Rule variant="soft" style={styles.rule} />
        <DictSetupCard />
      </View>

      <View style={styles.row}>
        <Meta>Furigana</Meta>
        <Rule variant="soft" style={styles.rule} />
        <Pressable onPress={toggleFurigana} style={styles.toggleRow} hitSlop={6}>
          <SerifText>Show readings on the mining sheet</SerifText>
          <Meta style={furiganaOn ? styles.on : styles.off}>{furiganaOn ? "On" : "Off"}</Meta>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Meta>Match underline</Meta>
        <Rule variant="soft" style={styles.rule} />
        <Pressable onPress={toggleMatchUnderline} style={styles.toggleRow} hitSlop={6}>
          <SerifText>Underline tokens with a dictionary match</SerifText>
          <Meta style={matchUnderlineOn ? styles.on : styles.off}>
            {matchUnderlineOn ? "On" : "Off"}
          </Meta>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: {
    gap: theme.space.s5,
  },
  row: {
    gap: theme.space.s2,
  },
  rule: {
    marginVertical: theme.space.s1,
  },
  hint: {
    marginTop: theme.space.s1,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.space.s2,
  },
  on: {
    color: theme.colors.accent,
  },
  off: {
    color: theme.colors.inkFaint,
  },
}));
