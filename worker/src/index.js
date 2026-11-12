// QDB website chat assistant: a small Cloudflare Worker that sits between the
// chat widget on quasidb.com and the Claude API, so the API key never reaches
// the browser.
//
// Privacy: the Worker stores nothing. It does not log what visitors write and
// keeps no chat history; the conversation lives only in the visitor's browser
// tab and is sent here with each new question.

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt.js";
import { KNOWLEDGE } from "./knowledge.js";

const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_TURNS = 12; // messages sent to Claude (latest ones kept)
const MAX_USER_CHARS = 800; // per visitor message
const MAX_ASSISTANT_CHARS = 3000; // per earlier assistant reply echoed back
const MAX_CONVERSATION = 40; // messages in one chat before we ask for a fresh start

// Models that accept the server-side refusal fallback ("fallbacks").
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-2"]);

const HANDOVER =
  "You can reach Dave on the QDB Discord (https://discord.gg/2Ccf67favj) or through the contact form (https://quasidb.com/#contact). He reads every message himself.";

const SYSTEM = [
  {
    type: "text",
    text: `${SYSTEM_PROMPT}\n\n${KNOWLEDGE}`,
    // The instructions and site content are identical on every request, so
    // cache them: repeat questions within an hour cost about a tenth as much.
    cache_control: { type: "ephemeral", ttl: "1h" },
  },
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = allowedOrigin(origin, env);
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : "https://quasidb.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    const reply = (status, body) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });

    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method === "GET" && url.pathname === "/status") {
      return reply(200, { online: env.CHAT_ENABLED !== "false" && !!env.ANTHROPIC_API_KEY });
    }
    if (request.method !== "POST" || url.pathname !== "/chat") return reply(404, { error: "Not found" });
    if (!allowed) return reply(403, { error: "This assistant only answers on quasidb.com." });
    if (env.CHAT_ENABLED === "false" || !env.ANTHROPIC_API_KEY) {
      return reply(503, { error: `The assistant is switched off right now. ${HANDOVER}` });
    }

    // Per-visitor rate limit (Cloudflare rate limiting binding, see wrangler.toml).
    if (env.CHAT_LIMITER) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.CHAT_LIMITER.limit({ key: ip });
      if (!success) return reply(429, { error: "That's a lot of questions at once. Please wait a minute and try again." });
    }

    let messages;
    try {
      messages = cleanMessages((await request.json()).messages);
    } catch (err) {
      return reply(400, { error: err instanceof InputError ? err.message : "Sorry, I couldn't read that message." });
    }

    const model = env.MODEL || DEFAULT_MODEL;
    const client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      baseURL: env.ANTHROPIC_BASE_URL || undefined, // only set for local testing
      maxRetries: 1,
      timeout: 45_000,
    });

    const params = {
      model,
      max_tokens: 2000,
      system: SYSTEM,
      messages,
      // Short factual answers: low effort keeps replies fast and cheap.
      output_config: { effort: env.EFFORT || "low" },
    };
    if (FALLBACK_MODELS.has(model)) {
      // If the main model declines a request, the API retries it on a
      // fallback model in the same call instead of returning nothing.
      params.betas = ["server-side-fallback-2026-07-01"];
      params.fallbacks = "default";
    }

    try {
      const response = await client.beta.messages.create(params);
      if (response.stop_reason === "refusal") {
        return reply(200, { reply: `Sorry, I can't help with that one. ${HANDOVER}` });
      }
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();
      if (!text) return reply(200, { reply: `Sorry, I couldn't come up with an answer to that. ${HANDOVER}` });
      return reply(200, { reply: text });
    } catch (err) {
      // Log only the error class and status, never the conversation.
      if (err instanceof Anthropic.RateLimitError) {
        console.error("Claude API rate limited");
        return reply(503, { error: `I'm getting a lot of questions right now. Please try again in a minute, or: ${HANDOVER}` });
      }
      if (err instanceof Anthropic.APIError) {
        console.error(`Claude API error ${err.status ?? "connection"} ${err.name}`);
      } else {
        console.error(`Worker error ${err?.name}`);
      }
      return reply(503, { error: `The assistant is offline for the moment. ${HANDOVER}` });
    }
  },
};

function allowedOrigin(origin, env) {
  const list = (env.ALLOWED_ORIGINS || "https://quasidb.com,https://www.quasidb.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(origin);
}

class InputError extends Error {}

// Accept only a plain alternating user/assistant text conversation that ends
// with the visitor's question, trimmed to a sensible size.
function cleanMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new InputError("Please type a question.");
  if (raw.length > MAX_CONVERSATION) {
    throw new InputError("This chat is getting long. Please start a new chat to keep going.");
  }
  const out = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      throw new InputError("Sorry, I couldn't read that message.");
    }
    const limit = m.role === "user" ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
    const content = m.content.trim().slice(0, limit);
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${content}`;
    else out.push({ role: m.role, content });
  }
  let recent = out.slice(-MAX_TURNS);
  while (recent.length && recent[0].role !== "user") recent = recent.slice(1);
  if (!recent.length || recent[recent.length - 1].role !== "user") {
    throw new InputError("Please type a question.");
  }
  return recent;
}
