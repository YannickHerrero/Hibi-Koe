// MUST come first: MiniPlayer / Scrubber / Transport / SpeedPicker run
// StyleSheet.create((theme) => …) at module load.
import "../../theme/unistyles";

export { useCurrentTrack, usePlayback, usePlaybackProgress } from "./hooks";
export { MiniPlayer } from "./MiniPlayer";
export { PlayerSettingsModal } from "./PlayerSettingsModal";
export { Scrubber } from "./Scrubber";
export { SpeedPicker } from "./SpeedPicker";
export {
  getState,
  hydratePlaybackPrefs,
  loadTrack,
  type PlaybackContext,
  type PlaybackState,
  pause,
  play,
  playTrackAt,
  seekToMs,
  setLoopMode,
  setRandomMode,
  setRate,
  skipBy,
  subscribe,
  toggleLoopMode,
  togglePlay,
  toggleRandomMode,
  unload,
} from "./store";
export { Transport } from "./Transport";
