import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet as RNStyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { configureAudioSession } from "../src/audio/session";
import { initDb } from "../src/db";
import {
  attachKnownWordsAppStateRefresh,
  hydrateFurigana,
  hydrateMatchUnderline,
  hydrateWordStatuses,
  refreshKnownWords,
} from "../src/features/mining";
import { hydratePlaybackPrefs } from "../src/features/player";
import { startTimeTracker } from "../src/features/timeTracking";
import { UpdatePrompt } from "../src/features/updates";
import { useAppFonts } from "../src/theme/fonts";
import { hydrateTheme } from "../src/theme/useThemeSwitcher";
import { ErrorBoundary } from "../src/ui/ErrorBoundary";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutInner />
    </ErrorBoundary>
  );
}

function RootLayoutInner() {
  const [fontsLoaded, fontsError] = useAppFonts();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Migrations must finish before we can read prefs; the saved theme
    // has to be applied before any UI renders or we get a flash of the
    // default paper theme on cold start.
    (async () => {
      await initDb();
      await Promise.all([
        hydrateTheme(),
        hydratePlaybackPrefs(),
        hydrateFurigana(),
        hydrateMatchUnderline(),
        hydrateWordStatuses(),
      ]);
      setDbReady(true);
      // Fire-and-forget: pull the merged manual + SRS classifications so
      // the underline picks up any out-of-band changes from a recent
      // review session.
      refreshKnownWords().catch(() => {});
    })().catch((err) => {
      console.error("Failed to initialize db", err);
      setDbError(err instanceof Error ? err.message : String(err));
    });

    configureAudioSession().catch((err) => {
      console.warn("Failed to configure audio session", err);
    });

    startTimeTracker();
    attachKnownWordsAppStateRefresh();
  }, []);

  const initFailed = fontsError != null || dbError != null;
  const ready = fontsLoaded && dbReady;

  // Always release the splash once we have a definitive state — either
  // ready to render the app or a failure we can show on screen.
  useEffect(() => {
    if (ready || initFailed) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, initFailed]);

  if (initFailed) {
    return (
      <View style={fallbackStyles.container}>
        <Text style={fallbackStyles.title}>Hibi Koe failed to start.</Text>
        {fontsError ? <Text style={fallbackStyles.body}>Fonts: {String(fontsError)}</Text> : null}
        {dbError ? <Text style={fallbackStyles.body}>Database: {dbError}</Text> : null}
      </View>
    );
  }

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#F4EBD9" },
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
          <Stack.Screen
            name="vocab/[id]"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
        </Stack>
        <UpdatePrompt />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Plain RN StyleSheet — must work even when Unistyles is unhealthy.
const fallbackStyles = RNStyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4EBD9",
    padding: 22,
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    color: "#2B241B",
  },
  body: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#6B5E4E",
  },
});
