/**
 * Multi-provider text generation with quota-aware retries.
 *
 * Why multi-provider: the free tiers are small and per-model. Letting the
 * user switch models (or providers) is the simplest way to dodge a 429 when
 * one bucket is exhausted. All three providers below are OpenAI-compatible
 * except Gemini, which we call through its native SDK (already a dependency).
 *
 * A model is only offered to the UI when its provider's API key is present:
 *   - Gemini      → GOOGLE_API_KEY (or GEMINI_API_KEY)
 *   - Groq        → GROQ_API_KEY
 *   - OpenRouter  → OPENROUTER_API_KEY
 *
 * Keep the default on a Gemini model so existing deployments behave the same.
 */

import { GoogleGenAI } from "@google/genai";

export type Provider = "gemini" | "groq" | "openrouter";

export interface AIModel {
  id: string;       // stable id we store + pass around
  label: string;    // UI label
  provider: Provider;
  model: string;    // the provider's own model string
  note?: string;    // short hint shown in the picker
}

/**
 * Curated model list. The `id` is what the client stores and sends back;
 * `model` is the provider-specific string sent to the API.
 */
export const AI_MODELS: AIModel[] = [
  // --- Google Gemini (GOOGLE_API_KEY) ---
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
    note: "Balanced · daily driver",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    note: "Widest free quota (~1,000/day)",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "gemini",
    model: "gemini-2.5-pro",
    note: "Deep reasoning · tiny free quota",
  },
  // --- Groq (GROQ_API_KEY) ---
  {
    id: "groq-llama-3.3-70b",
    label: "Groq · Llama 3.3 70B",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    note: "Very fast",
  },
  {
    id: "groq-llama-3.1-8b",
    label: "Groq · Llama 3.1 8B",
    provider: "groq",
    model: "llama-3.1-8b-instant",
    note: "Fast · ~14,400/day",
  },
  {
    id: "groq-gpt-oss-120b",
    label: "Groq · GPT-OSS 120B",
    provider: "groq",
    model: "openai/gpt-oss-120b",
    note: "Strong reasoning",
  },
  {
    id: "groq-gpt-oss-20b",
    label: "Groq · GPT-OSS 20B",
    provider: "groq",
    model: "openai/gpt-oss-20b",
    note: "Ultra-fast · tool calling",
  },
  {
    id: "groq-qwen3-32b",
    label: "Groq · Qwen3 32B",
    provider: "groq",
    model: "qwen/qwen3-32b",
    note: "Reasoning (preview)",
  },
  {
    id: "groq-llama4-scout",
    label: "Groq · Llama 4 Scout",
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    note: "Multilingual (preview)",
  },
  // --- OpenRouter (OPENROUTER_API_KEY) ---
  {
    id: "openrouter-deepseek-v3",
    label: "OpenRouter · DeepSeek V3 (free)",
    provider: "openrouter",
    model: "deepseek/deepseek-chat-v3-0324:free",
    note: "Free tier",
  },
  {
    id: "openrouter-llama-3.3-70b",
    label: "OpenRouter · Llama 3.3 70B (free)",
    provider: "openrouter",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    note: "Free tier",
  },
  {
    id: "openrouter-gpt-oss-120b",
    label: "OpenRouter · GPT-OSS 120B (free)",
    provider: "openrouter",
    model: "openai/gpt-oss-120b:free",
    note: "Strong reasoning · free",
  },
  {
    id: "openrouter-glm-4.5-air",
    label: "OpenRouter · GLM 4.5 Air (free)",
    provider: "openrouter",
    model: "z-ai/glm-4.5-air:free",
    note: "MoE · tool use · free",
  },
  {
    id: "openrouter-qwen3-next-80b",
    label: "OpenRouter · Qwen3 Next 80B (free)",
    provider: "openrouter",
    model: "qwen/qwen3-next-80b-a3b-instruct:free",
    note: "Fast 80B · free",
  },
  {
    id: "openrouter-nemotron-super",
    label: "OpenRouter · Nemotron 3 Super 120B (free)",
    provider: "openrouter",
    model: "nvidia/nemotron-3-super-120b-a12b:free",
    note: "120B · 1M context · free",
  },
  {
    id: "openrouter-gemma-4-31b",
    label: "OpenRouter · Gemma 4 31B (free)",
    provider: "openrouter",
    model: "google/gemma-4-31b-it:free",
    note: "Multimodal · free",
  },
  {
    id: "openrouter-qwen3-coder",
    label: "OpenRouter · Qwen3 Coder (free)",
    provider: "openrouter",
    model: "qwen/qwen3-coder:free",
    note: "Coding agent · free",
  },
  {
    id: "openrouter-auto-free",
    label: "OpenRouter · Auto (free)",
    provider: "openrouter",
    model: "openrouter/free",
    note: "Auto-picks a free model",
  },
];

const DEFAULT_ID = "gemini-2.5-flash";

function providerKey(p: Provider): string | undefined {
  if (p === "gemini") return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (p === "groq") return process.env.GROQ_API_KEY;
  if (p === "openrouter") return process.env.OPENROUTER_API_KEY;
  return undefined;
}

