import * as DocumentPicker from "expo-document-picker";

export type PickedAudio = {
  uri: string;
  name: string;
  size: number | null;
  mimeType: string | null;
};

const AUDIO_MIME = ["audio/*"];

export async function pickAudio(): Promise<PickedAudio | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: AUDIO_MIME,
    copyToCacheDirectory: false,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    name: asset.name,
    size: asset.size ?? null,
    mimeType: asset.mimeType ?? null,
  };
}
