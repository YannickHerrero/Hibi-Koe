// Thin wrapper around expo-secure-store for the OpenRouter API key.
// We keep it in secure storage (not in the prefs SQLite table) so it's
// never persisted in a regular DB backup or visible to a casual file
// browser.

import * as SecureStore from "expo-secure-store";

const KEY = "openrouterApiKey";

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch (err) {
    console.warn("[mining] getApiKey failed", err);
    return null;
  }
}

export async function setApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await SecureStore.deleteItemAsync(KEY);
    return;
  }
  await SecureStore.setItemAsync(KEY, trimmed);
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export async function hasApiKey(): Promise<boolean> {
  return (await getApiKey()) !== null;
}