/** Models whose provider has an API key configured. */
export function availableModels(): AIModel[] {
  return AI_MODELS.filter((m) => !!providerKey(m.provider));
}

export function isModelAvailable(id: string): boolean {
  const m = AI_MODELS.find((x) => x.id === id);
  return !!m && !!providerKey(m.provider);
}

/**
 * Resolve a requested model id to a usable model. Falls back to the env
 * default, then the first available model, so the app never hard-fails just
 * because the client sent an unknown / unconfigured id.
 */
export function resolveModel(id?: string | null): AIModel {
  const wanted = id && isModelAvailable(id) ? AI_MODELS.find((m) => m.id === id) : null;
  if (wanted) return wanted;

  const envDefault = process.env.GEMINI_MODEL;
  if (envDefault) {
    const byEnv =
      AI_MODELS.find((m) => m.id === envDefault) ||
      AI_MODELS.find((m) => m.model === envDefault);
    if (byEnv && providerKey(byEnv.provider)) return byEnv;
  }

  const def = AI_MODELS.find((m) => m.id === DEFAULT_ID);
  if (def && providerKey(def.provider)) return def;

  const first = availableModels()[0];
  if (first) return first;

  // Nothing configured — return the default so the error surfaces as a
  // missing-key message rather than an empty list.
  return AI_MODELS.find((m) => m.id === DEFAULT_ID)!;
}

/** Back-compat: the default model id used when the caller doesn't pick one. */
export function getModel(): string {
  return resolveModel().id;
}

// --------------------------- Gemini SDK path ---------------------------

let cachedGemini: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (cachedGemini) return cachedGemini;
  const apiKey = providerKey("gemini");
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set.");
  cachedGemini = new GoogleGenAI({ apiKey });
  return cachedGemini;
}

async function geminiGenerate(model: string, prompt: string, system?: string): Promise<string> {
  const ai = getGeminiClient();
  const cfg = system ? { config: { systemInstruction: system } } : {};
  const resp = await ai.models.generateContent({ model, contents: prompt, ...cfg });
  return (resp.text ?? "").trim();
}

// ----------------------- OpenAI-compatible path ------------------------

const OPENAI_COMPAT_BASE: Record<Exclude<Provider, "gemini">, string> = {
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

async function openAICompatGenerate(
  provider: Exclude<Provider, "gemini">,
  model: string,
  prompt: string,
  system?: string,
): Promise<string> {
  const apiKey = providerKey(provider);
  if (!apiKey) throw new Error(`${provider.toUpperCase()}_API_KEY is not set.`);

  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
  if (provider === "openrouter") {
    // Optional identity headers — surface the app on OpenRouter's rankings.
    headers["HTTP-Referer"] = "https://tonhu.vercel.app";
    headers["X-Title"] = "Personal Tracker";
  }

  const res = await fetch(`${OPENAI_COMPAT_BASE[provider]}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return (json.choices?.[0]?.message?.content ?? "").trim();
}

// ----------------------------- retry shell -----------------------------

function backoffMs(err: unknown, attempt: number): number {
  const msg = err instanceof Error ? err.message : String(err);
  const m = /retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)s/.exec(msg);
  if (m) {
    const seconds = Number(m[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(30_000, Math.ceil(seconds * 1000)) + jitter();
    }
  }
  return Math.min(8_000, 2 ** attempt * 1_000) + jitter();
}

function jitter(): number {
  return Math.floor(Math.random() * 250);
}

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b429\b/.test(msg) ||
    /\b503\b/.test(msg) ||
    /\b502\b/.test(msg) ||
    /RESOURCE_EXHAUSTED/i.test(msg) ||
    /Too Many Requests/i.test(msg)
  );
}

function friendlyError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/_API_KEY is not set/i.test(msg)) {
    return new Error(msg.replace(/\.$/, "") + ". Add it to your environment.");
  }
  if (
    /\b429\b/.test(msg) ||
    /RESOURCE_EXHAUSTED/i.test(msg) ||
    /Too Many Requests/i.test(msg)
  ) {
    return new Error(
      "This model hit its rate limit. Pick a different model from the switcher and try again.",
    );
  }
  return new Error("AI request failed. Try again, or switch models.");
}

/**
 * Generate text with the chosen model (by id). Retries transient quota / 5xx
 * errors up to 3 times with backoff. On a hard rate limit the friendly error
 * nudges the user toward the model switcher.
 */
export async function generateText(
  prompt: string,
  system?: string,
  modelId?: string | null,
): Promise<string> {
  const chosen = resolveModel(modelId);

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (chosen.provider === "gemini") {
        return await geminiGenerate(chosen.model, prompt, system);
      }
      return await openAICompatGenerate(chosen.provider, chosen.model, prompt, system);
    } catch (err) {
      lastErr = err;
      if (attempt === 2 || !isRetryable(err)) break;
      await new Promise((r) => setTimeout(r, backoffMs(err, attempt)));
    }
  }
  throw friendlyError(lastErr);
}
