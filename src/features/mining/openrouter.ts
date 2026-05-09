// OpenRouter base client. Auth headers, key validation, error
// formatting. Ported from Pureyaa src/openrouter/client.ts and adapted
// for Hibi Koe's referer + title (surfaces on the OpenRouter dashboard).

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const APP_REFERER = "https://hibi.app/koe";
const APP_TITLE = "Hibi Koe";

export function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": APP_REFERER,
    "X-Title": APP_TITLE,
  };
}

export type OpenRouterKeyInfo = {
  // User-facing label as shown on the OR dashboard.
  label: string;
  // Credits used so far (USD).
  usage: number;
  // Hard credit limit, or null for no limit.
  limit: number | null;
};

// Cheap key validity probe. Hits /auth/key which returns a small JSON
// blob describing the key. Throws on any non-2xx, with a clean message.
export async function testOpenRouterApiKey(apiKey: string): Promise<OpenRouterKeyInfo> {
  let res: Response;
  try {
    res = await fetch(`${OPENROUTER_BASE}/auth/key`, { headers: authHeaders(apiKey) });
  } catch (e) {
    throw new Error(`OpenRouter network error: ${(e as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("OpenRouter API key rejected.");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    data?: { label?: string; usage?: number; limit?: number | null };
  };
  return {
    label: json.data?.label ?? "(unnamed)",
    usage: json.data?.usage ?? 0,
    limit: json.data?.limit ?? null,
  };
}
