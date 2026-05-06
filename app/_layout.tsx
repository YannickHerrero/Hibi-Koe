import "../src/theme/unistyles";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { configureAudioSession } from "../src/audio/session";
import { initDb } from "../src/db";
import { UpdatePrompt } from "../src/features/updates";
import { useAppFonts } from "../src/theme/fonts";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();
  const [dbReady, setDbReady] = useState(false);
  const { theme } = useUnistyles();

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error("Failed to initialize db", err);
      });

    configureAudioSession().catch((err) => {
      console.warn("Failed to configure audio session", err);
    });
  }, []);

  const ready = fontsLoaded && dbReady;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
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
        <Stack.Screen
          name="import"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="track/[id]/edit"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
      </Stack>
      <UpdatePrompt />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    backgroundColor: theme.colors.paper,
  },
}));
