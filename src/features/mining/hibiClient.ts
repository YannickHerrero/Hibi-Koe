// Singleton wrapper around hibi-client. We cache the instance because
// the SDK is stateless apart from the bearer token, and rebuilding it
// on every call would force a fresh RNFile/Blob upload context.

import { createHibiClient, type HibiClient } from "hibi-client";
import { getPref, setPref } from "../../db";
import { getHibiApiKey } from "./hibiApiKey";

export const DEFAULT_HIBI_BASE_URL = "https://api.hibi.app";

let cached: { client: HibiClient; baseUrl: string } | null = null;

export async function getHibiBaseUrl(): Promise<string> {
  return (await getPref("hibiBaseUrl")) || DEFAULT_HIBI_BASE_URL;
}

export async function setHibiBaseUrl(url: string): Promise<void> {
  await setPref("hibiBaseUrl", url.trim().replace(/\/+$/, ""));
  resetHibiClient();
}

export async function getHibiClient(): Promise<HibiClient | null> {
  const baseUrl = await getHibiBaseUrl();
  if (cached && cached.baseUrl === baseUrl) return cached.client;
  const apiKey = await getHibiApiKey();
  if (!apiKey) return null;
  console.log("[hibi-client] creating client for", baseUrl);
  const client = createHibiClient({ apiKey, baseUrl });
  cached = { client, baseUrl };
  return client;
}

// Called from setHibiApiKey / clearHibiApiKey so the next getHibiClient
// picks up the new credential. Module-level to avoid an event-bus
// detour for what's effectively a 1:1 hand-off.
export function resetHibiClient(): void {
  cached = null;
}
