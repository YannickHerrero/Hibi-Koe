import { Tabs } from "expo-router";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export default function TabsLayout() {
  const { theme } = useUnistyles();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: theme.colors.ink,
        tabBarInactiveTintColor: theme.colors.inkFaint,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="library" options={{ title: "Library" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create((theme) => ({
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
