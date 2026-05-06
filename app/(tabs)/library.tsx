import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Display } from "../../src/ui";

export default function LibraryScreen() {
  return (
    <View style={styles.container}>
      <Display size="md">Library</Display>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s7,
  },
}));
