import { Alert } from "react-native";
import { deleteTrack as deleteTrackRow, type Track } from "../../db";
import { deleteTrackDir } from "../import";

// Two-step delete: confirm with the user, then remove the row and the
// sandbox directory. If the FS delete fails we still keep the DB row gone
// (the orphaned dir is harmless and surfaced as wasted disk in settings).
export function confirmDeleteTrack(track: Track, onDone: () => void): void {
  Alert.alert("Delete track", `Remove "${track.title}" from your library? This cannot be undone.`, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: async () => {
        try {
          await deleteTrackRow(track.id);
          try {
            deleteTrackDir(track.id);
          } catch {
            // best-effort fs cleanup
          }
          onDone();
        } catch (err) {
          Alert.alert("Delete failed", err instanceof Error ? err.message : String(err));
        }
      },
    },
  ]);
}
