// Manual OTA trigger for Settings → About. Complements UpdatePrompt
// (which auto-checks on launch) by letting the user pull updates on
// demand without restarting the app.

import * as Updates from "expo-updates";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Meta, SerifText } from "../../ui";

type Status = "idle" | "checking" | "downloading" | "ready" | "uptodate" | "error";

export function CheckUpdatesButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onCheck = async () => {
    setStatus("checking");
    setMessage(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setStatus("uptodate");
        return;
      }
      setStatus("downloading");
      await Updates.fetchUpdateAsync();
      setStatus("ready");
    } catch (err) {
      console.warn("[updates] check failed", err);
      setMessage(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const onApply = async () => {
    try {
      await Updates.reloadAsync();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  if (!Updates.isEnabled) {
    return (
      <SerifText soft italic>
        OTA updates are disabled in this build (e.g. running in dev or simulator).
      </SerifText>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={status === "ready" ? onApply : onCheck}
          hitSlop={6}
          disabled={status === "checking" || status === "downloading"}
        >
          <Meta style={styles.action}>{labelFor(status)}</Meta>
        </Pressable>
      </View>
      {status === "uptodate" ? (
        <SerifText soft italic style={styles.status}>
          You're on the latest version.
        </SerifText>
      ) : null}
      {status === "error" && message ? (
        <SerifText soft italic style={styles.status}>
          {message}
        </SerifText>
      ) : null}
    </View>
  );
}

function labelFor(s: Status): string {
  switch (s) {
    case "checking":
      return "Checking…";
    case "downloading":
      return "Downloading…";
    case "ready":
      return "Apply update";
    case "uptodate":
      return "Check again";
    case "error":
      return "Retry";
    default:
      return "Check for updates";
  }
}

const styles = StyleSheet.create((theme) => ({
  wrap: { gap: theme.space.s2 },
  row: {
    flexDirection: "row",
    paddingVertical: theme.space.s2,
  },
  action: { color: theme.colors.accent },
  status: { color: theme.colors.inkSoft },
}));
