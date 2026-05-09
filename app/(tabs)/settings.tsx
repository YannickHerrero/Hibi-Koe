import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  formatBytes,
  MiningSection,
  ThemePicker,
  useStorageUsage,
} from "../../src/features/settings";
import { Display, Label, Masthead, Meta, Rule, SafeAreaView, SerifText } from "../../src/ui";

export default function SettingsScreen() {
  const usage = useStorageUsage();

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <Masthead right="№ 02 · Settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <Display size="lg">Settings</Display>

        <View style={styles.section}>
          <Label num="№ 01">Theme</Label>
          <Rule variant="soft" style={styles.rule} />
          <ThemePicker />
        </View>

        <View style={styles.section}>
          <Label num="№ 02">Mining</Label>
          <Rule variant="soft" style={styles.rule} />
          <MiningSection />
        </View>

        <View style={styles.section}>
          <Label num="№ 03">Storage</Label>
          <Rule variant="soft" style={styles.rule} />
          <View style={styles.kv}>
            <Meta>Tracks</Meta>
            <SerifText>{usage.trackCount}</SerifText>
          </View>
          <View style={styles.kv}>
            <Meta>On disk</Meta>
            <SerifText>{formatBytes(usage.totalBytes)}</SerifText>
          </View>
        </View>

        <View style={styles.section}>
          <Label num="№ 04">About</Label>
          <Rule variant="soft" style={styles.rule} />
          <SerifText soft italic>
            Hibi Koe — passive listening immersion. Part of the Hibi ecosystem; the design system is
            Torakaa.
          </SerifText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  body: {
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s7,
    paddingBottom: theme.space.s8,
    gap: theme.space.s7,
  },
  section: {
    gap: theme.space.s3,
  },
  rule: {
    marginTop: theme.space.s1,
    marginBottom: theme.space.s2,
  },
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: theme.space.s2,
  },
}));
