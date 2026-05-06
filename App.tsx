import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4EBD9",
    alignItems: "center",
    justifyContent: "center",
  },
  serif: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 44,
    color: "#2B241B",
  },
});
