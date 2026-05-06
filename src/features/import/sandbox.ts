import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";

// Layout under the app's document directory:
//   tracks/<id>/audio.<ext>
//   tracks/<id>/subtitle.srt   (optional)
//   tracks/<id>/artwork.<ext>  (optional)
const TRACKS_DIR = "tracks";

export type SandboxedTrack = {
  id: string;
  audioPath: string;
  subtitlePath: string | null;
  artworkPath: string | null;
  dir: string;
};

export function newTrackId(): string {
  return Crypto.randomUUID();
}

function ensureTracksDir(): Directory {
  const dir = new Directory(Paths.document, TRACKS_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

function trackDir(id: string): Directory {
  const root = ensureTracksDir();
  const dir = new Directory(root, id);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

function pickExtension(name: string, fallback: string): string {
  const dot = name.lastIndexOf(".");
  if (dot >= 0 && dot < name.length - 1) {
    return name.slice(dot).toLowerCase();
  }
  return fallback;
}

export type CopyArgs = {
  id: string;
  audio: { uri: string; name: string };
  subtitle: { uri: string; name: string } | null;
};

export async function copyToSandbox({ id, audio, subtitle }: CopyArgs): Promise<SandboxedTrack> {
  const dir = trackDir(id);

  const audioExt = pickExtension(audio.name, ".mp3");
  const audioFile = new File(dir, `audio${audioExt}`);
  const sourceAudio = new File(audio.uri);
  sourceAudio.copy(audioFile);

  let subtitlePath: string | null = null;
  if (subtitle) {
    const srtFile = new File(dir, "subtitle.srt");
    const sourceSrt = new File(subtitle.uri);
    sourceSrt.copy(srtFile);
    subtitlePath = srtFile.uri;
  }

  return {
    id,
    dir: dir.uri,
    audioPath: audioFile.uri,
    subtitlePath,
    artworkPath: null,
  };
}

export function deleteTrackDir(id: string): void {
  const dir = new Directory(Paths.document, TRACKS_DIR, id);
  if (dir.exists) {
    dir.delete();
  }
}
