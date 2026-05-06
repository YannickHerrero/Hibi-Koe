import { Alert } from "react-native";
import type { Track } from "../../db";
import { confirmDeleteTrack } from "./deleteTrackFlow";

export type TrackContextActions = {
  onEdit: (track: Track) => void;
  onDeleted: () => void;
};

// Shows a three-option Alert (Edit / Delete / Cancel) for a track row.
// Edit dispatches to the caller's navigation; Delete chains the existing
// delete confirmation flow and notifies onDeleted on success.
export function openTrackContextMenu(track: Track, actions: TrackContextActions): void {
  Alert.alert(track.title, undefined, [
    { text: "Edit", onPress: () => actions.onEdit(track) },
    {
      text: "Delete",
      style: "destructive",
      onPress: () => confirmDeleteTrack(track, actions.onDeleted),
    },
    { text: "Cancel", style: "cancel" },
  ]);
}
