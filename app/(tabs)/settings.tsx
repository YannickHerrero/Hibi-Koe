import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Display, Label, Masthead, Rule, SerifText } from "../../src/ui";

export default function SettingsScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <Masthead right="№ 02 · Settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <Display size="lg">Settings</Display>
        <View style={styles.section}>
          <Label num="№ 01">Theme</Label>
          <Rule variant="soft" style={styles.rule} />
          <SerifText soft>Theme picker arrives in Phase 10.</SerifText>
        </View>
        <View style={styles.section}>
          <Label num="№ 02">About</Label>
          <Rule variant="soft" style={styles.rule} />
          <SerifText soft>Hibi Koe — passive listening immersion.</SerifText>
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
}));
