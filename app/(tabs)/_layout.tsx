import { Tabs } from "expo-router";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { MiniPlayer } from "../../src/features/player";

export default function TabsLayout() {
  const { theme } = useUnistyles();
  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.bar,
          tabBarActiveTintColor: theme.colors.ink,
          tabBarInactiveTintColor: theme.colors.inkFaint,
          tabBarLabelStyle: styles.label,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Library" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  bar: {
    backgroundColor: theme.colors.paper,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink,
    elevation: 0,
    shadowOpacity: 0,
    height: 64,
  },
  label: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.mono.xs,
    letterSpacing: theme.typography.mono.xs * theme.tracking.monoWide,
    textTransform: "uppercase",
  },
}));
