import { Alert } from "react-native";
import { deleteSavedWordsForTrack, deleteTrack as deleteTrackRow, type Track } from "../../db";
import { deleteTrackDir } from "../import";
import { deleteAnalysis } from "../mining";

// Two-step delete: confirm with the user, then remove every artefact
// associated with the track — DB row, sandbox dir, analysis blob,
// saved-word rows. FS / analysis cleanup failures are swallowed because
// the row is already gone; the orphaned bytes are harmless and surfaced
// as wasted disk in Settings.
export function confirmDeleteTrack(track: Track, onDone: () => void): void {
  Alert.alert("Delete track", `Remove "${track.title}" from your library? This cannot be undone.`, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: async () => {
        try {
          await deleteTrackRow(track.id);
          await deleteSavedWordsForTrack(track.id).catch((err) =>
            console.warn("[library] cascade-delete saved_words failed", err),
          );
          try {
            deleteTrackDir(track.id);
          } catch {
            // best-effort fs cleanup
          }
          try {
            deleteAnalysis(track.id);
          } catch {
            // best-effort
          }
          onDone();
        } catch (err) {
          Alert.alert("Delete failed", err instanceof Error ? err.message : String(err));
        }
      },
    },
  ]);
}
