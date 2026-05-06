import { setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";

// Configure the global audio session: do-not-mix so we own the focus,
// keep playback on iOS silent mode, and stay active in the background
// so the user can step out of the app and keep listening.
export async function configureAudioSession(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: "doNotMix",
    allowsRecording: false,
    shouldPlayInBackground: true,
    shouldRouteThroughEarpiece: false,
  });
  await setIsAudioActiveAsync(true);
}
