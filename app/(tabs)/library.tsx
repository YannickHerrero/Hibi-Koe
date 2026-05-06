import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Display, Label, Masthead, Rule } from "../../src/ui";

export default function LibraryScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <Masthead right="№ 01 · Library" />
      <View style={styles.body}>
        <Label num="№ 01">Tracks</Label>
        <Rule variant="solid" style={styles.rule} />
        <Display size="lg">A quiet shelf.</Display>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s7,
  },
  rule: {
    marginTop: theme.space.s3,
    marginBottom: theme.space.s5,
  },
}));
