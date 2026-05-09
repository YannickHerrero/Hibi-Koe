// Singleton wrapper around hibi-client. We cache the instance because
// the SDK is stateless apart from the bearer token, and rebuilding it
// on every call would force a fresh RNFile/Blob upload context.

import { createHibiClient, type HibiClient } from "hibi-client";
import { getHibiApiKey } from "./hibiApiKey";

const HIBI_BASE_URL = "https://api.hibi.app";

let cached: HibiClient | null = null;

export async function getHibiClient(): Promise<HibiClient | null> {
  if (cached) return cached;
  const apiKey = await getHibiApiKey();
  if (!apiKey) return null;
  cached = createHibiClient({ apiKey, baseUrl: HIBI_BASE_URL });
  return cached;
}

// Called from setHibiApiKey / clearHibiApiKey so the next getHibiClient
// picks up the new credential. Module-level to avoid an event-bus
// detour for what's effectively a 1:1 hand-off.
export function resetHibiClient(): void {
  cached = null;
}
