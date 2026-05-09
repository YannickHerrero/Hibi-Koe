import { createAudioPlayer } from "expo-audio";
import { formatTitle } from "./title";

export type AudioMetadata = {
  title: string;
  durationMs: number;
};

// Probe the audio file for its duration. The title is derived from the
// filename via formatTitle (see ./title.ts) — strips release tags,
// detects S01E02 forms, title-cases the rest. Richer metadata
// (ID3 cover/artist) can land later.
export function probeAudioMetadata(uri: string, originalName: string): Promise<AudioMetadata> {
  const title = formatTitle(originalName);

  return new Promise<AudioMetadata>((resolve, reject) => {
    const player = createAudioPlayer(uri, { updateInterval: 100 });
    let settled = false;

    const finish = (durationMs: number) => {
      if (settled) return;
      settled = true;
      sub.remove();
      timeout && clearTimeout(timeout);
      try {
        player.remove();
      } catch {
        // best-effort cleanup
      }
      resolve({ title, durationMs });
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      sub.remove();
      timeout && clearTimeout(timeout);
      try {
        player.remove();
      } catch {
        // best-effort cleanup
      }
      reject(err);
    };

    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.isLoaded && status.duration > 0) {
        finish(Math.round(status.duration * 1000));
      }
    });

    const timeout = setTimeout(() => fail(new Error("Timed out probing audio metadata.")), 15_000);
  });
}
