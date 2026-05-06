import { createAudioPlayer } from "expo-audio";

export type AudioMetadata = {
  title: string;
  durationMs: number;
};

function basenameWithoutExt(name: string): string {
  const cleaned = name.replace(/\\/g, "/").split("/").pop() ?? name;
  const dot = cleaned.lastIndexOf(".");
  return dot > 0 ? cleaned.slice(0, dot) : cleaned;
}

// Probe the audio file for its duration. The title is derived from the
// filename for now; richer metadata (ID3 cover/artist) can land later.
export function probeAudioMetadata(uri: string, originalName: string): Promise<AudioMetadata> {
  const title = basenameWithoutExt(originalName).trim() || "Untitled";

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
