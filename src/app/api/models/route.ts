import { NextResponse } from "next/server";
import { decrypt, getSessionCookie } from "@/lib/session";

// Proxies OpenRouter's public model catalogue (https://openrouter.ai/api/v1/models)
// so the settings UI can offer the real, current list instead of a hardcoded
// handful. No API key needed for this endpoint — it's public data. Cached for
// an hour so every settings page open doesn't hit OpenRouter.
export const runtime = "nodejs";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export interface ModelOption {
  id: string;
  name: string;
  /** USD per 1M prompt tokens. 0 means free. */
  promptPerM: number;
  /** USD per 1M completion tokens. 0 means free. */
  completionPerM: number;
  contextLength: number;
  free: boolean;
}

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

export async function GET() {
  const session = await decrypt(await getSessionCookie());
  if (!session?.userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(OPENROUTER_MODELS_URL, { next: { revalidate: 3600 } });
  } catch (e) {
    return NextResponse.json(
      { error: `Could not reach OpenRouter: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `OpenRouter model list failed (${res.status}).` },
      { status: 502 }
    );
  }

  const data = (await res.json()) as { data?: OpenRouterModel[] };
  const raw = Array.isArray(data.data) ? data.data : [];

  const models: ModelOption[] = raw
    .map((m) => {
      const promptPerM = (parseFloat(m.pricing?.prompt ?? "0") || 0) * 1_000_000;
      const completionPerM = (parseFloat(m.pricing?.completion ?? "0") || 0) * 1_000_000;
      return {
        id: m.id,
        name: m.name || m.id,
        promptPerM,
        completionPerM,
        contextLength: m.context_length ?? 0,
        free: promptPerM === 0 && completionPerM === 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ models });
}
