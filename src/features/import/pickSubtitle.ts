import * as DocumentPicker from "expo-document-picker";

export type PickedSubtitle = {
  uri: string;
  name: string;
  size: number | null;
};

// Some platforms hand us "application/x-subrip" or "text/plain" or no mime at all,
// so we open the picker on text/* and rely on the .srt suffix check on the result.
const SUBTITLE_MIME = ["text/*", "application/x-subrip", "*/*"];

export async function pickSubtitle(): Promise<PickedSubtitle | null> {
  // See pickAudio for why copyToCacheDirectory must be true on Android.
  const result = await DocumentPicker.getDocumentAsync({
    type: SUBTITLE_MIME,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if (!asset.name.toLowerCase().endsWith(".srt")) {
    throw new Error(`Expected an .srt file, got "${asset.name}".`);
  }
  return {
    uri: asset.uri,
    name: asset.name,
    size: asset.size ?? null,
  };
}
