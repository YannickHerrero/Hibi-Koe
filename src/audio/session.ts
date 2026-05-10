import { setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";

// Configure the global audio session: do-not-mix so we own the focus,
// keep playback on iOS silent mode, and stay active in the background
// so the user can step out of the app and keep listening.
export async function configureAudioSession(): Promise<void> {
  // Drop any audio focus / session leftover from a prior process before
  // we re-arm. Without this flush a swipe-killed process can leave the
  // session "owned" until the OS reclaims it, which manifests as the
  // new process's player being ducked or muted.
  try {
    await setIsAudioActiveAsync(false);
  } catch {
    // ignore — there may be no prior session to deactivate.
  }
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: "doNotMix",
    allowsRecording: false,
    shouldPlayInBackground: true,
    shouldRouteThroughEarpiece: false,
  });
  await setIsAudioActiveAsync(true);
}
