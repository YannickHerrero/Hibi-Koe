// Same shape as apiKey.ts but for the Hibi API bearer token. Lives in
// expo-secure-store so it doesn't leak into prefs backups.

import * as SecureStore from "expo-secure-store";
import { resetHibiClient } from "./hibiClient";

const KEY = "hibiApiKey";

export async function getHibiApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch (err) {
    console.warn("[mining] getHibiApiKey failed", err);
    return null;
  }
}

export async function setHibiApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await SecureStore.deleteItemAsync(KEY);
  } else {
    await SecureStore.setItemAsync(KEY, trimmed);
  }
  // The cached client closes over the previous key; drop it so the
  // next getHibiClient() rebuilds with the new value.
  resetHibiClient();
}

export async function clearHibiApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
  resetHibiClient();
}

export async function hasHibiApiKey(): Promise<boolean> {
  return (await getHibiApiKey()) !== null;
}
