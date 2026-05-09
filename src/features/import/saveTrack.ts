import { insertTrack, type Track } from "../../db";
import { probeAudioMetadata } from "./metadata";
import type { PickedAudio } from "./pickAudio";
import type { PickedSubtitle } from "./pickSubtitle";
import { copyToSandbox, deleteTrackDir, newTrackId } from "./sandbox";

export type SaveArgs = {
  audio: PickedAudio;
  subtitle: PickedSubtitle | null;
};

export async function saveTrack({ audio, subtitle }: SaveArgs): Promise<Track> {
  const id = newTrackId();
  try {
    const sandboxed = await copyToSandbox({
      id,
      audio: { uri: audio.uri, name: audio.name },
      subtitle: subtitle ? { uri: subtitle.uri, name: subtitle.name } : null,
    });

    const meta = await probeAudioMetadata(sandboxed.audioPath, audio.name);

    return await insertTrack({
      id,
      title: meta.title,
      artist: null,
      source: null,
      durationMs: meta.durationMs,
      audioPath: sandboxed.audioPath,
      subtitlePath: sandboxed.subtitlePath,
      artworkPath: null,
    });
  } catch (err) {
    console.error("[saveTrack] failed; rolling back sandbox", { id, err });
    deleteTrackDir(id);
    throw err;
  }
}
