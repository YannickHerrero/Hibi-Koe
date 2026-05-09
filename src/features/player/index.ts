// MUST come first: MiniPlayer / Scrubber / Transport / SpeedPicker run
// StyleSheet.create((theme) => …) at module load.
import "../../theme/unistyles";

export { useCurrentTrack, usePlayback, usePlaybackProgress } from "./hooks";
export { MiniPlayer } from "./MiniPlayer";
export { PlayerSettingsModal } from "./PlayerSettingsModal";
export { Scrubber } from "./Scrubber";
export { SpeedPicker } from "./SpeedPicker";
export {
  hydratePlaybackPrefs,
  loadTrack,
  type PlaybackState,
  pause,
  play,
  seekToMs,
  setLoopMode,
  setRandomMode,
  setRate,
  skipBy,
  toggleLoopMode,
  togglePlay,
  toggleRandomMode,
  unload,
} from "./store";
export { Transport } from "./Transport";
