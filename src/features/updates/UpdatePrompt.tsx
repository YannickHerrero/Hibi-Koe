import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { Alert } from "react-native";

// Watches expo-updates state and prompts the user once per session
// when an OTA update has been downloaded and is ready to apply.
//
// Lifecycle (with `updates.checkAutomatically: ON_LOAD`):
//   1. App starts → expo-updates runtime checks the server.
//   2. If an update exists for our runtimeVersion, it auto-fetches.
//   3. useUpdates() flips `isUpdatePending` to true.
//   4. We surface an Alert; the user can apply now (reloadAsync) or
//      defer (the runtime will apply it on the next cold launch).
//
// The component renders nothing.
export function UpdatePrompt() {
  const { isUpdateAvailable, isUpdatePending, availableUpdate, downloadedUpdate, checkError } =
    Updates.useUpdates();
  const promptedRef = useRef(false);

  useEffect(() => {
    if (__DEV__) return;
    if (!Updates.isEnabled) return;
    if (promptedRef.current) return;
    if (!isUpdatePending && !isUpdateAvailable) return;

    promptedRef.current = true;

    void promptForUpdate({
      hasPendingDownload: isUpdatePending,
      updateId: (downloadedUpdate ?? availableUpdate)?.updateId ?? null,
    });
  }, [isUpdateAvailable, isUpdatePending, availableUpdate, downloadedUpdate]);

  useEffect(() => {
    if (checkError) {
      console.warn("expo-updates check failed", checkError);
    }
  }, [checkError]);

  return null;
}

type PromptArgs = {
  hasPendingDownload: boolean;
  updateId: string | null;
};

function promptForUpdate({ hasPendingDownload, updateId }: PromptArgs): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(
      "Update available",
      "A new version of Hibi Koe is ready. Apply it now?",
      [
        {
          text: "Later",
          style: "cancel",
          onPress: () => resolve(),
        },
        {
          text: "Update",
          onPress: async () => {
            try {
              if (!hasPendingDownload) {
                await Updates.fetchUpdateAsync();
              }
              await Updates.reloadAsync();
            } catch (err) {
              console.warn("Failed to apply update", { updateId, err });
              Alert.alert("Update failed", err instanceof Error ? err.message : String(err));
            } finally {
              resolve();
            }
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve() },
    );
  });
}
