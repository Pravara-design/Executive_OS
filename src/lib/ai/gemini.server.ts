// Phase 10 · Server-only Gemini client. The GEMINI_API_KEY is read from
// process.env inside helper functions so it never reaches the browser
// bundle. This file is server-only by convention (.server.ts) and is only
// imported from within server function handlers via dynamic import.
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiError extends Error {
  readonly code:
    | "missing_key"
    | "api_error"
    | "rate_limit"
    | "invalid_json"
    | "empty_response";
  readonly raw?: string;
  constructor(code: GeminiError["code"], message: string, raw?: string) {
    super(message);
    this.code = code;
    this.raw = raw;
  }
}

export function getGeminiKey(): string {
  return process.env.GEMINI_API_KEY ?? "";
}

export function isGeminiConfigured(): boolean {
  return getGeminiKey().length > 0;
}

// Free-tier quota is per-model. If the primary model is exhausted (429) or
// temporarily unavailable (404/500/503) we transparently fall back to the next
// model in the chain so the brain keeps answering. flash-lite has the most
// generous free quota, so it leads.
const DEFAULT_MODEL_CHAIN = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

function modelsToTry(requested?: string): string[] {
  if (!requested) return DEFAULT_MODEL_CHAIN;
  return [requested, ...DEFAULT_MODEL_CHAIN.filter((m) => m !== requested)];
}

// Classify an SDK error: which GeminiError code, and whether trying the next
// model in the chain could succeed.
function classifyError(msg: string): { code: GeminiError["code"]; retryable: boolean } {
  if (/429|rate.?limit|quota|resource.?exhausted/i.test(msg)) return { code: "rate_limit", retryable: true };
  if (/\b40[0-9]\b|\b50[0-9]\b|unavailable|overload|not found|timeout|deadline/i.test(msg))
    return { code: "api_error", retryable: true };
  return { code: "api_error", retryable: false };
}

export interface GeminiPromptInput {
  system: string;
  user: string;
  model?: string;
}

export interface GeminiPromptResult {
  parsed: unknown;
  raw: string;
  model: string;
  durationMs: number;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
}

export async function executeGeminiPrompt(
  input: GeminiPromptInput,
): Promise<GeminiPromptResult> {
  const key = getGeminiKey();
  if (!key) throw new GeminiError("missing_key", "GEMINI_API_KEY is not configured on the server.");

  const genAI = new GoogleGenerativeAI(key);
  let lastError: GeminiError | null = null;

  for (const model of modelsToTry(input.model)) {
    const m = genAI.getGenerativeModel({
      model,
      systemInstruction: input.system,
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    });

    const t0 = Date.now();
    let resp;
    try {
      resp = await m.generateContent(input.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const { code, retryable } = classifyError(msg);
      lastError = new GeminiError(code, msg);
      if (retryable) continue; // try the next model in the chain
      throw lastError;
    }
    const durationMs = Date.now() - t0;

    const text = resp.response?.text?.() ?? "";
    if (!text.trim()) {
      lastError = new GeminiError("empty_response", "Gemini returned an empty response.");
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Best-effort fence/object extraction (defense against models that
      // ignore responseMimeType and wrap JSON in prose / fences).
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const candidate = (fenced ? fenced[1] : text).trim();
      const first = candidate.indexOf("{");
      const last = candidate.lastIndexOf("}");
      if (first >= 0 && last > first) {
        try {
          parsed = JSON.parse(candidate.slice(first, last + 1));
        } catch {
          throw new GeminiError("invalid_json", "Gemini returned non-JSON output", text);
        }
      } else {
        throw new GeminiError("invalid_json", "Gemini returned non-JSON output", text);
      }
    }

    const usage = resp.response?.usageMetadata;
    return {
      parsed,
      raw: text,
      model,
      durationMs,
      promptTokens: usage?.promptTokenCount ?? 0,
      responseTokens: usage?.candidatesTokenCount ?? 0,
      totalTokens: usage?.totalTokenCount ?? 0,
    };
  }

  throw lastError ?? new GeminiError("api_error", "All Gemini models failed.");
}

export interface GeminiTextResult {
  text: string;
  model: string;
  durationMs: number;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
}

// Free-text variant. Same client and error handling as executeGeminiPrompt
// but returns the model's natural-language output (e.g. markdown) instead of
// forcing/parsing JSON. Used for conversational sections like the Copilot.
export async function executeGeminiText(
  input: GeminiPromptInput,
): Promise<GeminiTextResult> {
  const key = getGeminiKey();
  if (!key) throw new GeminiError("missing_key", "GEMINI_API_KEY is not configured on the server.");

  const genAI = new GoogleGenerativeAI(key);
  let lastError: GeminiError | null = null;

  for (const model of modelsToTry(input.model)) {
    const m = genAI.getGenerativeModel({
      model,
      systemInstruction: input.system,
      generationConfig: { temperature: 0.5 },
    });

    const t0 = Date.now();
    let resp;
    try {
      resp = await m.generateContent(input.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const { code, retryable } = classifyError(msg);
      lastError = new GeminiError(code, msg);
      if (retryable) continue; // try the next model in the chain
      throw lastError;
    }
    const durationMs = Date.now() - t0;

    const text = resp.response?.text?.() ?? "";
    if (!text.trim()) {
      lastError = new GeminiError("empty_response", "Gemini returned an empty response.");
      continue;
    }

    const usage = resp.response?.usageMetadata;
    return {
      text,
      model,
      durationMs,
      promptTokens: usage?.promptTokenCount ?? 0,
      responseTokens: usage?.candidatesTokenCount ?? 0,
      totalTokens: usage?.totalTokenCount ?? 0,
    };
  }

  throw lastError ?? new GeminiError("api_error", "All Gemini models failed.");
}
