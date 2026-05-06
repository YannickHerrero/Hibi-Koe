import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Display, Label, Masthead, Meta, Rule } from "../../src/ui";

export default function LibraryScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <Masthead right="№ 01 · Library" />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Label num="№ 01">Tracks</Label>
          <Pressable onPress={() => router.push("/import")} hitSlop={12}>
            <Meta style={styles.action}>+ Import</Meta>
          </Pressable>
        </View>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rule: {
    marginTop: theme.space.s3,
    marginBottom: theme.space.s5,
  },
  action: {
    color: theme.colors.accent,
  },
}));
