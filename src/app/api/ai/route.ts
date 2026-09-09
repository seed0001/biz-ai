import { NextRequest, NextResponse } from "next/server";
import { AI_ACTION_SCHEMA_PROMPT } from "@/lib/ai-actions";
import { decrypt, getSessionCookie } from "@/lib/session";

// Server-only: talks to OpenRouter with the API key from the environment.
// The browser never sees the key — it POSTs a message + a compact snapshot
// of the business data here, and gets back { reply, actions } to apply
// through applyAiAction() on the client (see src/components/AiAssistant.tsx).
export const runtime = "nodejs";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

function buildSystemPrompt(context: unknown): string {
  return `You are the AI assistant embedded in a contractor business-management app (quoting, jobs, scheduling, a price catalog, and an AI phone/text line). You help the business owner by answering questions and, when appropriate, proposing actions that change the app's data.

Current business data (read-only context, the only ids you may reference):
${JSON.stringify(context, null, 2)}

${AI_ACTION_SCHEMA_PROMPT}

Respond with ONLY a JSON object of this exact shape, no markdown fences, no text outside the JSON:
{ "reply": string, "actions": Action[] }`;
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callOpenRouter(apiKey: string, model: string, systemPrompt: string, message: string) {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await decrypt(await getSessionCookie());
  if (!session?.userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENROUTER_API_KEY is not set. Add it to .env.local (see .env.example) and restart the dev server.",
      },
      { status: 500 }
    );
  }

  let body: { message?: string; context?: unknown; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message is required." }, { status: 400 });

  const systemPrompt = buildSystemPrompt(body.context ?? {});
  const requestedModel = body.model || FALLBACK_MODEL;

  let res: Response;
  try {
    res = await callOpenRouter(apiKey, requestedModel, systemPrompt, message);
  } catch (e) {
    return NextResponse.json({ error: `Could not reach OpenRouter: ${(e as Error).message}` }, { status: 502 });
  }

  // Self-healing fallback: the requested model may be dead, retired, or
  // rate-limited — retry once against a known-good free model before failing.
  if (!res.ok && requestedModel !== FALLBACK_MODEL) {
    try {
      res = await callOpenRouter(apiKey, FALLBACK_MODEL, systemPrompt, message);
    } catch (e) {
      return NextResponse.json({ error: `Could not reach OpenRouter: ${(e as Error).message}` }, { status: 502 });
    }
  }

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `OpenRouter request failed (${res.status}): ${text.slice(0, 500)}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return NextResponse.json({ error: "The model returned no content." }, { status: 502 });
  }

  try {
    const parsed = extractJson(content) as { reply?: string; actions?: unknown[] };
    return NextResponse.json({
      reply: typeof parsed.reply === "string" ? parsed.reply : "",
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    });
  } catch {
    // Model ignored the JSON-only instruction — still surface its text.
    return NextResponse.json({ reply: content, actions: [] });
  }
}
