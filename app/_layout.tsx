import "../src/theme/unistyles";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { configureAudioSession } from "../src/audio/session";
import { initDb } from "../src/db";
import { UpdatePrompt } from "../src/features/updates";
import { useAppFonts } from "../src/theme/fonts";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useAppFonts();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const { theme } = useUnistyles();

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error("Failed to initialize db", err);
        setDbError(err instanceof Error ? err.message : String(err));
      });

    configureAudioSession().catch((err) => {
      console.warn("Failed to configure audio session", err);
    });
  }, []);

  const initFailed = fontsError != null || dbError != null;
  const ready = fontsLoaded && dbReady;

  // Always release the splash once we have a definitive state — either
  // ready to render the app or a failure we can show on screen. Without
  // this, a single rejected init promise leaves us stuck on the splash.
  useEffect(() => {
    if (ready || initFailed) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, initFailed]);

  if (initFailed) {
    return (
      <View style={errorStyles.container}>
        <Text style={errorStyles.title}>Hibi Koe failed to start.</Text>
        {fontsError ? <Text style={errorStyles.body}>Fonts: {String(fontsError)}</Text> : null}
        {dbError ? <Text style={errorStyles.body}>Database: {dbError}</Text> : null}
      </View>
    );
  }

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

const errorStyles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    padding: theme.space.s5,
    justifyContent: "center",
    gap: theme.space.s3,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    color: theme.colors.ink,
  },
  body: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.inkSoft,
  },
}));
