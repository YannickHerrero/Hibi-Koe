import "../src/theme/unistyles";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useAppFonts } from "../src/theme/fonts";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();
  const { theme } = useUnistyles();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.name === "ink" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: styles.content,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="player/[id]"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    backgroundColor: theme.colors.paper,
  },
}));
