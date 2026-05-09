import * as DocumentPicker from "expo-document-picker";

export type PickedAudio = {
  uri: string;
  name: string;
  size: number | null;
  mimeType: string | null;
};

const AUDIO_MIME = ["audio/*"];

export async function pickAudio(): Promise<PickedAudio | null> {
  // copyToCacheDirectory must be true: on Android the picker returns a
  // content:// URI from the Storage Access Framework, which the new
  // expo-file-system File.copy() can't read. Setting this to true makes
  // the picker translate the SAF URI into a real file:// path in the
  // app cache, which we can then copy into the sandbox.
  const result = await DocumentPicker.getDocumentAsync({
    type: AUDIO_MIME,
    copyToCacheDirectory: true,
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
