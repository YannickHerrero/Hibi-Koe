import "./src/theme/unistyles";

import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useAppFonts } from "./src/theme/fonts";

export default function App() {
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.serif}>Hibi Koe</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  serif: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.display.lg,
    color: theme.colors.ink,
    letterSpacing: theme.typography.display.lg * theme.tracking.tight,
  },
}));
