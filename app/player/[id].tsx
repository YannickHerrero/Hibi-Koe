import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Display, Meta, Rule } from "../../src/ui";

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Meta>Close</Meta>
        </Pressable>
        <Meta>Now playing</Meta>
      </View>
      <Rule variant="solid" />
      <View style={styles.body}>
        <Display size="lg">Player</Display>
        <Meta style={styles.id}>{id ?? "—"}</Meta>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.space.s5,
    paddingVertical: theme.space.s4,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s7,
  },
  id: {
    marginTop: theme.space.s2,
  },
}));
